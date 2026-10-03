"""Shared game rules exposed by /api/config and used to validate saved runs."""

RULES = {
    "rules_version": "v1",
    "finish_height": 3000,
    "max_duration_ms": 180000,
    "skins": [
        {"id": "doodle", "name": "Vàng cổ điển", "sprite": "/images/skins/doodle.svg"},
        {"id": "red", "name": "Đỏ rực", "sprite": "/images/skins/red.svg"},
        {"id": "purple", "name": "Tím mộng mơ", "sprite": "/images/skins/purple.svg"},
        {"id": "blue", "name": "Xanh bầu trời", "sprite": "/images/skins/blue.svg"},
        {"id": "gray", "name": "Xám tinh nghịch", "sprite": "/images/skins/gray.svg"},
    ],
    "bots": [
        {"id": "teacher-son", "name": "Thầy Sơn", "base_speed": 41, "sprite_id": "son", "sprite": "/images/bots/son.png"},
        {"id": "teacher-viet", "name": "Thầy Việt", "base_speed": 46, "sprite_id": "viet", "sprite": "/images/bots/viet.png"},
        {"id": "teacher-quang", "name": "Thầy Quang", "base_speed": 44, "sprite_id": "quang", "sprite": "/images/bots/quang.png"},
        {"id": "teacher-nam", "name": "Thầy Nam", "base_speed": 48, "sprite_id": "nam", "sprite": "/images/bots/nam.png"},
    ],
}

RULES_V1 = RULES

RULES_V2 = {
    "rules_version": "v2",
    "finish_height": 3000,
    "max_duration_ms": 180000,
    "min_finish_duration_ms": 7500,
    "max_players": 4,
    "skins": RULES["skins"],
    "bots": RULES["bots"],
}

RULES_ENDLESS = {
    "rules_version": "endless",
    "finish_height": None,
    "max_duration_ms": None,
    "is_endless": True,
    "skins": RULES["skins"],
    "bots": RULES["bots"],
}

ALL_RULES = {
    "v1": RULES_V1,
    "v2": RULES_V2,
    "endless": RULES_ENDLESS,
}
