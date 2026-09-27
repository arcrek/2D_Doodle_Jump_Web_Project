"""Run persistence, guest history and leaderboard; contract in docs/API.md."""
import sqlite3
import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from ..db import get_db
from ..errors import APIError
from ..rules import RULES

runs_api = Blueprint("runs", __name__)


@runs_api.get("/api/runs")
def get_runs():
    player_id = request.args.get("player_id")
    if not player_id:
        raise APIError(
            code="invalid_run",
            message="Dữ liệu chưa hợp lệ.",
            details={"player_id": "Thiếu mã người chơi (player_id)."},
            status_code=422,
        )

    try:
        val = uuid.UUID(player_id.strip())
        canonical_player_id = str(val)
    except (ValueError, TypeError, AttributeError):
        raise APIError(
            code="invalid_run",
            message="Dữ liệu chưa hợp lệ.",
            details={"player_id": "Mã người chơi phải là chuỗi UUID hợp lệ."},
            status_code=422,
        )

    db = get_db()
    cursor = db.execute(
        """
        SELECT run_id, player_id, nickname, skin_id, rules_version,
               height, elapsed_ms, outcome, placement, created_at
        FROM runs
        WHERE player_id = ?
        ORDER BY created_at DESC, run_id ASC
        LIMIT 20
        """,
        (canonical_player_id,),
    )
    rows = cursor.fetchall()
    return jsonify(items=[dict(row) for row in rows])


@runs_api.post("/api/runs")
def post_runs():
    data = request.get_json(silent=False) if request.is_json else None
    if not isinstance(data, dict):
        raise APIError("invalid_run", "Cần gửi một đối tượng JSON.", status_code=422)

    fields = ("run_id", "player_id", "nickname", "skin_id", "rules_version",
              "height", "elapsed_ms", "outcome", "placement")
    clean = {key: data.get(key) for key in fields}
    errors = {}

    for key in ("run_id", "player_id"):
        try:
            clean[key] = str(uuid.UUID(clean[key].strip()))
        except (ValueError, TypeError, AttributeError):
            errors[key] = "Phải là UUID hợp lệ."

    nickname = clean["nickname"]
    if not isinstance(nickname, str) or not 1 <= len(nickname.strip()) <= 24:
        errors["nickname"] = "Tên cần từ 1 đến 24 ký tự."
    else:
        clean["nickname"] = nickname.strip()

    # Existing v1 runs can still be retried after the new player skins ship.
    valid_skins = {skin["id"] for skin in RULES["skins"]} | {"nam", "quang", "son", "viet"}
    if not isinstance(clean["skin_id"], str) or clean["skin_id"] not in valid_skins:
        errors["skin_id"] = "Nhân vật không tồn tại."
    if clean["rules_version"] != RULES["rules_version"]:
        errors["rules_version"] = "Phiên bản luật không được hỗ trợ."

    for key, low, high in (("height", 0, RULES["finish_height"]),
                           ("elapsed_ms", 1, RULES["max_duration_ms"]),
                           ("placement", 1, 5)):
        if type(clean[key]) is not int or not low <= clean[key] <= high:
            errors[key] = f"Cần số nguyên từ {low} đến {high}."

    if clean["outcome"] not in ("finished", "dnf"):
        errors["outcome"] = "Kết quả không hợp lệ."
    elif "height" not in errors:
        reached_goal = clean["height"] == RULES["finish_height"]
        if reached_goal != (clean["outcome"] == "finished"):
            errors["outcome"] = "Kết quả không khớp độ cao."

    if errors:
        raise APIError("invalid_run", "Dữ liệu chưa hợp lệ.", errors, 422)

    db = get_db()
    created_at = datetime.now(timezone.utc).isoformat(timespec="microseconds")
    try:
        db.execute(
            "INSERT INTO runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (*[clean[key] for key in fields], created_at),
        )
        db.commit()
    except sqlite3.IntegrityError:
        db.rollback()
        existing = db.execute(
            "SELECT * FROM runs WHERE run_id = ?", (clean["run_id"],)
        ).fetchone()
        if existing is None or any(existing[key] != clean[key] for key in fields):
            raise APIError(
                "run_conflict",
                "Mã lượt chơi đã có dữ liệu khác.",
                status_code=409,
            )
        return jsonify(dict(existing)), 200

    return jsonify(**clean, created_at=created_at), 201


@runs_api.get("/api/runs/<run_id>")
def run_detail(run_id):
    row = get_db().execute(
        "SELECT * FROM runs WHERE run_id = ?", (run_id,)
    ).fetchone()
    if row is None:
        raise APIError("not_found", "Không tìm thấy lượt chơi.", status_code=404)
    return jsonify(dict(row))


@runs_api.get("/api/leaderboard")
def leaderboard():
    version = request.args.get("rules_version", RULES["rules_version"])
    if version != RULES["rules_version"]:
        raise APIError("invalid_rules", "Phiên bản luật không hợp lệ.", status_code=422)
    rows = get_db().execute(
        """
        SELECT * FROM runs
        WHERE rules_version = ?
        ORDER BY CASE outcome WHEN 'finished' THEN 0 ELSE 1 END,
                 CASE WHEN outcome = 'dnf' THEN height END DESC,
                 elapsed_ms ASC, created_at ASC, run_id ASC
        LIMIT 10
        """,
        (version,),
    ).fetchall()
    return jsonify(items=[dict(row) for row in rows])
