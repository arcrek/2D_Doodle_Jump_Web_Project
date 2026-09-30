import sqlite3
import uuid
from backend.app import create_app
from backend.db import init_db


def make_test_client(tmp_path):
    db_path = tmp_path / "game.db"
    init_db(db_path)
    app = create_app({"TESTING": True, "DATABASE": str(db_path)})
    return app.test_client(), db_path


def insert_run(db_path, run_id, player_id, created_at, nickname="Tester", height=100, elapsed_ms=1000):
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO runs (run_id, player_id, nickname, skin_id, rules_version, height, elapsed_ms, outcome, placement, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (run_id, player_id, nickname, "doodle", "v1", height, elapsed_ms, "finished", 1, created_at),
        )


def test_get_runs_missing_player_id(tmp_path):
    client, _ = make_test_client(tmp_path)
    res = client.get("/api/runs")
    assert res.status_code == 422
    assert res.json["error"]["code"] == "invalid_run"
    assert "player_id" in res.json["error"]["details"]


def test_get_runs_empty_player_id(tmp_path):
    client, _ = make_test_client(tmp_path)
    res = client.get("/api/runs?player_id=   ")
    assert res.status_code == 422
    assert res.json["error"]["code"] == "invalid_run"
    assert "player_id" in res.json["error"]["details"]


def test_get_runs_invalid_uuid(tmp_path):
    client, _ = make_test_client(tmp_path)
    res = client.get("/api/runs?player_id=not-a-uuid")
    assert res.status_code == 422
    assert res.json["error"]["code"] == "invalid_run"
    assert "player_id" in res.json["error"]["details"]


def test_get_runs_empty_history(tmp_path):
    client, _ = make_test_client(tmp_path)
    valid_uuid = str(uuid.uuid4())
    res = client.get(f"/api/runs?player_id={valid_uuid}")
    assert res.status_code == 200
    assert res.json == {"items": []}


def test_get_runs_filters_by_player_id(tmp_path):
    client, db_path = make_test_client(tmp_path)
    player_a = str(uuid.uuid4())
    player_b = str(uuid.uuid4())
    insert_run(db_path, "run-a", player_a, "2026-09-16T12:00:00Z")
    insert_run(db_path, "run-b", player_b, "2026-09-16T12:00:00Z")

    res = client.get(f"/api/runs?player_id={player_a}")
    assert res.status_code == 200
    items = res.json["items"]
    assert len(items) == 1
    assert items[0]["run_id"] == "run-a"
    assert items[0]["player_id"] == player_a


def test_get_runs_order_created_at_desc_and_run_id_asc(tmp_path):
    client, db_path = make_test_client(tmp_path)
    player = str(uuid.uuid4())
    # 2 lượt khác created_at, 2 lượt trùng created_at để thử tie-breaker
    insert_run(db_path, "run-old", player, "2026-09-16T10:00:00Z")
    insert_run(db_path, "run-tie-b", player, "2026-09-16T12:00:00Z")
    insert_run(db_path, "run-tie-a", player, "2026-09-16T12:00:00Z")

    res = client.get(f"/api/runs?player_id={player}")
    assert res.status_code == 200
    items = res.json["items"]
    ids = [item["run_id"] for item in items]
    # run-tie-a và run-tie-b có created_at mới hơn run-old. Giữa 2 tie, 'run-tie-a' < 'run-tie-b'
    assert ids == ["run-tie-a", "run-tie-b", "run-old"]


def test_get_runs_limits_to_20(tmp_path):
    client, db_path = make_test_client(tmp_path)
    player = str(uuid.uuid4())
    for i in range(25):
        insert_run(db_path, f"run-{i:02d}", player, f"2026-09-16T12:{i:02d}:00Z")

    res = client.get(f"/api/runs?player_id={player}")
    assert res.status_code == 200
    items = res.json["items"]
    assert len(items) == 20
    # Lượt mới nhất i=24 phải đứng đầu
    assert items[0]["run_id"] == "run-24"
    assert items[-1]["run_id"] == "run-05"


def test_post_run_and_read_detail(tmp_path):
    client, _ = make_test_client(tmp_path)
    run_id = str(uuid.uuid4())
    player_id = str(uuid.uuid4())
    payload = {
        "run_id": run_id,
        "player_id": player_id,
        "nickname": " Tester ",
        "skin_id": "doodle",
        "rules_version": "v1",
        "height": 100,
        "elapsed_ms": 2500,
        "outcome": "dnf",
        "placement": 3,
    }
    saved = client.post("/api/runs", json=payload)
    assert saved.status_code == 201
    assert saved.json["nickname"] == "Tester"
    assert client.post("/api/runs", json=payload).status_code == 200
    assert client.get(f"/api/runs/{run_id}").json["height"] == 100
    assert len(client.get(f"/api/runs?player_id={player_id}").json["items"]) == 1


def test_leaderboard_orders_finished_then_highest_dnf(tmp_path):
    client, _ = make_test_client(tmp_path)
    player_id = str(uuid.uuid4())
    base = {
        "player_id": player_id,
        "skin_id": "doodle",
        "rules_version": "v1",
        "placement": 1,
    }
    runs = [
        {**base, "run_id": str(uuid.uuid4()), "nickname": "DNF", "height": 2500,
         "elapsed_ms": 2000, "outcome": "dnf"},
        {**base, "run_id": str(uuid.uuid4()), "nickname": "Winner", "height": 3000,
         "elapsed_ms": 50000, "outcome": "finished"},
    ]
    for run in runs:
        assert client.post("/api/runs", json=run).status_code == 201
    items = client.get("/api/leaderboard?rules_version=v1").json["items"]
    assert [item["nickname"] for item in items] == ["Winner", "DNF"]
