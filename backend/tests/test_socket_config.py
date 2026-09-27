import pytest
from backend.app import create_app
from backend.socket import socketio


@pytest.fixture
def app(tmp_path):
    db_path = str(tmp_path / "test.db")
    app = create_app({"TESTING": True, "DATABASE": db_path})
    return app


def test_socket_config_threading_mode(app):
    assert socketio.async_mode == "threading"


def test_socket_client_connection(app):
    client = socketio.test_client(app)
    assert client.is_connected()
    client.disconnect()
