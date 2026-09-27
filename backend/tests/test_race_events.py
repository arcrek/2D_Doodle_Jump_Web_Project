import time
import uuid
import pytest
from backend.app import create_app
from backend.db import init_db
from backend.rooms import RoomStatus, room_manager
from backend.socket import socketio


@pytest.fixture
def app(tmp_path):
    room_manager.clear()
    db_path = str(tmp_path / "test_events.db")
    app = create_app({"TESTING": True, "DATABASE": db_path})
    with app.app_context():
        init_db(db_path)
    return app


def test_room_join_and_state_broadcast(app):
    room = room_manager.create_room(str(uuid.uuid4()), "HostPlayer", "doodle")
    room_id = room.room_id

    client1 = socketio.test_client(app)
    client2 = socketio.test_client(app)

    host_player_id = list(room.players.keys())[0]

    # Host connects & joins socket room
    client1.emit("room:join", {
        "room_id": room_id,
        "player_id": host_player_id,
    })
    events1 = client1.get_received()
    assert any(e["name"] == "room:state" for e in events1)

    # Guest joins
    guest_id = str(uuid.uuid4())
    client2.emit("room:join", {
        "room_id": room_id,
        "player_id": guest_id,
        "nickname": "GuestPlayer",
        "skin_id": "red",
    })

    # Both clients receive updated room:state with 2 players
    events1 = client1.get_received()
    assert any(e["name"] == "room:state" and len(e["args"][0]["players"]) == 2 for e in events1)

    events2 = client2.get_received()
    assert any(e["name"] == "room:state" and len(e["args"][0]["players"]) == 2 for e in events2)

    client1.disconnect()
    client2.disconnect()


def test_ready_flow_and_race_start_countdown(app):
    host_id = str(uuid.uuid4())
    guest_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room_id = room.room_id

    client1 = socketio.test_client(app)
    client2 = socketio.test_client(app)

    client1.emit("room:join", {"room_id": room_id, "player_id": host_id})
    client2.emit("room:join", {"room_id": room_id, "player_id": guest_id, "nickname": "Guest", "skin_id": "red"})

    client1.get_received()
    client2.get_received()

    # Host marks ready
    client1.emit("room:ready", {"is_ready": True})
    assert room.status == RoomStatus.WAITING

    # Guest marks ready -> triggers start countdown
    client2.emit("room:ready", {"is_ready": True})
    assert room.status == RoomStatus.COUNTDOWN

    events1 = client1.get_received()
    start_ev1 = next((e for e in events1 if e["name"] == "race:start"), None)
    assert start_ev1 is not None
    assert "seed" in start_ev1["args"][0]
    assert start_ev1["args"][0]["countdown_ms"] == 3000
    assert start_ev1["args"][0]["finish_height"] == 3000

    events2 = client2.get_received()
    start_ev2 = next((e for e in events2 if e["name"] == "race:start"), None)
    assert start_ev2 is not None
    assert start_ev2["args"][0]["seed"] == start_ev1["args"][0]["seed"]

    client1.disconnect()
    client2.disconnect()


def test_player_tick_and_ghost_sync(app):
    host_id = str(uuid.uuid4())
    guest_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room_id = room.room_id

    client1 = socketio.test_client(app)
    client2 = socketio.test_client(app)

    client1.emit("room:join", {"room_id": room_id, "player_id": host_id})
    client2.emit("room:join", {"room_id": room_id, "player_id": guest_id, "nickname": "Guest", "skin_id": "red"})

    # Mark room directly into RACING status for testing ticks
    room.status = RoomStatus.RACING
    client1.get_received()
    client2.get_received()

    # Host sends tick
    client1.emit("player:tick", {
        "seq": 1,
        "y": 120.0,
        "vy": 300.0,
        "x": 200.0,
        "facing": "right",
        "state": "jumping",
    })

    # Host should NOT receive own ghost_sync
    events1 = client1.get_received()
    assert not any(e["name"] == "race:ghost_sync" for e in events1)

    # Guest should receive host's ghost_sync
    events2 = client2.get_received()
    ghost_ev = next((e for e in events2 if e["name"] == "race:ghost_sync"), None)
    assert ghost_ev is not None
    assert ghost_ev["args"][0]["player_id"] == host_id
    assert ghost_ev["args"][0]["y"] == 120.0

    client1.disconnect()
    client2.disconnect()


def test_player_disconnect_in_lobby_removes_player(app):
    host_id = str(uuid.uuid4())
    guest_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room_id = room.room_id

    client1 = socketio.test_client(app)
    client2 = socketio.test_client(app)

    client1.emit("room:join", {"room_id": room_id, "player_id": host_id})
    client2.emit("room:join", {"room_id": room_id, "player_id": guest_id, "nickname": "Guest", "skin_id": "red"})

    client1.get_received()
    client2.get_received()

    # Guest disconnects in WAITING lobby
    client2.disconnect()

    # Host receives updated room:state with 1 player
    events1 = client1.get_received()
    state_ev = next((e for e in reversed(events1) if e["name"] == "room:state"), None)
    assert state_ev is not None
    assert len(state_ev["args"][0]["players"]) == 1
    assert guest_id not in room.players

    client1.disconnect()


def test_player_disconnect_during_racing_marks_offline(app):
    host_id = str(uuid.uuid4())
    guest_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room_id = room.room_id

    client1 = socketio.test_client(app)
    client2 = socketio.test_client(app)

    client1.emit("room:join", {"room_id": room_id, "player_id": host_id})
    client2.emit("room:join", {"room_id": room_id, "player_id": guest_id, "nickname": "Guest", "skin_id": "red"})

    # Move room to RACING
    room.status = RoomStatus.RACING
    client1.get_received()
    client2.get_received()

    # Guest disconnects during race
    client2.disconnect()

    # Host receives player:status_changed offline
    events1 = client1.get_received()
    status_ev = next((e for e in events1 if e["name"] == "player:status_changed"), None)
    assert status_ev is not None
    assert status_ev["args"][0]["player_id"] == guest_id
    assert status_ev["args"][0]["status"] == "offline"

    client1.disconnect()


def test_lobby_disconnect_host_reassignment(app):
    host_id = str(uuid.uuid4())
    guest_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room_id = room.room_id

    client1 = socketio.test_client(app)
    client2 = socketio.test_client(app)

    client1.emit("room:join", {"room_id": room_id, "player_id": host_id})
    client2.emit("room:join", {"room_id": room_id, "player_id": guest_id, "nickname": "Guest", "skin_id": "red"})

    client1.get_received()
    client2.get_received()

    # Host disconnects
    client1.disconnect()

    # Guest receives updated room:state where guest is now host
    events2 = client2.get_received()
    state_ev = next((e for e in reversed(events2) if e["name"] == "room:state"), None)
    assert state_ev is not None
    players = state_ev["args"][0]["players"]
    assert len(players) == 1
    assert players[0]["player_id"] == guest_id
    assert players[0]["is_host"] is True
    assert room.players[guest_id].is_host is True

    client2.disconnect()


def test_lobby_leave_event(app):
    host_id = str(uuid.uuid4())
    guest_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room_id = room.room_id

    client1 = socketio.test_client(app)
    client2 = socketio.test_client(app)

    client1.emit("room:join", {"room_id": room_id, "player_id": host_id})
    client2.emit("room:join", {"room_id": room_id, "player_id": guest_id, "nickname": "Guest", "skin_id": "red"})

    client1.get_received()
    client2.get_received()

    # Guest leaves voluntarily
    client2.emit("room:leave")

    events2 = client2.get_received()
    leave_ev = next((e for e in events2 if e["name"] == "room:left"), None)
    assert leave_ev is not None
    assert leave_ev["args"][0]["success"] is True

    # Host receives updated room:state with 1 player
    events1 = client1.get_received()
    state_ev = next((e for e in reversed(events1) if e["name"] == "room:state"), None)
    assert state_ev is not None
    assert len(state_ev["args"][0]["players"]) == 1
    assert guest_id not in room.players

    client1.disconnect()
    client2.disconnect()


def test_input_validation_on_room_join(app):
    room = room_manager.create_room(str(uuid.uuid4()), "Host", "doodle")
    room_id = room.room_id

    client = socketio.test_client(app)

    # Invalid player_id (not a UUID)
    client.emit("room:join", {"room_id": room_id, "player_id": "not-a-valid-uuid"})
    events = client.get_received()
    err_ev = next((e for e in events if e["name"] == "error"), None)
    assert err_ev is not None
    assert err_ev["args"][0]["code"] == "invalid_payload"
    assert "player_id" in err_ev["args"][0]["details"]

    # Valid UUID but invalid skin_id
    client.emit("room:join", {"room_id": room_id, "player_id": str(uuid.uuid4()), "skin_id": "invalid_skin_xyz"})
    events = client.get_received()
    err_ev = next((e for e in events if e["name"] == "error"), None)
    assert err_ev is not None
    assert err_ev["args"][0]["code"] == "invalid_payload"
    assert "skin_id" in err_ev["args"][0]["details"]

    client.disconnect()


def test_simultaneous_ready_single_race_start(app):
    import threading

    host_id = str(uuid.uuid4())
    guest_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room_id = room.room_id

    client1 = socketio.test_client(app)
    client2 = socketio.test_client(app)

    client1.emit("room:join", {"room_id": room_id, "player_id": host_id})
    client2.emit("room:join", {"room_id": room_id, "player_id": guest_id, "nickname": "Guest", "skin_id": "red"})

    client1.get_received()
    client2.get_received()

    # Trigger ready simultaneously from 2 threads
    barrier = threading.Barrier(2)
    def ready_client(c):
        barrier.wait()
        c.emit("room:ready", {"is_ready": True})

    t1 = threading.Thread(target=ready_client, args=(client1,))
    t2 = threading.Thread(target=ready_client, args=(client2,))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    events1 = client1.get_received()
    events2 = client2.get_received()

    start_evs1 = [e for e in events1 if e["name"] == "race:start"]
    start_evs2 = [e for e in events2 if e["name"] == "race:start"]

    assert len(start_evs1) == 1
    assert len(start_evs2) == 1
    assert start_evs1[0]["args"][0]["seed"] == start_evs2[0]["args"][0]["seed"]

    client1.disconnect()
    client2.disconnect()


def test_in_race_disconnect_grace_period_and_auto_dnf(app):
    app.config["DISCONNECT_GRACE_SEC"] = 0.1
    host_id = str(uuid.uuid4())
    guest_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room_id = room.room_id

    client1 = socketio.test_client(app)
    client2 = socketio.test_client(app)
    client1.emit("room:join", {"room_id": room_id, "player_id": host_id})
    client2.emit("room:join", {"room_id": room_id, "player_id": guest_id, "nickname": "Guest", "skin_id": "red"})
    room.status = RoomStatus.RACING
    room.start_timestamp_ms = int(time.time() * 1000)

    # Guest disconnects during racing
    client2.disconnect()
    guest_player = room.get_player(guest_id)
    assert guest_player.connected is False
    assert guest_player.outcome is None

    # Wait for grace period (0.1s + buffer)
    time.sleep(0.2)
    assert guest_player.outcome == "dnf"

    # Host also disconnects -> all players done -> room auto-finalizes
    client1.disconnect()
    time.sleep(0.2)
    assert room.status == RoomStatus.FINISHED


def test_reconnect_during_grace_period_cancels_dnf(app):
    app.config["DISCONNECT_GRACE_SEC"] = 0.3
    host_id = str(uuid.uuid4())
    guest_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room_id = room.room_id

    client1 = socketio.test_client(app)
    client2 = socketio.test_client(app)
    client1.emit("room:join", {"room_id": room_id, "player_id": host_id})
    client2.emit("room:join", {"room_id": room_id, "player_id": guest_id, "nickname": "Guest", "skin_id": "red"})
    room.status = RoomStatus.RACING
    room.start_timestamp_ms = int(time.time() * 1000)
    client1.get_received()

    # Guest disconnects
    client2.disconnect()
    guest_player = room.get_player(guest_id)
    assert guest_player.connected is False

    # Host receives offline
    events1 = client1.get_received()
    assert any(e["name"] == "player:status_changed" and e["args"][0]["status"] == "offline" for e in events1)

    # Guest reconnects after 0.05s (before 0.3s grace expires)
    time.sleep(0.05)
    client2_reconnect = socketio.test_client(app)
    client2_reconnect.emit("room:join", {"room_id": room_id, "player_id": guest_id, "nickname": "Guest", "skin_id": "red"})

    # Host receives online
    events1 = client1.get_received()
    assert any(e["name"] == "player:status_changed" and e["args"][0]["status"] == "online" for e in events1)
    assert guest_player.connected is True

    # Wait past the original grace period deadline
    time.sleep(0.35)
    assert guest_player.outcome is None  # NOT marked DNF!

    client1.disconnect()
    client2_reconnect.disconnect()


def test_match_timeout_auto_finalizes(app):
    app.config["COUNTDOWN_MS"] = 50
    app.config["MATCH_TIMEOUT_SEC"] = 0.15
    host_id = str(uuid.uuid4())
    guest_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room_id = room.room_id

    client1 = socketio.test_client(app)
    client2 = socketio.test_client(app)
    client1.emit("room:join", {"room_id": room_id, "player_id": host_id})
    client2.emit("room:join", {"room_id": room_id, "player_id": guest_id, "nickname": "Guest", "skin_id": "red"})
    client1.emit("room:ready", {"is_ready": True})
    client2.emit("room:ready", {"is_ready": True})

    # Room transitions to COUNTDOWN then RACING
    assert room.status in (RoomStatus.COUNTDOWN, RoomStatus.WAITING)
    time.sleep(0.1)  # countdown is 50ms
    assert room.status == RoomStatus.RACING
    # Wait for match timeout (0.15s)
    time.sleep(0.25)
    assert room.status == RoomStatus.FINISHED

    client1.disconnect()
    client2.disconnect()
