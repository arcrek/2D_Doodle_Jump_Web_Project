from datetime import datetime, timezone
import sqlite3
import threading
import time
import uuid
from flask import current_app, request
from flask_socketio import emit

from ..rooms import RoomStatus, room_manager
from ..socket import socketio


def _persist_race_results(room, winner_id, standings, db_path):
    if not db_path:
        return

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    created_at = datetime.now(timezone.utc).isoformat(timespec="microseconds")
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO race_rooms (
                room_id, room_code, rules_version, seed, player_count, winner_player_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                room.room_id,
                room.room_code,
                room.rules_version,
                room.seed,
                len(room.players),
                winner_id,
                created_at,
            ),
        )

        for p in room.players.values():
            conn.execute(
                """
                INSERT OR REPLACE INTO race_room_members (
                    room_id, player_id, placement, elapsed_ms, outcome
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (
                    room.room_id,
                    p.player_id,
                    p.placement or 4,
                    p.elapsed_ms or 0,
                    p.outcome or "dnf",
                ),
            )
            # Insert into runs table for leaderboard & player history
            conn.execute(
                """
                INSERT INTO runs (
                    run_id, player_id, nickname, skin_id, rules_version,
                    height, elapsed_ms, outcome, placement, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    p.player_id,
                    p.nickname,
                    p.skin_id,
                    room.rules_version,
                    int(p.y if p.outcome == "finished" else p.max_y),
                    max(1, p.elapsed_ms or 0),
                    p.outcome or "dnf",
                    p.placement or 4,
                    created_at,
                ),
            )
        conn.commit()
    finally:
        conn.close()


def finalize_race(room, db_path=None):
    with room.lock:
        if room.status == RoomStatus.FINISHED:
            return
        room.status = RoomStatus.FINISHED

        # Unfinished players become DNF and receive placements sorted by peak height
        dnf_players = []
        for p in room.players.values():
            if p.placement is None:
                if p.outcome is None:
                    p.outcome = "dnf"
                    p.elapsed_ms = int(time.time() * 1000) - room.start_timestamp_ms
                dnf_players.append(p)

        # Sort DNF players by height descending
        dnf_players.sort(key=lambda p: p.max_y, reverse=True)
        current_placement = len(room.finish_order) + 1
        for p in dnf_players:
            p.placement = current_placement
            current_placement += 1

        all_players = sorted(room.players.values(), key=lambda p: p.placement or 99)
        standings = [
            {
                "placement": p.placement,
                "player_id": p.player_id,
                "nickname": p.nickname,
                "skin_id": p.skin_id,
                "elapsed_ms": p.elapsed_ms,
                "outcome": p.outcome,
            }
            for p in all_players
        ]
        winner_id = room.finish_order[0] if room.finish_order else None

    socketio.emit(
        "race:finished",
        {
            "room_id": room.room_id,
            "rules_version": room.rules_version,
            "standings": standings,
        },
        to=room.room_id,
    )

    try:
        _persist_race_results(room, winner_id, standings, db_path)
    except Exception as e:
        import logging
        logging.error("Failed to persist race results: %s", e)

    try:
        eviction_sec = float(current_app.config.get("ROOM_EVICTION_SEC", 300.0))
    except Exception:
        eviction_sec = 300.0

    def _delayed_eviction(rid=room.room_id, delay=eviction_sec):
        time.sleep(delay)
        room_manager.delete_room(rid)

    threading.Thread(target=_delayed_eviction, daemon=True).start()

@socketio.on("race:claim_finish")
def on_race_claim_finish(data):
    if not isinstance(data, dict):
        return

    info = room_manager.get_by_sid(request.sid)
    if not info:
        return

    room_id, player_id = info
    room = room_manager.get_room(room_id)
    if not room or room.status not in (RoomStatus.RACING, RoomStatus.ADJUDICATING):
        emit("error", {"code": "invalid_race_state", "message": "Ván đấu chưa bắt đầu hoặc đã kết thúc."})
        return

    player = room.get_player(player_id)
    if not player or player.outcome is not None:
        return

    try:
        elapsed_ms = int(data.get("elapsed_ms", 0))
        final_height = float(data.get("final_height", 0))
    except (ValueError, TypeError):
        emit("error", {"code": "invalid_payload", "message": "Thông số về đích không hợp lệ."})
        return

    # Anti-cheat: Tmin check (7500ms)
    if elapsed_ms < 7500:
        emit("error", {"code": "speed_anomaly", "message": "Thời gian về đích bất thường."})
        return

    # Anti-cheat: checkpoints check (must have visited CP1 >= 1000 and CP2 >= 2000)
    has_cp1 = 1000 in player.checkpoints
    has_cp2 = 2000 in player.checkpoints
    if not (has_cp1 and has_cp2):
        emit("error", {"code": "invalid_trajectory", "message": "Bỏ qua trạm kiểm soát."})
        return

    # Final height check
    if final_height < room.finish_height or final_height > room.finish_height + 500:
        emit("error", {"code": "anticheat_height_violation", "message": "Độ cao đích không hợp lệ."})
        return
    try:
        db_path = current_app.config.get("DATABASE")
    except RuntimeError:
        db_path = None

    first_finish = False
    with room.lock:
        if player.outcome is not None:
            return
        player.outcome = "finished"
        player.elapsed_ms = elapsed_ms
        player.y = float(final_height)
        player.max_y = max(player.max_y, float(final_height))
        room.finish_order.append(player.player_id)
        player.placement = len(room.finish_order)
        if len(room.finish_order) == 1:
            first_finish = True
            room.status = RoomStatus.ADJUDICATING

    emit(
        "race:player_finished",
        {
            "player_id": player.player_id,
            "placement": player.placement,
            "elapsed_ms": player.elapsed_ms,
        },
        to=room.room_id,
    )

    all_done = all(p.outcome is not None for p in room.players.values())
    if all_done:
        finalize_race(room, db_path)
    elif first_finish:
        try:
            adjudication_sec = float(current_app.config.get("ADJUDICATION_SEC", 15.0))
        except Exception:
            adjudication_sec = 15.0

        def _adjudication_timer(delay=adjudication_sec):
            time.sleep(delay)
            if room.status != RoomStatus.FINISHED:
                finalize_race(room, db_path)

        threading.Thread(target=_adjudication_timer, daemon=True).start()
