import sqlite3
from pathlib import Path
from flask import current_app, g


def get_db():
    """Lấy kết nối SQLite cho request hiện tại, cấu hình row_factory = sqlite3.Row."""
    if "db" not in g:
        path = Path(current_app.config["DATABASE"])
        path.parent.mkdir(parents=True, exist_ok=True)
        g.db = sqlite3.connect(path)
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(e=None):
    """Đóng kết nối SQLite khi kết thúc request context."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db(database_path):
    path = Path(database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    schema = Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")
    with sqlite3.connect(path) as connection:
        connection.executescript(schema)
