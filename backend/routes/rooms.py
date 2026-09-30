import uuid
from flask import Blueprint, jsonify, request

from ..errors import APIError
from ..rooms import PlayerSession, RoomStatus, room_manager
from ..rules import RULES

rooms_api = Blueprint("rooms", __name__)


def _validate_player_fields(data, player_id_key="player_id"):
    if not isinstance(data, dict):
        raise APIError("invalid_payload", "Cần gửi một đối tượng JSON.", status_code=422)

    errors = {}
    player_id = data.get(player_id_key)
    try:
        clean_player_id = str(uuid.UUID(str(player_id).strip()))
    except (ValueError, TypeError, AttributeError):
        errors[player_id_key] = "Phải là UUID hợp lệ."
        clean_player_id = None

    nickname = data.get("nickname")
    if not isinstance(nickname, str) or not 1 <= len(nickname.strip()) <= 24:
        errors["nickname"] = "Tên cần từ 1 đến 24 ký tự."
        clean_nickname = None
    else:
        clean_nickname = nickname.strip()

    skin_id = data.get("skin_id")
    valid_skins = {skin["id"] for skin in RULES["skins"]} | {"nam", "quang", "son", "viet"}
    if not isinstance(skin_id, str) or skin_id not in valid_skins:
        errors["skin_id"] = "Nhân vật không tồn tại."
        clean_skin_id = None
    else:
        clean_skin_id = skin_id

    if errors:
        raise APIError("invalid_payload", "Dữ liệu chưa hợp lệ.", errors, 422)

    return clean_player_id, clean_nickname, clean_skin_id


@rooms_api.post("/api/rooms")
def create_room():
    data = request.get_json(silent=False) if request.is_json else None
    host_player_id, nickname, skin_id = _validate_player_fields(data, player_id_key="host_player_id")

    room = room_manager.create_room(host_player_id, nickname, skin_id)
    return jsonify({
        "room_id": room.room_id,
        "room_code": room.room_code,
        "max_players": room.max_players,
        "rules_version": room.rules_version,
    }), 201


@rooms_api.get("/api/rooms/<identifier>")
def get_room(identifier):
    room = room_manager.find_room(identifier)
    if room is None:
        raise APIError("room_not_found", "Không tìm thấy phòng đua.", status_code=404)

    return jsonify(room.to_dict()), 200


@rooms_api.post("/api/rooms/<identifier>/join")
def join_room(identifier):
    room = room_manager.find_room(identifier)
    if room is None:
        raise APIError("room_not_found", "Không tìm thấy phòng đua.", status_code=404)

    if room.status != RoomStatus.WAITING:
        raise APIError("room_already_started", "Phòng đã bắt đầu hoặc đã kết thúc.", status_code=409)

    data = request.get_json(silent=False) if request.is_json else None
    player_id, nickname, skin_id = _validate_player_fields(data, player_id_key="player_id")

    existing_player = room.get_player(player_id)
    if existing_player is not None:
        return jsonify({
            "room_id": room.room_id,
            "room_code": room.room_code,
            "rules_version": room.rules_version,
        }), 200

    if room.is_full():
        raise APIError("room_full", "Phòng đã đầy (tối đa 4 người chơi).", status_code=409)

    session = PlayerSession(
        player_id=player_id,
        nickname=nickname,
        skin_id=skin_id,
        is_ready=False,
        is_host=False,
    )
    if not room.add_player(session):
        raise APIError("room_full", "Phòng đã đầy (tối đa 4 người chơi).", status_code=409)

    return jsonify({
        "room_id": room.room_id,
        "room_code": room.room_code,
        "rules_version": room.rules_version,
    }), 200
