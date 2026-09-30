import uuid
import pytest
from backend.app import create_app
from backend.rooms import RoomStatus, room_manager


@pytest.fixture
def client(tmp_path):
    room_manager.clear()
    db_path = str(tmp_path / "test_rooms.db")
    app = create_app({"TESTING": True, "DATABASE": db_path})
    return app.test_client()


def test_create_room_success(client):
    host_id = str(uuid.uuid4())
    resp = client.post("/api/rooms", json={
        "host_player_id": host_id,
        "nickname": "HostPlayer",
        "skin_id": "doodle",
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert "room_id" in data
    assert "room_code" in data
    assert len(data["room_code"]) == 6
    assert data["max_players"] == 4
    assert data["rules_version"] == "v2"


def test_create_room_invalid_payload(client):
    # Missing host_player_id
    resp = client.post("/api/rooms", json={
        "nickname": "HostPlayer",
        "skin_id": "doodle",
    })
    assert resp.status_code == 422
    assert "host_player_id" in resp.get_json()["error"]["details"]

    # Invalid skin_id
    resp = client.post("/api/rooms", json={
        "host_player_id": str(uuid.uuid4()),
        "nickname": "HostPlayer",
        "skin_id": "nonexistent_skin",
    })
    assert resp.status_code == 422
    assert "skin_id" in resp.get_json()["error"]["details"]

    retired = client.post("/api/rooms", json={
        "host_player_id": str(uuid.uuid4()),
        "nickname": "HostPlayer",
        "skin_id": "nam",
    })
    assert retired.status_code == 422
    assert "skin_id" in retired.get_json()["error"]["details"]


def test_get_room_by_code_and_id(client):
    host_id = str(uuid.uuid4())
    create_resp = client.post("/api/rooms", json={
        "host_player_id": host_id,
        "nickname": "HostPlayer",
        "skin_id": "doodle",
    })
    room_code = create_resp.get_json()["room_code"]
    room_id = create_resp.get_json()["room_id"]

    # Lookup by code
    resp_code = client.get(f"/api/rooms/{room_code}")
    assert resp_code.status_code == 200
    data_code = resp_code.get_json()
    assert data_code["room_id"] == room_id
    assert data_code["status"] == "WAITING"
    assert data_code["player_count"] == 1
    assert data_code["players"][0]["player_id"] == host_id
    assert data_code["players"][0]["is_host"] is True

    # Lookup by id
    resp_id = client.get(f"/api/rooms/{room_id}")
    assert resp_id.status_code == 200
    assert resp_id.get_json()["room_code"] == room_code

    # Non-existent room
    resp_none = client.get("/api/rooms/NONEX1")
    assert resp_none.status_code == 404
    assert resp_none.get_json()["error"]["code"] == "room_not_found"


def test_join_room_lifecycle_and_capacity_limits(client):
    host_id = str(uuid.uuid4())
    create_resp = client.post("/api/rooms", json={
        "host_player_id": host_id,
        "nickname": "HostPlayer",
        "skin_id": "doodle",
    })
    room_code = create_resp.get_json()["room_code"]

    # Player 2 joins
    p2_id = str(uuid.uuid4())
    join2 = client.post(f"/api/rooms/{room_code}/join", json={
        "player_id": p2_id,
        "nickname": "Player2",
        "skin_id": "red",
    })
    assert join2.status_code == 200

    retired = client.post(f"/api/rooms/{room_code}/join", json={
        "player_id": str(uuid.uuid4()),
        "nickname": "LegacyPlayer",
        "skin_id": "nam",
    })
    assert retired.status_code == 422
    assert "skin_id" in retired.get_json()["error"]["details"]

    # Player 2 re-joins idempotently
    join2_re = client.post(f"/api/rooms/{room_code}/join", json={
        "player_id": p2_id,
        "nickname": "Player2",
        "skin_id": "red",
    })
    assert join2_re.status_code == 200

    # Player 3 joins
    p3_id = str(uuid.uuid4())
    client.post(f"/api/rooms/{room_code}/join", json={
        "player_id": p3_id,
        "nickname": "Player3",
        "skin_id": "purple",
    })

    # Player 4 joins
    p4_id = str(uuid.uuid4())
    client.post(f"/api/rooms/{room_code}/join", json={
        "player_id": p4_id,
        "nickname": "Player4",
        "skin_id": "blue",
    })

    # Verify count is 4
    info = client.get(f"/api/rooms/{room_code}").get_json()
    assert info["player_count"] == 4

    # Player 5 tries to join (full room)
    p5_id = str(uuid.uuid4())
    join5 = client.post(f"/api/rooms/{room_code}/join", json={
        "player_id": p5_id,
        "nickname": "Player5",
        "skin_id": "gray",
    })
    assert join5.status_code == 409
    assert join5.get_json()["error"]["code"] == "room_full"


def test_join_started_room_rejected(client):
    host_id = str(uuid.uuid4())
    create_resp = client.post("/api/rooms", json={
        "host_player_id": host_id,
        "nickname": "HostPlayer",
        "skin_id": "doodle",
    })
    room_code = create_resp.get_json()["room_code"]
    room = room_manager.get_room_by_code(room_code)
    room.status = RoomStatus.RACING

    join_resp = client.post(f"/api/rooms/{room_code}/join", json={
        "player_id": str(uuid.uuid4()),
        "nickname": "LatePlayer",
        "skin_id": "red",
    })
    assert join_resp.status_code == 409
    assert join_resp.get_json()["error"]["code"] == "room_already_started"


def test_delete_room_frees_code(client):
    host_id = str(uuid.uuid4())
    create_resp = client.post("/api/rooms", json={
        "host_player_id": host_id,
        "nickname": "HostPlayer",
        "skin_id": "doodle",
    })
    data = create_resp.get_json()
    room_id = data["room_id"]
    room_code = data["room_code"]

    assert room_manager.get_room(room_id) is not None
    assert room_manager.get_room_by_code(room_code) is not None

    # Delete room
    deleted = room_manager.delete_room(room_id)
    assert deleted is True

    assert room_manager.get_room(room_id) is None
    assert room_manager.get_room_by_code(room_code) is None

    # API lookup returns 404
    resp = client.get(f"/api/rooms/{room_code}")
    assert resp.status_code == 404
