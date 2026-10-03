import time
import uuid
import pytest
from backend.app import create_app
from backend.db import init_db, get_db
from backend.rooms import RoomStatus, room_manager
from backend.socket import socketio


@pytest.fixture
def e2e_env(tmp_path):
    room_manager.clear()
    db_path = str(tmp_path / "test_e2e.db")
    app = create_app({"TESTING": True, "DATABASE": db_path})
    with app.app_context():
        init_db(db_path)
    return app, db_path

def test_complete_4_player_online_race_lifecycle(e2e_env):
    app, db_path = e2e_env
    app.config["DISCONNECT_GRACE_SEC"] = 0.1
    app.config["ADJUDICATION_SEC"] = 0.2
    rest_client = app.test_client()
    p1_id = str(uuid.uuid4())
    p2_id = str(uuid.uuid4())
    p3_id = str(uuid.uuid4())
    p4_id = str(uuid.uuid4())

    # Step 1: Host creates room via REST
    create_res = rest_client.post("/api/rooms", json={
        "host_player_id": p1_id,
        "nickname": "Racer1_Host",
        "skin_id": "doodle",
    })
    assert create_res.status_code == 201
    room_data = create_res.get_json()
    room_id = room_data["room_id"]
    room_code = room_data["room_code"]

    # Step 2: Clients 2, 3, 4 discover room via GET /api/rooms/<room_code>
    discover_res = rest_client.get(f"/api/rooms/{room_code}")
    assert discover_res.status_code == 200
    assert discover_res.get_json()["status"] == "WAITING"

    # Step 3: Clients 1-4 connect via Socket.IO
    c1 = socketio.test_client(app)
    c2 = socketio.test_client(app)
    c3 = socketio.test_client(app)
    c4 = socketio.test_client(app)

    c1.emit("room:join", {"room_id": room_id, "player_id": p1_id})
    c2.emit("room:join", {"room_id": room_id, "player_id": p2_id, "nickname": "Racer2", "skin_id": "red"})
    c3.emit("room:join", {"room_id": room_id, "player_id": p3_id, "nickname": "Racer3", "skin_id": "purple"})
    c4.emit("room:join", {"room_id": room_id, "player_id": p4_id, "nickname": "Racer4", "skin_id": "blue"})

    room = room_manager.get_room(room_id)
    assert len(room.players) == 4

    # Flush join events
    c1.get_received()
    c2.get_received()
    c3.get_received()
    c4.get_received()

    # Step 4: All 4 clients mark ready
    c1.emit("room:ready", {"is_ready": True})
    c2.emit("room:ready", {"is_ready": True})
    c3.emit("room:ready", {"is_ready": True})
    c4.emit("room:ready", {"is_ready": True})

    # Step 5: Verify race:start received by all clients with shared map seed
    events1 = c1.get_received()
    start_ev = next((e for e in events1 if e["name"] == "race:start"), None)
    assert start_ev is not None
    seed = start_ev["args"][0]["seed"]
    assert seed > 0
    assert start_ev["args"][0]["rules_version"] == "v2"

    events2 = c2.get_received()
    assert any(e["name"] == "race:start" and e["args"][0]["seed"] == seed for e in events2)

    # Transition room into RACING
    room.status = RoomStatus.RACING

    # Step 6: Clients stream player:tick packets and reach checkpoints
    for c, pid, y_val in [
        (c1, p1_id, 1130.0),
        (c2, p2_id, 1100.0),
        (c3, p3_id, 1050.0),
        (c4, p4_id, 800.0),
    ]:
        c.emit("player:tick", {"seq": 10, "y": y_val, "vy": 350.0, "x": 160.0})

    player1 = room.get_player(p1_id)
    player2 = room.get_player(p2_id)
    player3 = room.get_player(p3_id)
    player4 = room.get_player(p4_id)

    assert 1000 in player1.checkpoints
    assert 1000 in player2.checkpoints
    assert 1000 in player3.checkpoints

    # Step 7: Client 2 picks up a skill box and uses stun bullet against closest opponent (Client 1)
    player2.active_skill = "stun_bullet"
    player2.last_skill_ts = 0.0
    c1.get_received()
    c2.get_received()

    c2.emit("skill:use", {})
    ev1 = c1.get_received()
    stun_ev = next((e for e in ev1 if e["name"] == "skill:effect_applied"), None)
    assert stun_ev is not None
    assert stun_ev["args"][0]["skill_type"] == "stun_bullet"
    assert stun_ev["args"][0]["target_id"] == p1_id

    # Step 8: Client 1 advances past CP2 and finishes first
    player1.checkpoints.add(2000)
    c1.emit("race:claim_finish", {"elapsed_ms": 12000, "final_height": 3000})

    assert player1.placement == 1
    assert room.status == RoomStatus.ADJUDICATING

    # Step 9: Client 3 advances past CP2 and finishes second
    player3.checkpoints.add(2000)
    c3.emit("race:claim_finish", {"elapsed_ms": 14500, "final_height": 3000})

    assert player3.placement == 2

    # Step 10: Client 4 and Client 2 disconnect; server-side timers naturally finalize the match
    c4.disconnect()
    c2.disconnect()
    time.sleep(0.3)
    assert room.status == RoomStatus.FINISHED

    # Step 11: Verify race:finished broadcast
    events3 = c3.get_received()
    finish_ev = next((e for e in events3 if e["name"] == "race:finished"), None)
    assert finish_ev is not None
    standings = finish_ev["args"][0]["standings"]
    assert standings[0]["player_id"] == p1_id
    assert standings[0]["placement"] == 1
    assert standings[1]["player_id"] == p3_id
    assert standings[1]["placement"] == 2
    assert standings[2]["player_id"] == p2_id
    assert standings[2]["placement"] == 3
    assert standings[2]["outcome"] == "dnf"
    assert standings[3]["player_id"] == p4_id
    assert standings[3]["placement"] == 4
    assert standings[3]["outcome"] == "dnf"

    # Step 12: Verify database records and API Leaderboard
    with app.app_context():
        db = get_db()
        room_row = db.execute("SELECT * FROM race_rooms WHERE room_id = ?", (room_id,)).fetchone()
        assert room_row["winner_player_id"] == p1_id
        assert room_row["player_count"] == 4

        # v2 leaderboard query
        lb_res = rest_client.get("/api/leaderboard?rules_version=v2")
        assert lb_res.status_code == 200
        items = lb_res.get_json()["items"]
        assert len(items) >= 2
        assert items[0]["nickname"] == "Racer1_Host"
        assert items[0]["placement"] == 1
        assert items[1]["nickname"] == "Racer3"
        assert items[1]["placement"] == 2

        # v1 leaderboard query (isolated, should have 0 items)
        lb_v1_res = rest_client.get("/api/leaderboard?rules_version=v1")
        assert lb_v1_res.status_code == 200
        assert len(lb_v1_res.get_json()["items"]) == 0

        # Player 1 run history
        p1_res = rest_client.get(f"/api/runs?player_id={p1_id}")
        assert p1_res.status_code == 200
        assert len(p1_res.get_json()["items"]) == 1

        # Verify peak altitude (max_y) saved for DNF players
        r2_run = db.execute("SELECT * FROM runs WHERE player_id = ?", (p2_id,)).fetchone()
        r4_run = db.execute("SELECT * FROM runs WHERE player_id = ?", (p4_id,)).fetchone()
        assert r2_run is not None
        assert r2_run["height"] == 1100
        assert r2_run["placement"] == 3
        assert r4_run is not None
        assert r4_run["height"] == 800
        assert r4_run["placement"] == 4
        assert p1_res.get_json()["items"][0]["outcome"] == "finished"

    if c1.is_connected():
        c1.disconnect()
    if c3.is_connected():
        c3.disconnect()
