from dataclasses import dataclass, field
from enum import Enum
import random
import string
from threading import Lock, RLock
import time
import uuid


class RoomStatus(str, Enum):
    WAITING = "WAITING"
    COUNTDOWN = "COUNTDOWN"
    RACING = "RACING"
    ADJUDICATING = "ADJUDICATING"
    FINISHED = "FINISHED"


@dataclass
class PlayerSession:
    player_id: str
    nickname: str
    skin_id: str
    is_ready: bool = False
    is_host: bool = False
    sid: str | None = None
    connected: bool = True
    disconnected_at: float | None = None

    # Runtime physics and trajectory state
    y: float = 0.0
    vy: float = 0.0
    x: float = 0.0
    last_tick_ts: float = field(default_factory=time.time)
    checkpoints: set[int] = field(default_factory=set)
    max_y: float = 0.0
    stunned_until: float = 0.0

    # Superpower / skill state
    active_skill: str | None = None
    last_skill_ts: float = 0.0

    # Race outcome
    outcome: str | None = None
    placement: int | None = None
    elapsed_ms: int | None = None

    def to_dict(self):
        return {
            "player_id": self.player_id,
            "nickname": self.nickname,
            "skin_id": self.skin_id,
            "is_ready": self.is_ready,
            "is_host": self.is_host,
            "connected": self.connected,
        }


@dataclass
class RaceRoom:
    room_id: str
    room_code: str
    rules_version: str = "v2"
    seed: int = 0
    max_players: int = 4
    status: RoomStatus = RoomStatus.WAITING
    created_at: float = field(default_factory=time.time)
    players: dict[str, PlayerSession] = field(default_factory=dict)
    finish_height: int = 3000
    start_timestamp_ms: int = 0
    countdown_ms: int = 3000
    finish_order: list[str] = field(default_factory=list)
    claimed_boxes: set[str] = field(default_factory=set)
    lock: RLock = field(default_factory=RLock)
    def is_full(self) -> bool:
        with self.lock:
            return len(self.players) >= self.max_players

    def all_ready(self) -> bool:
        with self.lock:
            return len(self.players) >= 2 and all(p.is_ready for p in self.players.values())

    def add_player(self, session: PlayerSession) -> bool:
        with self.lock:
            if session.player_id in self.players:
                return True
            if self.status != RoomStatus.WAITING:
                return False
            if len(self.players) >= self.max_players:
                return False
            self.players[session.player_id] = session
            return True

    def remove_player(self, player_id: str) -> bool:
        with self.lock:
            if player_id in self.players:
                was_host = self.players[player_id].is_host
                del self.players[player_id]
                if was_host and self.players:
                    next(iter(self.players.values())).is_host = True
                return True
            return False
    def get_player(self, player_id: str) -> PlayerSession | None:
        with self.lock:
            return self.players.get(player_id)

    def to_dict(self):
        with self.lock:
            return {
                "room_id": self.room_id,
                "room_code": self.room_code,
                "status": self.status.value if isinstance(self.status, RoomStatus) else self.status,
                "player_count": len(self.players),
                "max_players": self.max_players,
                "rules_version": self.rules_version,
                "players": [p.to_dict() for p in self.players.values()],
            }


class RoomManager:
    def __init__(self):
        self.rooms: dict[str, RaceRoom] = {}
        self.code_to_id: dict[str, str] = {}
        self.sid_to_player: dict[str, tuple[str, str]] = {}
        self.lock = RLock()

    def generate_code(self) -> str:
        chars = string.ascii_uppercase + string.digits
        for _ in range(200):
            code = "".join(random.choices(chars, k=6))
            if code not in self.code_to_id:
                return code
        raise RuntimeError("Không thể tạo mã phòng ngẫu nhiên duy nhất.")

    def create_room(self, host_player_id: str, nickname: str, skin_id: str) -> RaceRoom:
        with self.lock:
            room_id = str(uuid.uuid4())
            room_code = self.generate_code()
            room = RaceRoom(
                room_id=room_id,
                room_code=room_code,
                rules_version="v2",
                max_players=4,
            )
            host_session = PlayerSession(
                player_id=host_player_id,
                nickname=nickname,
                skin_id=skin_id,
                is_ready=False,
                is_host=True,
            )
            room.players[host_player_id] = host_session
            self.rooms[room_id] = room
            self.code_to_id[room_code] = room_id
            return room

    def get_room(self, room_id: str) -> RaceRoom | None:
        with self.lock:
            return self.rooms.get(room_id)

    def get_room_by_code(self, room_code: str) -> RaceRoom | None:
        with self.lock:
            room_id = self.code_to_id.get(room_code.upper().strip())
            if room_id:
                return self.rooms.get(room_id)
            return None

    def find_room(self, identifier: str) -> RaceRoom | None:
        return self.get_room_by_code(identifier) or self.get_room(identifier)

    def register_sid(self, sid: str, room_id: str, player_id: str):
        with self.lock:
            self.sid_to_player[sid] = (room_id, player_id)

    def unregister_sid(self, sid: str) -> tuple[str, str] | None:
        with self.lock:
            return self.sid_to_player.pop(sid, None)

    def get_by_sid(self, sid: str) -> tuple[str, str] | None:
        with self.lock:
            return self.sid_to_player.get(sid)

    def delete_room(self, room_id: str) -> bool:
        with self.lock:
            room = self.rooms.pop(room_id, None)
            if room:
                self.code_to_id.pop(room.room_code, None)
                to_remove = [sid for sid, (rid, _) in self.sid_to_player.items() if rid == room_id]
                for sid in to_remove:
                    self.sid_to_player.pop(sid, None)
                return True
            return False

    def clear(self):
        """Reset all in-memory room state (intended for testing)."""
        with self.lock:
            self.rooms.clear()
            self.code_to_id.clear()
            self.sid_to_player.clear()


room_manager = RoomManager()
