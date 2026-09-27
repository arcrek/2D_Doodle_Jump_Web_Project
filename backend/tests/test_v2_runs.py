import uuid
import pytest
from backend.app import create_app
from backend.db import get_db, init_db


@pytest.fixture
def client(tmp_path):
    db_path = str(tmp_path / "test_v2.db")
    app = create_app({"TESTING": True, "DATABASE": db_path})
    with app.app_context():
        init_db(db_path)
    return app.test_client()


def test_schema_creates_race_rooms_and_members_tables(client):
    app = client.application
    with app.app_context():
        db = get_db()
        cursor = db.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row["name"] for row in cursor.fetchall()}
        assert "race_rooms" in tables
        assert "race_room_members" in tables
        assert "runs" in tables


def test_valid_v2_run_creation(client):
    run_id = str(uuid.uuid4())
    player_id = str(uuid.uuid4())
    payload = {
        "run_id": run_id,
        "player_id": player_id,
        "nickname": "RacerOne",
        "skin_id": "doodle",
        "rules_version": "v2",
        "height": 3000,
        "elapsed_ms": 12500,
        "outcome": "finished",
        "placement": 2,
    }
    resp = client.post("/api/runs", json=payload)
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["run_id"] == run_id
    assert data["rules_version"] == "v2"
    assert data["placement"] == 2


def test_v2_run_rejects_placement_above_4(client):
    payload = {
        "run_id": str(uuid.uuid4()),
        "player_id": str(uuid.uuid4()),
        "nickname": "RacerTwo",
        "skin_id": "doodle",
        "rules_version": "v2",
        "height": 3000,
        "elapsed_ms": 12500,
        "outcome": "finished",
        "placement": 5,
    }
    resp = client.post("/api/runs", json=payload)
    assert resp.status_code == 422
    assert "placement" in resp.get_json()["error"]["details"]


def test_v2_run_rejects_finish_under_min_duration(client):
    payload = {
        "run_id": str(uuid.uuid4()),
        "player_id": str(uuid.uuid4()),
        "nickname": "SpeedCheater",
        "skin_id": "doodle",
        "rules_version": "v2",
        "height": 3000,
        "elapsed_ms": 7499,
        "outcome": "finished",
        "placement": 1,
    }
    resp = client.post("/api/runs", json=payload)
    assert resp.status_code == 422
    assert "elapsed_ms" in resp.get_json()["error"]["details"]


def test_v2_dnf_allows_short_duration(client):
    run_id = str(uuid.uuid4())
    payload = {
        "run_id": run_id,
        "player_id": str(uuid.uuid4()),
        "nickname": "EarlyFaller",
        "skin_id": "doodle",
        "rules_version": "v2",
        "height": 500,
        "elapsed_ms": 3000,
        "outcome": "dnf",
        "placement": 4,
    }
    resp = client.post("/api/runs", json=payload)
    assert resp.status_code == 201


def test_leaderboard_isolation_between_v1_and_v2(client):
    player1 = str(uuid.uuid4())
    player2 = str(uuid.uuid4())

    # Add v1 run
    client.post("/api/runs", json={
        "run_id": str(uuid.uuid4()),
        "player_id": player1,
        "nickname": "V1Player",
        "skin_id": "doodle",
        "rules_version": "v1",
        "height": 3000,
        "elapsed_ms": 15000,
        "outcome": "finished",
        "placement": 1,
    })

    # Add v2 run
    client.post("/api/runs", json={
        "run_id": str(uuid.uuid4()),
        "player_id": player2,
        "nickname": "V2Player",
        "skin_id": "doodle",
        "rules_version": "v2",
        "height": 3000,
        "elapsed_ms": 11000,
        "outcome": "finished",
        "placement": 1,
    })

    # Query v1 leaderboard
    resp_v1 = client.get("/api/leaderboard?rules_version=v1")
    assert resp_v1.status_code == 200
    items_v1 = resp_v1.get_json()["items"]
    assert len(items_v1) == 1
    assert items_v1[0]["nickname"] == "V1Player"

    # Query v2 leaderboard
    resp_v2 = client.get("/api/leaderboard?rules_version=v2")
    assert resp_v2.status_code == 200
    items_v2 = resp_v2.get_json()["items"]
    assert len(items_v2) == 1
    assert items_v2[0]["nickname"] == "V2Player"

    # Query invalid rules version
    resp_inv = client.get("/api/leaderboard?rules_version=v99")
    assert resp_inv.status_code == 422


def test_get_runs_with_optional_rules_version_filter(client):
    player_id = str(uuid.uuid4())
    # v1 run
    client.post("/api/runs", json={
        "run_id": str(uuid.uuid4()),
        "player_id": player_id,
        "nickname": "SamePlayer",
        "skin_id": "doodle",
        "rules_version": "v1",
        "height": 3000,
        "elapsed_ms": 20000,
        "outcome": "finished",
        "placement": 1,
    })
    # v2 run
    client.post("/api/runs", json={
        "run_id": str(uuid.uuid4()),
        "player_id": player_id,
        "nickname": "SamePlayer",
        "skin_id": "doodle",
        "rules_version": "v2",
        "height": 3000,
        "elapsed_ms": 10000,
        "outcome": "finished",
        "placement": 1,
    })

    # No filter returns both
    resp = client.get(f"/api/runs?player_id={player_id}")
    assert resp.status_code == 200
    assert len(resp.get_json()["items"]) == 2

    # Filter v1
    resp_v1 = client.get(f"/api/runs?player_id={player_id}&rules_version=v1")
    assert resp_v1.status_code == 200
    assert len(resp_v1.get_json()["items"]) == 1
    assert resp_v1.get_json()["items"][0]["rules_version"] == "v1"

    # Filter v2
    resp_v2 = client.get(f"/api/runs?player_id={player_id}&rules_version=v2")
    assert resp_v2.status_code == 200
    assert len(resp_v2.get_json()["items"]) == 1
    assert resp_v2.get_json()["items"][0]["rules_version"] == "v2"
