import time
import uuid
import pytest
from backend.app import create_app
from backend.db import init_db, get_db
from backend.rooms import RoomStatus, room_manager
from backend.socket import socketio


@pytest.fixture
def test_setup(tmp_path):
    room_manager.clear()
    db_path = str(tmp_path / "test_anticheat.db")
    app = create_app({"TESTING": True, "DATABASE": db_path})
    with app.app_context():
        init_db(db_path)
    return app, db_path


def test_skill_box_pickup_and_proximity(test_setup):
    app, _ = test_setup
    host_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room.status = RoomStatus.RACING
    host_player = room.get_player(host_id)
    host_player.y = 500.0

    client = socketio.test_client(app)
    client.emit("room:join", {"room_id": room.room_id, "player_id": host_id})
    client.get_received()

    # Pickup box too far away (y = 800) -> ignored
    client.emit("skill:box_pickup", {"box_id": 1, "y": 800.0})
    events = client.get_received()
    assert not any(e["name"] == "skill:acquired" for e in events)
    assert host_player.active_skill is None

    # Pickup box in range (y = 510) -> success
    client.emit("skill:box_pickup", {"box_id": 2, "y": 510.0})
    events = client.get_received()
    pickup_ev = next((e for e in events if e["name"] == "skill:acquired"), None)
    assert pickup_ev is not None
    assert pickup_ev["args"][0]["skill_type"] in ["boost", "stun_bullet", "teleport"]
    assert host_player.active_skill in ["boost", "stun_bullet", "teleport"]

    client.disconnect()


def test_skill_use_cooldown_and_no_skill_errors(test_setup):
    app, _ = test_setup
    host_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room.status = RoomStatus.RACING
    host_player = room.get_player(host_id)

    client = socketio.test_client(app)
    client.emit("room:join", {"room_id": room.room_id, "player_id": host_id})
    client.get_received()

    # Use without active skill -> error no_active_skill
    client.emit("skill:use", {})
    events = client.get_received()
    err_ev = next((e for e in events if e["name"] == "error"), None)
    assert err_ev is not None
    assert err_ev["args"][0]["code"] == "no_active_skill"

    # Give skill and use
    host_player.active_skill = "boost"
    host_player.last_skill_ts = 0.0
    client.emit("skill:use", {})
    events = client.get_received()
    assert any(e["name"] == "skill:effect_applied" for e in events)

    # Immediately give another skill and use -> cooldown active
    host_player.active_skill = "boost"
    client.emit("skill:use", {})
    events = client.get_received()
    cooldown_ev = next((e for e in events if e["name"] == "error"), None)
    assert cooldown_ev is not None
    assert cooldown_ev["args"][0]["code"] == "skill_cooldown_active"

    client.disconnect()


def test_teleport_bounds_and_finish_line_restriction(test_setup):
    app, _ = test_setup
    host_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room.status = RoomStatus.RACING
    host_player = room.get_player(host_id)

    client = socketio.test_client(app)
    client.emit("room:join", {"room_id": room.room_id, "player_id": host_id})
    client.get_received()

    # Try teleport exceeding delta 350
    host_player.y = 1000.0
    host_player.active_skill = "teleport"
    host_player.last_skill_ts = 0.0
    client.emit("skill:use", {"target_y": 1400.0})  # delta 400 > 350
    events = client.get_received()
    err_ev = next((e for e in events if e["name"] == "error"), None)
    assert err_ev is not None
    assert err_ev["args"][0]["code"] == "teleport_bounds_exceeded"

    # Try negative teleport
    client.emit("skill:use", {"target_y": 900.0})  # delta < 0
    events = client.get_received()
    err_ev = next((e for e in events if e["name"] == "error"), None)
    assert err_ev is not None
    assert err_ev["args"][0]["code"] == "teleport_bounds_exceeded"

    # Teleport clamping when target_y > 2900 (TC-SEC-05)
    host_player.y = 2800.0
    host_player.active_skill = "teleport"
    host_player.last_skill_ts = 0.0
    client.emit("skill:use", {"target_y": 2950.0})  # delta 150 <= 350, target > 2900 -> clamped to 2900
    events = client.get_received()
    effect_ev = next((e for e in events if e["name"] == "skill:effect_applied"), None)
    assert effect_ev is not None
    assert host_player.y == 2900.0
    assert effect_ev["args"][0]["new_y"] == 2900.0

    # Valid teleport within bounds
    host_player.y = 2500.0
    host_player.active_skill = "teleport"
    host_player.last_skill_ts = 0.0
    client.emit("skill:use", {"target_y": 2800.0})  # delta 300 <= 350 and <= 2900
    events = client.get_received()
    effect_ev = next((e for e in events if e["name"] == "skill:effect_applied"), None)
    assert effect_ev is not None
    assert host_player.y == 2800.0
    assert host_player.max_y >= 2800.0
    client.disconnect()


def test_stun_bullet_targets_closest_opponent(test_setup):
    app, _ = test_setup
    host_id = str(uuid.uuid4())
    p2_id = str(uuid.uuid4())
    p3_id = str(uuid.uuid4())

    room = room_manager.create_room(host_id, "Host", "doodle")

    c1 = socketio.test_client(app)
    c2 = socketio.test_client(app)
    c3 = socketio.test_client(app)

    c1.emit("room:join", {"room_id": room.room_id, "player_id": host_id})
    c2.emit("room:join", {"room_id": room.room_id, "player_id": p2_id, "nickname": "P2", "skin_id": "red"})
    c3.emit("room:join", {"room_id": room.room_id, "player_id": p3_id, "nickname": "P3", "skin_id": "blue"})
    room.status = RoomStatus.RACING

    p1 = room.get_player(host_id)
    p2 = room.get_player(p2_id)
    p3 = room.get_player(p3_id)

    p1.y = 1000.0
    p2.y = 1200.0  # dist 200 (closest)
    p3.y = 1700.0  # dist 700

    p1.active_skill = "stun_bullet"
    p1.last_skill_ts = 0.0

    c1.get_received()
    c2.get_received()
    c3.get_received()

    c1.emit("skill:use", {})

    events2 = c2.get_received()
    stun_ev = next((e for e in events2 if e["name"] == "skill:effect_applied"), None)
    assert stun_ev is not None
    assert stun_ev["args"][0]["skill_type"] == "stun_bullet"
    assert stun_ev["args"][0]["target_id"] == p2_id

    c1.disconnect()
    c2.disconnect()
    c3.disconnect()


def test_finish_claim_anticheat_validation(test_setup):
    app, db_path = test_setup
    host_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room.status = RoomStatus.RACING
    player = room.get_player(host_id)

    client = socketio.test_client(app)
    client.emit("room:join", {"room_id": room.room_id, "player_id": host_id})
    client.get_received()

    # Attempt 1: Speedhack violation (elapsed_ms < 7500)
    client.emit("race:claim_finish", {"elapsed_ms": 5000, "final_height": 3000})
    events = client.get_received()
    err_ev = next((e for e in events if e["name"] == "error"), None)
    assert err_ev is not None
    assert err_ev["args"][0]["code"] == "speed_anomaly"

    # Attempt 2: Missing checkpoints
    client.emit("race:claim_finish", {"elapsed_ms": 12000, "final_height": 3000})
    events = client.get_received()
    err_ev = next((e for e in events if e["name"] == "error"), None)
    assert err_ev is not None
    assert err_ev["args"][0]["code"] == "invalid_trajectory"

    # Add checkpoints
    player.checkpoints.add(1000)
    player.checkpoints.add(2000)

    # Attempt 3: Height below finish
    client.emit("race:claim_finish", {"elapsed_ms": 12000, "final_height": 2900})
    events = client.get_received()
    err_ev = next((e for e in events if e["name"] == "error"), None)
    assert err_ev is not None
    assert err_ev["args"][0]["code"] == "anticheat_height_violation"

    # Attempt 4: Valid finish
    client.emit("race:claim_finish", {"elapsed_ms": 12000, "final_height": 3000})
    events = client.get_received()
    finish_ev = next((e for e in events if e["name"] == "race:player_finished"), None)
    assert finish_ev is not None
    assert finish_ev["args"][0]["placement"] == 1
    assert finish_ev["args"][0]["elapsed_ms"] == 12000

    client.disconnect()


def test_race_adjudication_and_database_persistence(test_setup):
    app, db_path = test_setup
    host_id = str(uuid.uuid4())
    guest_id = str(uuid.uuid4())

    room = room_manager.create_room(host_id, "WinnerGuy", "doodle")
    room_id = room.room_id

    c1 = socketio.test_client(app)
    c2 = socketio.test_client(app)

    c1.emit("room:join", {"room_id": room_id, "player_id": host_id})
    c2.emit("room:join", {"room_id": room_id, "player_id": guest_id, "nickname": "RunnerUp", "skin_id": "red"})

    room.status = RoomStatus.RACING
    p1 = room.get_player(host_id)
    p2 = room.get_player(guest_id)

    p1.checkpoints = {1000, 2000}
    p2.checkpoints = {1000, 2000}

    c1.get_received()
    c2.get_received()

    # P1 claims finish (1st)
    c1.emit("race:claim_finish", {"elapsed_ms": 11000, "final_height": 3000})
    assert p1.placement == 1
    assert room.status == RoomStatus.ADJUDICATING

    # P2 claims finish (2nd) -> All players finished
    c2.emit("race:claim_finish", {"elapsed_ms": 13500, "final_height": 3000})
    assert p2.placement == 2
    assert room.status == RoomStatus.FINISHED

    # Check race:finished event
    events1 = c1.get_received()
    finish_ev = next((e for e in events1 if e["name"] == "race:finished"), None)
    assert finish_ev is not None
    standings = finish_ev["args"][0]["standings"]
    assert len(standings) == 2
    assert standings[0]["player_id"] == host_id
    assert standings[0]["placement"] == 1
    assert standings[1]["player_id"] == guest_id
    assert standings[1]["placement"] == 2

    # Verify SQLite persistence
    with app.app_context():
        db = get_db()
        room_row = db.execute("SELECT * FROM race_rooms WHERE room_id = ?", (room_id,)).fetchone()
        assert room_row is not None
        assert room_row["winner_player_id"] == host_id
        assert room_row["player_count"] == 2

        member_rows = db.execute("SELECT * FROM race_room_members WHERE room_id = ?", (room_id,)).fetchall()
        assert len(member_rows) == 2

        # Verify leaderboard endpoint shows the winner
        rest_client = app.test_client()
        lb_resp = rest_client.get("/api/leaderboard?rules_version=v2")
        assert lb_resp.status_code == 200
        lb_items = lb_resp.get_json()["items"]
        assert len(lb_items) == 2
        assert lb_items[0]["nickname"] == "WinnerGuy"
        assert lb_items[0]["elapsed_ms"] == 11000

    c1.disconnect()
    c2.disconnect()


def test_checkpoint_sequential_enforcement(test_setup):
    app, db_path = test_setup
    host_id = str(uuid.uuid4())
    room = room_manager.create_room(host_id, "Host", "doodle")
    room.status = RoomStatus.RACING
    player = room.get_player(host_id)

    client = socketio.test_client(app)
    client.emit("room:join", {"room_id": room.room_id, "player_id": host_id})
    client.get_received()

    # Cheater tries warping directly from y=500 to y=2500 in one tick packet
    client.emit("player:tick", {"y": 500.0, "vy": 0.0, "x": 0.0})
    client.emit("player:tick", {"y": 2500.0, "vy": 0.0, "x": 0.0})

    assert 1000 not in player.checkpoints
    assert 2000 not in player.checkpoints

    # Claim finish must fail with invalid_trajectory
    client.emit("race:claim_finish", {"elapsed_ms": 12000, "final_height": 3000})
    events = client.get_received()
    err_ev = next((e for e in events if e["name"] == "error"), None)
    assert err_ev is not None
    assert err_ev["args"][0]["code"] == "invalid_trajectory"

    # Legitimate sequential traversal: visit CP1 then CP2
    client.emit("player:tick", {"y": 1200.0, "vy": 10.0, "x": 0.0})
    assert 1000 in player.checkpoints
    client.emit("player:tick", {"y": 2200.0, "vy": 10.0, "x": 0.0})
    assert 2000 in player.checkpoints

    # Now claim finish succeeds
    client.emit("race:claim_finish", {"elapsed_ms": 12000, "final_height": 3000})
    events = client.get_received()
    finish_ev = next((e for e in events if e["name"] == "race:player_finished"), None)
    assert finish_ev is not None
    assert finish_ev["args"][0]["placement"] == 1

    client.disconnect()


def test_max_y_tracking_and_dnf_ranking(test_setup):
    from backend.events.finish import finalize_race

    app, db_path = test_setup
    p1_id = str(uuid.uuid4())
    p2_id = str(uuid.uuid4())
    room = room_manager.create_room(p1_id, "Player1", "doodle")
    p1 = room.get_player(p1_id)

    client1 = socketio.test_client(app)
    client2 = socketio.test_client(app)
    client1.emit("room:join", {"room_id": room.room_id, "player_id": p1_id})
    client2.emit("room:join", {"room_id": room.room_id, "player_id": p2_id, "nickname": "Player2", "skin_id": "red"})
    p2 = room.get_player(p2_id)
    room.status = RoomStatus.RACING

    # Player 1 reached 1800, then fell down to 200
    client1.emit("player:tick", {"y": 1800.0, "vy": 0.0, "x": 0.0})
    client1.emit("player:tick", {"y": 200.0, "vy": -20.0, "x": 0.0})
    assert p1.y == 200.0
    assert p1.max_y == 1800.0

    # Player 2 reached 1200, then fell down to 600
    client2.emit("player:tick", {"y": 1200.0, "vy": 0.0, "x": 0.0})
    client2.emit("player:tick", {"y": 600.0, "vy": -10.0, "x": 0.0})
    assert p2.y == 600.0
    assert p2.max_y == 1200.0

    # Finalize race where both are DNF
    finalize_race(room, db_path)

    # Player 1 should be ranked 1 because max_y (1800) > max_y (1200)
    assert p1.placement == 1
    assert p2.placement == 2

    # Verify heights stored in SQLite runs table are peak max_y
    with app.app_context():
        db = get_db()
        row1 = db.execute("SELECT height FROM runs WHERE player_id = ?", (p1_id,)).fetchone()
        row2 = db.execute("SELECT height FROM runs WHERE player_id = ?", (p2_id,)).fetchone()
        assert row1 is not None and row1["height"] == 1800
        assert row2 is not None and row2["height"] == 1200

    client1.disconnect()
    client2.disconnect()


def test_mystery_box_deduplication(test_setup):
    app, _ = test_setup
    p1_id = str(uuid.uuid4())
    p2_id = str(uuid.uuid4())
    room = room_manager.create_room(p1_id, "Player1", "doodle")

    c1 = socketio.test_client(app)
    c2 = socketio.test_client(app)
    c1.emit("room:join", {"room_id": room.room_id, "player_id": p1_id})
    c2.emit("room:join", {"room_id": room.room_id, "player_id": p2_id, "nickname": "Player2", "skin_id": "red"})
    room.status = RoomStatus.RACING
    p1 = room.get_player(p1_id)
    p2 = room.get_player(p2_id)
    p1.y = 500.0
    p2.y = 500.0
    c1.get_received()
    c2.get_received()

    # Player 1 claims box "mb-100"
    c1.emit("skill:box_pickup", {"box_id": "mb-100", "y": 510.0})
    events1 = c1.get_received()
    pickup_ev = next((e for e in events1 if e["name"] == "skill:acquired"), None)
    assert pickup_ev is not None
    assert pickup_ev["args"][0]["box_id"] == "mb-100"
    assert "mb-100" in room.claimed_boxes

    # Player 2 tries claiming same box "mb-100"
    c2.emit("skill:box_pickup", {"box_id": "mb-100", "y": 510.0})
    events2 = c2.get_received()
    err_ev = next((e for e in events2 if e["name"] == "error"), None)
    assert err_ev is not None
    assert err_ev["args"][0]["code"] == "box_already_claimed"
    assert p2.active_skill is None

    # Player 1 tries claiming same box "mb-100" again
    c1.emit("skill:box_pickup", {"box_id": "mb-100", "y": 510.0})
    events1 = c1.get_received()
    err_ev1 = next((e for e in events1 if e["name"] == "error"), None)
    assert err_ev1 is not None
    assert err_ev1["args"][0]["code"] == "box_already_claimed"

    c1.disconnect()
    c2.disconnect()


def test_stun_bullet_enforces_server_side_stun_and_throttling(test_setup):
    app, _ = test_setup
    p1_id = str(uuid.uuid4())
    p2_id = str(uuid.uuid4())
    room = room_manager.create_room(p1_id, "Shooter", "doodle")

    c1 = socketio.test_client(app)
    c2 = socketio.test_client(app)
    c1.emit("room:join", {"room_id": room.room_id, "player_id": p1_id})
    c2.emit("room:join", {"room_id": room.room_id, "player_id": p2_id, "nickname": "Target", "skin_id": "red"})
    room.status = RoomStatus.RACING
    p1 = room.get_player(p1_id)
    p2 = room.get_player(p2_id)
    p1.y = 800.0
    p2.y = 900.0
    c1.get_received()
    c2.get_received()

    # p1 shoots stun_bullet at p2
    p1.active_skill = "stun_bullet"
    p1.last_skill_ts = 0.0
    c1.emit("skill:use", {})
    events1 = c1.get_received()
    assert any(e["name"] == "skill:effect_applied" and e["args"][0]["target_id"] == p2_id for e in events1)

    # Verify target.stunned_until is set ~1.5s in the future
    assert p2.stunned_until > time.time()
    assert p2.stunned_until <= time.time() + 1.6

    # While stunned, p2 sends tick attempting to jump to y=1200 with vy=15
    c2.emit("player:tick", {"y": 1200.0, "vy": 15.0, "x": 0.0})
    c1.get_received()

    # p2's upward movement should be clamped to previous y (900.0) and vy <= 0
    assert p2.y == 900.0
    assert p2.vy == 0.0

    # Downward movement is still permitted during stun (e.g. falling)
    c2.emit("player:tick", {"y": 850.0, "vy": -10.0, "x": 0.0})
    assert p2.y == 850.0
    assert p2.vy == -10.0

    c1.disconnect()
    c2.disconnect()
