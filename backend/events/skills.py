import random
import time
from flask import request
from flask_socketio import emit

from ..rooms import RoomStatus, room_manager
from ..socket import socketio


@socketio.on("skill:box_pickup")
def on_skill_box_pickup(data):
    if not isinstance(data, dict):
        return

    info = room_manager.get_by_sid(request.sid)
    if not info:
        return

    room_id, player_id = info
    room = room_manager.get_room(room_id)
    if not room or room.status not in (RoomStatus.RACING, RoomStatus.ADJUDICATING):
        return

    player = room.get_player(player_id)
    if not player:
        return

    if "y" not in data:
        return
    try:
        box_y = float(data["y"])
    except (ValueError, TypeError):
        return

    # Height proximity check (within 60px tolerance)
    if abs(player.y - box_y) > 60:
        return
    box_id = str(data.get("box_id", "")).strip()
    if not box_id:
        return

    with room.lock:
        if box_id in room.claimed_boxes:
            emit("error", {"code": "box_already_claimed", "message": "Hộp quà đã được nhặt."})
            return
        room.claimed_boxes.add(box_id)
        # Pseudo-random selection from allowed pool
        skill_type = random.choice(["boost", "stun_bullet", "teleport"])
        player.active_skill = skill_type
    emit("skill:acquired", {
        "box_id": box_id,
        "skill_type": skill_type,
    })

@socketio.on("skill:use")
def on_skill_use(data=None):
    if data is None:
        data = {}

    info = room_manager.get_by_sid(request.sid)
    if not info:
        return

    room_id, player_id = info
    room = room_manager.get_room(room_id)
    if not room or room.status not in (RoomStatus.RACING, RoomStatus.ADJUDICATING):
        return

    player = room.get_player(player_id)
    if not player or player.outcome is not None:
        return

    now = time.time()
    if now < player.stunned_until:
        emit("error", {"code": "player_stunned", "message": "Bạn đang bị choáng, không thể dùng kỹ năng."})
        return

    with room.lock:
        if not player.active_skill:
            emit("error", {"code": "no_active_skill", "message": "Bạn không có kỹ năng sẵn sàng."})
            return

        # Check 8-second cooldown
        if (now - player.last_skill_ts) < 8.0:
            emit("error", {"code": "skill_cooldown_active", "message": "Kỹ năng đang trong thời gian hồi chiêu."})
            return

        skill_type = player.active_skill

        if skill_type == "teleport":
            try:
                target_y = float(data.get("target_y", player.y + 300.0))
            except (ValueError, TypeError):
                target_y = player.y + 300.0

            delta_y = target_y - player.y
            # Teleport bounds: must be forward/upward, max +350px
            if delta_y < 0 or delta_y > 350.0:
                emit("error", {"code": "teleport_bounds_exceeded", "message": "Khoảng cách dịch chuyển không hợp lệ."})
                return

            # Per TC-SEC-05: auto-clamp target height to 2900px
            if target_y > 2900.0:
                target_y = 2900.0

            player.active_skill = None
            player.last_skill_ts = now
            player.y = target_y
            player.max_y = max(player.max_y, target_y)
            payload = {
                "activator_id": player.player_id,
                "skill_type": "teleport",
                "target_id": player.player_id,
                "new_y": player.y,
            }

        elif skill_type == "stun_bullet":
            target = None
            min_dist = float("inf")
            for p in room.players.values():
                if p.player_id != player.player_id and p.outcome is None:
                    dist = abs(p.y - player.y)
                    if dist <= 800.0 and dist < min_dist:
                        min_dist = dist
                        target = p

            if target:
                target.stunned_until = now + 1.5
            target_id = target.player_id if target else None
            player.active_skill = None
            player.last_skill_ts = now
            payload = {
                "activator_id": player.player_id,
                "skill_type": "stun_bullet",
                "target_id": target_id,
                "effect": "stunned",
                "duration_ms": 1500,
            }

        elif skill_type == "boost":
            player.active_skill = None
            player.last_skill_ts = now
            payload = {
                "activator_id": player.player_id,
                "skill_type": "boost",
                "target_id": player.player_id,
                "effect": "boosted",
                "duration_ms": 2500,
            }
        else:
            return

    emit("skill:effect_applied", payload, to=room.room_id)
