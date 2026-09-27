import random
import threading
import time
import uuid
from flask import current_app, request
from flask_socketio import emit, join_room, leave_room

from ..rooms import PlayerSession, RoomStatus, room_manager
from ..rules import RULES
from ..socket import socketio


def _start_match_timeout(room, timeout_sec=None, db_path=None):
    with room.lock:
        if getattr(room, "_match_timeout_started", False):
            return
        room._match_timeout_started = True

    if timeout_sec is None:
        try:
            timeout_sec = float(current_app.config.get("MATCH_TIMEOUT_SEC", 180.0))
        except Exception:
            timeout_sec = 180.0

    if db_path is None:
        try:
            db_path = current_app.config.get("DATABASE")
        except Exception:
            db_path = None

    def _timeout_worker(r=room, db_p=db_path, delay=timeout_sec):
        time.sleep(delay)
        should_finalize = False
        with r.lock:
            if r.status in (RoomStatus.RACING, RoomStatus.ADJUDICATING):
                should_finalize = True
        if should_finalize:
            from .finish import finalize_race
            finalize_race(r, db_path=db_p)

    threading.Thread(target=_timeout_worker, daemon=True).start()


@socketio.on("connect")
def on_connect():
    pass

@socketio.on("disconnect")
def on_disconnect():
    info = room_manager.get_by_sid(request.sid)
    if info:
        room_id, player_id = info
        room = room_manager.get_room(room_id)
        if room:
            with room.lock:
                status = room.status
            if status == RoomStatus.WAITING:
                room.remove_player(player_id)
                room_manager.unregister_sid(request.sid)
                if not room.players:
                    room_manager.delete_room(room_id)
                else:
                    emit("room:state", room.to_dict(), to=room.room_id)
            else:
                player = room.get_player(player_id)
                if player and player.sid == request.sid:
                    player.connected = False
                    player.disconnected_at = time.time()
                    disc_ts = player.disconnected_at
                    emit(
                        "player:status_changed",
                        {"player_id": player_id, "status": "offline"},
                        to=room.room_id,
                    )

                    try:
                        grace_sec = float(current_app.config.get("DISCONNECT_GRACE_SEC", 10.0))
                    except Exception:
                        grace_sec = 10.0

                    try:
                        db_path = current_app.config.get("DATABASE")
                    except Exception:
                        db_path = None

                    def _grace_period_timer(r=room, pid=player_id, expected_ts=disc_ts, db_p=db_path, delay=grace_sec):
                        time.sleep(delay)
                        should_finalize = False
                        with r.lock:
                            p = r.players.get(pid)
                            if p and not p.connected and p.disconnected_at == expected_ts and p.outcome is None:
                                p.outcome = "dnf"
                                p.elapsed_ms = int(time.time() * 1000) - r.start_timestamp_ms
                                all_done = all(pl.outcome is not None for pl in r.players.values())
                                if all_done and r.status in (RoomStatus.RACING, RoomStatus.ADJUDICATING):
                                    should_finalize = True
                        if should_finalize:
                            from .finish import finalize_race
                            finalize_race(r, db_path=db_p)

                    threading.Thread(target=_grace_period_timer, daemon=True).start()

                room_manager.unregister_sid(request.sid)


@socketio.on("room:leave")
def on_room_leave():
    info = room_manager.get_by_sid(request.sid)
    if not info:
        return
    room_id, player_id = info
    room = room_manager.get_room(room_id)
    if not room:
        room_manager.unregister_sid(request.sid)
        return

    with room.lock:
        is_waiting = (room.status == RoomStatus.WAITING)

    if is_waiting:
        room.remove_player(player_id)
        room_manager.unregister_sid(request.sid)
        leave_room(room.room_id)
        if not room.players:
            room_manager.delete_room(room.room_id)
        else:
            emit("room:state", room.to_dict(), to=room.room_id)
        emit("room:left", {"success": True})
    else:
        emit("room:left", {"success": False, "message": "Không thể rời phòng khi trận đấu đã bắt đầu."})


@socketio.on("room:join")
def on_room_join(data):
    if not isinstance(data, dict):
        emit("error", {"code": "invalid_payload", "message": "Dữ liệu không hợp lệ."})
        return

    room_identifier = data.get("room_id") or data.get("room_code")
    if not room_identifier:
        emit("error", {"code": "invalid_payload", "message": "Thiếu mã phòng."})
        return

    room = room_manager.find_room(room_identifier)
    if not room:
        emit("error", {"code": "room_not_found", "message": "Không tìm thấy phòng đua."})
        return

    raw_player_id = data.get("player_id", "")
    try:
        player_id = str(uuid.UUID(str(raw_player_id).strip()))
    except (ValueError, TypeError, AttributeError):
        emit(
            "error",
            {
                "code": "invalid_payload",
                "message": "Mã người chơi phải là UUID hợp lệ.",
                "details": {"player_id": "Mã người chơi phải là UUID hợp lệ."},
            },
        )
        return

    skin_id = str(data.get("skin_id", "doodle")).strip()
    valid_skins = {skin["id"] for skin in RULES["skins"]} | {"nam", "quang", "son", "viet"}
    if skin_id not in valid_skins:
        emit(
            "error",
            {
                "code": "invalid_payload",
                "message": "Nhân vật không tồn tại.",
                "details": {"skin_id": "Nhân vật không tồn tại."},
            },
        )
        return

    player = room.get_player(player_id)
    if player is None:
        if room.status != RoomStatus.WAITING:
            emit("error", {"code": "room_already_started", "message": "Phòng đã bắt đầu hoặc đã kết thúc."})
            return
        if room.is_full():
            emit("error", {"code": "room_full", "message": "Phòng đã đầy (tối đa 4 người chơi)."})
            return
        player = PlayerSession(
            player_id=player_id,
            nickname=str(data.get("nickname", "Player")).strip()[:24] or "Player",
            skin_id=skin_id,
            is_ready=False,
            is_host=False,
        )
        if not room.add_player(player):
            emit("error", {"code": "room_full", "message": "Không thể tham gia phòng đua."})
            return

    was_offline = not player.connected
    player.sid = request.sid
    player.connected = True
    player.disconnected_at = None
    room_manager.register_sid(request.sid, room.room_id, player.player_id)
    join_room(room.room_id)

    if was_offline:
        emit(
            "player:status_changed",
            {"player_id": player.player_id, "status": "online"},
            to=room.room_id,
        )

    emit("room:state", room.to_dict(), to=room.room_id)


@socketio.on("room:ready")
def on_room_ready(data=None):
    info = room_manager.get_by_sid(request.sid)
    if not info:
        emit("error", {"code": "not_in_room", "message": "Chưa tham gia phòng đua."})
        return

    room_id, player_id = info
    room = room_manager.get_room(room_id)
    if not room:
        return

    player = room.get_player(player_id)
    if not player:
        return

    is_ready = True
    if isinstance(data, dict) and "is_ready" in data:
        is_ready = bool(data["is_ready"])

    start_payload = None
    try:
        countdown_ms = int(current_app.config.get("COUNTDOWN_MS", 3000))
    except Exception:
        countdown_ms = 3000
    try:
        timeout_sec = float(current_app.config.get("MATCH_TIMEOUT_SEC", 180.0))
    except Exception:
        timeout_sec = 180.0
    try:
        db_path = current_app.config.get("DATABASE")
    except Exception:
        db_path = None

    with room.lock:
        player.is_ready = is_ready
        if (
            room.status == RoomStatus.WAITING
            and len(room.players) >= 2
            and all(p.is_ready for p in room.players.values())
        ):
            room.status = RoomStatus.COUNTDOWN
            room.seed = random.randint(1, 2**31 - 1)
            start_timestamp_ms = int(time.time() * 1000) + countdown_ms
            room.start_timestamp_ms = start_timestamp_ms
            room.countdown_ms = countdown_ms
            start_payload = {
                "seed": room.seed,
                "finish_height": room.finish_height,
                "start_timestamp_ms": start_timestamp_ms,
                "countdown_ms": countdown_ms,
                "rules_version": room.rules_version,
            }

    emit("room:state", room.to_dict(), to=room.room_id)

    if start_payload:
        emit("race:start", start_payload, to=room.room_id)

        def _transition_racing():
            time.sleep(countdown_ms / 1000.0)
            with room.lock:
                if room.status == RoomStatus.COUNTDOWN:
                    room.status = RoomStatus.RACING
            _start_match_timeout(room, timeout_sec=timeout_sec, db_path=db_path)

        threading.Thread(target=_transition_racing, daemon=True).start()


@socketio.on("player:tick")
def on_player_tick(data):
    if not isinstance(data, dict):
        return

    info = room_manager.get_by_sid(request.sid)
    if not info:
        return

    room_id, player_id = info
    room = room_manager.get_room(room_id)
    if not room:
        return

    now_ms = int(time.time() * 1000)
    if room.status == RoomStatus.COUNTDOWN and now_ms >= room.start_timestamp_ms:
        with room.lock:
            if room.status == RoomStatus.COUNTDOWN:
                room.status = RoomStatus.RACING
        _start_match_timeout(room)

    if room.status != RoomStatus.RACING:
        return

    player = room.get_player(player_id)
    if not player:
        return

    try:
        y = float(data.get("y", 0.0))
        vy = float(data.get("vy", 0.0))
        x = float(data.get("x", 0.0))
    except (ValueError, TypeError):
        return

    now = time.time()
    if now < player.stunned_until:
        # While stunned, client cannot move upward
        if y > player.y:
            y = player.y
        vy = min(vy, 0.0)

    player.y = y
    player.vy = vy
    player.x = x
    player.last_tick_ts = now
    player.max_y = max(player.max_y, y)

    if 1000 <= y < 2000 and 1000 not in player.checkpoints:
        player.checkpoints.add(1000)
    elif y >= 2000 and 1000 in player.checkpoints and 2000 not in player.checkpoints:
        player.checkpoints.add(2000)
    emit(
        "race:ghost_sync",
        {
            "player_id": player.player_id,
            "seq": data.get("seq", 0),
            "y": y,
            "vy": vy,
            "x": x,
            "facing": data.get("facing", "right"),
            "state": data.get("state", "jumping"),
            "client_ts": data.get("client_ts", now_ms),
        },
        to=room.room_id,
        include_self=False,
    )
