from flask_socketio import SocketIO

socketio = SocketIO(
    async_mode="threading",
    cors_allowed_origins="*",
    ping_timeout=10,
    ping_interval=5,
    manage_session=False,
)
