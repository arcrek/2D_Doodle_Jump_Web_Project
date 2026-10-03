from pathlib import Path

import click
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from .db import init_db, close_db
from .errors import APIError
from .routes.config import config_api
from .routes.runs import runs_api
from .routes.rooms import rooms_api
from .socket import socketio
from . import events


def create_app(test_config=None):
    app = Flask(__name__, instance_path=str(Path(__file__).parent / "instance"))
    app.config["DATABASE"] = str(Path(app.instance_path) / "game.db")
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024
    if test_config:
        app.config.update(test_config)
    app.register_blueprint(config_api)
    app.register_blueprint(runs_api)
    app.register_blueprint(rooms_api)
    socketio.init_app(app)
    app.teardown_appcontext(close_db)

    @app.errorhandler(APIError)
    def handle_api_error(error):
        return jsonify(error={
            "code": error.code,
            "message": error.message,
            "details": error.details,
        }), error.status_code

    @app.errorhandler(HTTPException)
    def http_error(error):
        response = error.get_response()
        response.data = app.json.dumps({"error": {
            "code": error.name.lower().replace(" ", "_"),
            "message": error.description,
            "details": {},
        }})
        response.content_type = "application/json"
        return response

    @app.errorhandler(500)
    def server_error(error):
        return jsonify(error={"code": "server_error", "message": "Backend gặp lỗi. Xem terminal Flask.", "details": {}}), 500

    @app.cli.command("init-db")
    def init_db_command():
        """Tạo bảng còn thiếu; không xóa dữ liệu hiện có."""
        init_db(app.config["DATABASE"])
        click.echo("Database ready (existing data preserved).")

    return app
