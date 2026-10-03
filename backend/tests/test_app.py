import sqlite3
from backend.app import create_app
from backend.db import init_db


def test_frontend_contract_has_config_and_distinct_bots():
    client = create_app({"TESTING": True}).test_client()
    assert client.get("/api/health").json["status"] == "ok"
    response = client.get("/api/config")
    assert response.status_code == 200
    config = response.json
    assert len({b["id"] for b in config["bots"]}) == 4
    assert config["finish_height"] > 0
    assert config["skins"]


def test_missing_routes_and_wrong_methods_are_json():
    client = create_app({"TESTING": True}).test_client()
    missing = client.get("/api/no-such-route")
    assert missing.status_code == 404 and missing.is_json
    wrong = client.post("/api/config")
    assert wrong.status_code == 405 and wrong.is_json
    assert "GET" in wrong.headers["Allow"]


def test_invalid_write_never_claims_saved():
    client = create_app({"TESTING": True}).test_client()
    response = client.post("/api/runs", json={"height": 100})
    assert response.status_code == 422
    assert response.json["error"]["code"] == "invalid_run"


def test_init_does_not_drop_existing_rows(tmp_path):
    db = tmp_path / "game.db"
    init_db(db)
    with sqlite3.connect(db) as connection:
        connection.execute("INSERT INTO runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                           ("run-1", "player-1", "Test", "doodle", "v1", 10, 2000, "dnf", 5, "2026-09-15T00:00:00Z"))
    init_db(db)
    with sqlite3.connect(db) as connection:
        assert connection.execute("SELECT COUNT(*) FROM runs").fetchone()[0] == 1
