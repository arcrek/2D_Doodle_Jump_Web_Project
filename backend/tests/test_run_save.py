import sqlite3
import uuid

import pytest

from backend.app import create_app
from backend.db import init_db


@pytest.fixture
def client(tmp_path):
    database = tmp_path / "runs.db"
    init_db(database)
    return create_app({"TESTING": True, "DATABASE": str(database)}).test_client()


def payload(**overrides):
    return {
        **{
            "run_id": str(uuid.uuid4()),
            "player_id": str(uuid.uuid4()),
            "nickname": "Tester",
        "skin_id": "doodle",
            "rules_version": "v1",
            "height": 150,
            "elapsed_ms": 3000,
            "outcome": "dnf",
            "placement": 3,
        },
        **overrides,
    }


def test_save_retry_conflict_and_missing_detail(client):
    run = payload(nickname="  Tester  ")
    response = client.post("/api/runs", json=run)
    assert response.status_code == 201
    assert response.json["nickname"] == "Tester"
    assert response.json["created_at"]
    assert client.post("/api/runs", json=run).status_code == 200
    assert client.post("/api/runs", json={**run, "height": 200}).status_code == 409
    assert client.get("/api/runs/" + run["run_id"].upper()).json["run_id"] == run["run_id"]
    assert client.get("/api/runs/not-a-uuid").status_code == 404
    assert client.get("/api/runs/" + str(uuid.uuid4())).status_code == 404


def test_legacy_run_retry_and_new_skin_validation(client):
    legacy = payload(skin_id="nam", nickname=" Tester ")
    database = client.application.config["DATABASE"]
    with sqlite3.connect(database) as db:
        db.execute(
            "INSERT INTO runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (legacy["run_id"], legacy["player_id"], "Tester", legacy["skin_id"],
             legacy["rules_version"], legacy["height"], legacy["elapsed_ms"],
             legacy["outcome"], legacy["placement"], "2026-09-01T00:00:00Z"),
        )
    retry = {**legacy, "run_id": legacy["run_id"].upper(), "player_id": legacy["player_id"].upper()}
    assert client.post("/api/runs", json=retry).status_code == 200
    assert client.post("/api/runs", json={**retry, "height": 200}).status_code == 409
    invalid = client.post("/api/runs", json=payload(skin_id="nam"))
    assert invalid.status_code == 422
    assert "skin_id" in invalid.json["error"]["details"]
    assert client.post("/api/runs", json=payload(skin_id="red")).status_code == 201


def test_oversized_json_returns_api_error(client):
    response = client.post("/api/runs", json={"padding": "x" * (16 * 1024)})
    assert response.status_code == 413
    assert response.json["error"]["code"] == "request_entity_too_large"
    assert set(response.json["error"]) == {"code", "message", "details"}


@pytest.mark.parametrize("change", [
    {"height": True}, {"elapsed_ms": False}, {"placement": True},
    {"height": -1}, {"height": 3001}, {"elapsed_ms": 0},
    {"elapsed_ms": 180001}, {"placement": 6}, {"nickname": " "},
    {"nickname": "a" * 25}, {"skin_id": "bad"}, {"rules_version": "bad"},
    {"outcome": "finished"}, {"height": 3000}, {"run_id": "not-uuid"},
    {"nickname": []}, {"height": 1.2}, {"skin_id": {}}, {"outcome": []},
])
def test_invalid_results_rejected(client, change):
    assert client.post("/api/runs", json=payload(**change)).status_code == 422


def test_invalid_json_and_shape(client):
    assert client.post("/api/runs", data="{", content_type="application/json").status_code == 400
    assert client.post("/api/runs", json=[]).status_code == 422


def test_leaderboard_limit_and_finish_order(client):
    runs = [
        payload(nickname="DNF high", height=2500),
        payload(nickname="Winner slow", outcome="finished", height=3000, elapsed_ms=50000),
        payload(nickname="Winner fast", outcome="finished", height=3000, elapsed_ms=40000),
    ]
    runs += [payload(nickname=f"Low {index}", height=index) for index in range(12)]
    for run in runs:
        assert client.post("/api/runs", json=run).status_code == 201
    rows = client.get("/api/leaderboard?rules_version=v1").json["items"]
    assert len(rows) == 10
    assert [row["nickname"] for row in rows[:3]] == ["Winner fast", "Winner slow", "DNF high"]
    assert set(rows[0]) == {"nickname", "skin_id", "rules_version", "height", "elapsed_ms",
                            "outcome", "placement", "created_at"}
    assert client.get("/api/leaderboard?rules_version=invalid").status_code == 422


def test_endless_run_accepts_height_and_duration_beyond_old_limits(client):
    endless_run = payload(
        rules_version="endless",
        height=5420,
        elapsed_ms=250000,
        outcome="dnf",
    )
    res = client.post("/api/runs", json=endless_run)
    assert res.status_code == 201
    assert res.json["height"] == 5420
    assert res.json["elapsed_ms"] == 250000
    assert res.json["rules_version"] == "endless"

    # Outcome "finished" is rejected in endless mode because there is no finish line
    invalid_finished = payload(
        rules_version="endless",
        height=5420,
        elapsed_ms=250000,
        outcome="finished",
    )
    assert client.post("/api/runs", json=invalid_finished).status_code == 422


def test_endless_leaderboard_orders_by_height_desc(client):
    runs = [
        payload(nickname="Pro Climber", rules_version="endless", height=10000, elapsed_ms=600000),
        payload(nickname="Mid Climber", rules_version="endless", height=5000, elapsed_ms=300000),
        payload(nickname="Speed Climber", rules_version="endless", height=5000, elapsed_ms=200000),
    ]
    for r in runs:
        assert client.post("/api/runs", json=r).status_code == 201
    items = client.get("/api/leaderboard?rules_version=endless").json["items"]
    assert len(items) == 3
    assert [item["nickname"] for item in items] == ["Pro Climber", "Speed Climber", "Mid Climber"]

