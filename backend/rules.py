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
        {"id": "teacher-hiep", "name": "Thầy Hiệp", "base_speed": 44, "sprite_id": "hiep", "sprite": "/images/bots/hiep.png"},
        {"id": "teacher-nam", "name": "Thầy Nam", "base_speed": 48, "sprite_id": "nam", "sprite": "/images/bots/nam.png"},
    ],
}
