// 1. CẤU HÌNH MÀN HÌNH & GAMEPLAY
export const SCREEN_WIDTH = 960;
export const SCREEN_HEIGHT = 540;
export const HUD_SNAPSHOT = 100; // ms
export const FIXED_DT = 1 / 60; // 60 FPS (0.0166s mỗi frame)
export const CAMERA_SIGHT_RATIO = 0.60; // Vị trí nhân vật trên màn hình (60% từ trên xuống, hạ thấp camera gần đáy)

// 2. HỆ VẬT LÝ NHÂN VẬT (PLAYER) - Cân bằng từ 2D Doodle Jump cho Canvas
export const GRAVITY = 1200; // px/s^2 - Trọng lực kéo xuống trong Canvas
export const JUMP_VELOCITY = -520; // px/s - Vận tốc nảy cơ bản (Âm để bay lên trong Canvas)
export const SPRING_JUMP_VELOCITY = -850; // px/s - Vận tốc khi dẫm lò xo

// Hệ gia tốc & ma sát ngang (Inertia & Kinematics)
export const ACCE = 1800; // px/s^2 - Gia tốc tăng tốc di chuyển ngang
export const MASATTRUOT = 2000; // px/s^2 - Ma sát trượt hãm phanh khi nhả phím
export const MAX_VX = 420; // px/s - Vận tốc ngang tối đa (Trái/Phải)
export const MAX_VY = 950; // px/s - Vận tốc rơi tự do tối đa

// 3. THÔNG SỐ NHÂN VẬT (PLAYER)
export const PLAYER_WIDTH = 34;
export const PLAYER_HEIGHT = 42;

// 4. CẤU HÌNH BỆ ĐỠ (PLATFORMS)
export const P_HEIGHT_MAX = 14; 
export const P_HEIGHT = 14; 
export const P_WIDTH_MIN = 80;
export const P_WIDTH_MAX = 200;
export const P_MOVING_SPEED = 80; // px/s - Tốc độ bệ di động ngang

// 5. THUẬT TOÁN SINH BỆ (PROCEDURAL GENERATION)
export const STEP_Y_MIN = 60; // Khoảng cách dọc tối thiểu giữa 2 bệ
export const STEP_Y_MAX = 130; // Khoảng cách dọc tối đa

// 6. HIỆU ỨNG THỜI GIAN
export const BREAKABLE_DELAY = 200; // ms trước khi bệ nâu vỡ
export const DISAPPEAR_DELAY = 800; // ms trước khi bệ trắng biến mất

// 7. THÔNG SỐ VÀ CẤU HÌNH 4 CÁ TÍNH BOT
export const BOT_WIDTH = 44;
export const BOT_HEIGHT = 44;
export const BOT_ACCEL = 1800;

export const BOT_COLORS = {
  NOVICE: '#3498db',      // Xanh dương
  STANDARD: '#9b59b6',    // Tím
  SPEEDRUNNER: '#e67e22', // Cam
  PERFECT: '#e74c3c',     // Đỏ
};

export const BOT_PROFILES = {
  NOVICE: {
    name: 'Thầy Sơn',
    speedMultiplier: 0.72,
    maxJumpReach: 120,
    reactionDelay: 0.08,
    aimOffset: 16,
    strategy: 'nearest_wide',
    skipJumpChance: 0,
    breakableMistakeChance: 0.010,
    jumpCooldown: 0, // s - Nhảy lên ngay lập tức khi tiếp đất giống người chơi
  },
  STANDARD: {
    name: 'Thầy Việt',
    speedMultiplier: 0.80,
    maxJumpReach: 120,
    reactionDelay: 0.06,
    aimOffset: 10,
    strategy: 'safe_balanced',
    skipJumpChance: 0,
    breakableMistakeChance: 0.009,
    jumpCooldown: 0,
  },
  SPEEDRUNNER: {
    name: 'Thầy Hiệp',
    speedMultiplier: 0.84,
    maxJumpReach: 120,
    reactionDelay: 0.04,
    aimOffset: 5,
    strategy: 'highest_aggressive',
    skipJumpChance: 0,
    breakableMistakeChance: 0.008,
    jumpCooldown: 0,
  },
  PERFECT: {
    name: 'Thầy Nam',
    speedMultiplier: 0.86,
    maxJumpReach: 120,
    reactionDelay: 0.03,
    aimOffset: 2,
    strategy: 'optimal_uncontested',
    skipJumpChance: 0,
    breakableMistakeChance: 0.006,
    jumpCooldown: 0,
  },
};

// 8. CƠ CHẾ DUNG NHAM DÂNG (RISING LAVA - ENDLESS MODE)
export const LAVA_INITIAL_SPEED = 75; // px/s - Vận tốc dâng ban đầu (tăng tốc độ dâng áp sát người chơi)
export const LAVA_SPEED_INCREASE_PER_10S = 10; // px/s - Tốc độ dâng tăng thêm 10px sau mỗi 10 giây
export const LAVA_ACCEL = LAVA_SPEED_INCREASE_PER_10S / 10; // 1.0 px/s^2 - Gia tốc tăng tốc độ dâng nhanh theo thời gian
export const LAVA_MAX_SPEED = 350; // px/s - Giới hạn tốc độ tối đa rất nhanh để tạo thử thách bứt phá và kết thúc ván
export const LAVA_INITIAL_Y = 520; // px - Tọa độ Y bắt đầu dâng (nằm dưới chân người chơi ở vạch xuất phát)

// 9. HỆ THỐNG VẬT PHẨM BỔ TRỢ (POWERUPS)
export const POWERUP_SPAWN_CHANCE = 0.025; // 2.5% tỷ lệ xuất hiện vật phẩm trên mỗi bệ (giảm mạnh từ 15% để tránh bay liên tục)
export const POWERUP_ROCKET_CHANCE = 0.30; // 30% tỷ lệ vật phẩm là Tên lửa (hiếm), 70% là Khiên bảo vệ

export const POWERUP_TYPES = {
  ROCKET: 'rocket',
  SHIELD: 'shield',
};

// Cấu hình hình ảnh (Sprites) và kích thước vật phẩm (Có thể tùy chỉnh hoặc thay thế file ảnh tại đây)
export const POWERUP_CONFIG = {
  rocket: {
    src: '/images/powerups/rocket.svg',
    width: 24,
    height: 32,
  },
  shield: {
    src: '/images/powerups/shield.svg',
    width: 26,
    height: 26,
  },
};

// Tên lửa (Rocket)
export const ROCKET_DURATION = 3.5; // s - Thời gian hiệu lực bay vọt
export const ROCKET_SPEED_Y = -650; // px/s - Tốc độ bay vút cực nhanh lên cao (vượt qua ~25 bệ)

// Khiên bảo vệ (Shield)
export const SHIELD_DURATION = 7.0; // s - Thời gian duy trì khiên
export const SHIELD_LAVA_REBOUND_VELOCITY = -880; // px/s - Lực nảy cứu mạng khi rơi trúng Lava (bật cao 2-3 bệ)

// 10. QUẢN LÝ ÂM THANH (AUDIO CONFIG)
export const AUDIO_CONFIG = {
  bgm: {
    src: '/audio/bgm.mp3',
    volume: 0.5,
    loop: true,
  },
  sfx: {
    jump: { src: '/audio/sfx-jump.mp3', volume: 0.7 },
    rocket: { src: '/audio/sfx-rocket.mp3', volume: 0.8 },
    shield: { src: '/audio/sfx-shield.mp3', volume: 0.7 },
    lavaBurn: { src: '/audio/sfx-lava-burn.mp3', volume: 0.9 },
    shieldBreak: { src: '/audio/sfx-shield-break.mp3', volume: 0.85 },
  },
};