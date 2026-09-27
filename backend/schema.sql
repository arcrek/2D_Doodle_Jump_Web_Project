CREATE TABLE IF NOT EXISTS runs (
    run_id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    skin_id TEXT NOT NULL,
    rules_version TEXT NOT NULL,
    height INTEGER NOT NULL,
    elapsed_ms INTEGER NOT NULL,
    outcome TEXT NOT NULL,
    placement INTEGER NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS runs_player ON runs(player_id, created_at);
CREATE INDEX IF NOT EXISTS runs_rules ON runs(rules_version);

CREATE TABLE IF NOT EXISTS race_rooms (
    room_id TEXT PRIMARY KEY,
    room_code TEXT NOT NULL UNIQUE,
    rules_version TEXT NOT NULL DEFAULT 'v2',
    seed INTEGER NOT NULL,
    player_count INTEGER NOT NULL,
    winner_player_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS race_room_members (
    room_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    placement INTEGER NOT NULL,
    elapsed_ms INTEGER NOT NULL,
    outcome TEXT NOT NULL,
    PRIMARY KEY (room_id, player_id),
    FOREIGN KEY (room_id) REFERENCES race_rooms(room_id)
);
CREATE INDEX IF NOT EXISTS race_rooms_rules ON race_rooms(rules_version);
