import { BOT_PATHS, drawSprite } from './sprites.js';

export const BOT_CUT_IN_DURATION_MS = 1400;
export const BOT_ENTRANCE_IMPACT_MS = 900;

// Eye-line crops from the existing 1254px sprites. Identity/artwork stay intact.
export const BOT_ENTRANCE_PROFILES = Object.freeze({
  NOVICE: { path: BOT_PATHS.NOVICE, crop: [375, 360, 550, 245], accentColor: '#587f50' },
  STANDARD: { path: BOT_PATHS.STANDARD, crop: [335, 385, 600, 265], accentColor: '#397fa0' },
  SPEEDRUNNER: { path: BOT_PATHS.SPEEDRUNNER, crop: [365, 465, 570, 245], accentColor: '#af743d' },
  PERFECT: { path: BOT_PATHS.PERFECT, crop: [350, 370, 590, 250], accentColor: '#8055a0' },
});
const clamp = value => Math.max(0, Math.min(1, value));
const easeOut = value => 1 - (1 - clamp(value)) ** 3;

// An irregular tear, not a rectangular card. Coordinates are relative to the strip.
const TEAR = [
  [-.50,.34],[-.46,.12],[-.43,.14],[-.39,-.05],[-.36,-.02],[-.33,-.22],
  [-.30,-.17],[-.27,-.30],[-.22,-.25],[-.19,-.36],[-.15,-.30],[-.10,-.40],
  [-.05,-.35],[.01,-.46],[.04,-.38],[.09,-.43],[.14,-.36],[.20,-.48],
  [.23,-.40],[.29,-.49],[.32,-.42],[.38,-.52],[.40,-.42],[.48,-.54],
  [.46,-.27],[.50,-.29],[.46,-.04],[.49,.01],[.44,.18],[.46,.20],
  [.40,.34],[.35,.30],[.31,.44],[.26,.37],[.21,.46],[.16,.40],
  [.11,.51],[.06,.43],[.01,.48],[-.04,.39],[-.10,.48],[-.15,.40],
  [-.21,.47],[-.25,.37],[-.31,.44],[-.36,.34],[-.42,.43],[-.45,.34],
];
function polygon(ctx, points, width, height) {
  ctx.beginPath();
  points.forEach(([x,y], i) => {
    if (i === 0) ctx.moveTo(x * width, y * height);
    else ctx.lineTo(x * width, y * height);
  });
  ctx.closePath();
}

// Hand-timed held poses: slash -> pop -> settle -> hold -> impact -> close.
// No interpolation: game simulation and landing effects keep their own full-rate clock.
const CUT_IN_POSES = [
  { at: 0,    x: .012, sx: .86, sy: .055, turn: .025, face: 0, splinters: .1 },
  { at: 60,   x: -.008, sx: .96, sy: .42, turn: -.02, face: -3, splinters: .4 },
  { at: 120,  x: -.004, sx: 1.015, sy: 1.08, turn: .008, face: 2, splinters: 1 },
  { at: 190,  x: .002, sx: .995, sy: .97, turn: -.004, face: 0, splinters: .85 },
  { at: 270,  x: 0, sx: 1, sy: 1, turn: 0, face: 0, splinters: 1 },
  { at: 900,  x: -.002, sx: 1.005, sy: 1.03, turn: .005, face: 1, splinters: 1 },
  { at: 970,  x: 0, sx: 1, sy: 1, turn: 0, face: 0, splinters: 1 },
  { at: 1040, x: .004, sx: 1.01, sy: .55, turn: -.012, face: 0, splinters: .5 },
  { at: 1100, x: .008, sx: 1.03, sy: .065, turn: -.02, face: 0, splinters: .1 },
  { at: 1160, x: 0, sx: 1, sy: 1, turn: 0, face: 0, splinters: 0 },
];

/** Pure sampling: held drawings follow gameplay time, including pause and scrubbing. */
export function sampleBotEntrance(entry, clockMs, reduceMotion = false) {
  const ageMs = clockMs - entry.startMs;
  const active = ageMs >= 0 && ageMs < BOT_CUT_IN_DURATION_MS;
  let pose = CUT_IN_POSES[0];
  for (const candidate of CUT_IN_POSES) {
    if (ageMs < candidate.at) break;
    pose = candidate;
  }
  // One shared composition for every bot, independent of gameplay entry side.
  const direction = -1;
  const impact = clamp((ageMs - BOT_ENTRANCE_IMPACT_MS) / 500);
  const visible = active && ageMs < 1160;
  const fade = clamp(ageMs / 100) * (1 - clamp((ageMs - 1040) / 120));
  return {
    active, ageMs, reduceMotion,
    profile: BOT_ENTRANCE_PROFILES[entry.type] || BOT_ENTRANCE_PROFILES.NOVICE,
    direction,
    portraitAlpha: visible ? .78 * (reduceMotion ? fade : 1) : 0,
    slide: reduceMotion ? 0 : pose.x,
    portraitTilt: reduceMotion ? 0 : direction * (.075 + pose.turn),
    scaleX: reduceMotion ? 1 : pose.sx,
    scaleY: reduceMotion ? 1 : pose.sy,
    faceOffset: reduceMotion ? 0 : pose.face,
    splinterPose: reduceMotion ? 0 : pose.splinters,
    anticipationAlpha: active && !reduceMotion && ageMs < 60 ? .5 : 0,
    impactProgress: impact,
    impactAlpha: active && entry.impactWorldPosition && ageMs >= 900 ? 1 - impact : 0,
    nameAlpha: active && entry.impactWorldPosition && ageMs >= 900 ? 1 - clamp((ageMs - 1050) / 350) : 0,
    shake: !reduceMotion && ageMs >= 900 && ageMs < 1050 ? Math.sin((ageMs - 900) * .08) * 2 * (1 - (ageMs - 900) / 150) : 0,
  };
}

/** Torn manga eye strip behind the world; never transform or clip gameplay. */
export function renderBotEntranceBackground(ctx, entry, sampled, width, height) {
  if (!sampled.active || sampled.portraitAlpha <= 0) return;
  const { profile, direction, portraitAlpha, slide } = sampled;
  const stripWidth = width * .94;
  const stripHeight = Math.min(height * .32, width * .30);
  const unit = width / 960;
  ctx.save();
  ctx.globalAlpha = portraitAlpha;
  ctx.translate(width / 2 + direction * slide * width, height * .36);
  ctx.rotate(sampled.portraitTilt);
  ctx.scale(sampled.scaleX, sampled.scaleY);

  // Angular paper splinters share the held pose; no independent smooth drift.
  if (!sampled.reduceMotion) {
    for (let i = 0; i < 10; i++) {
      const px = (-.42 + i * .093) * stripWidth;
      const sign = i % 2 ? 1 : -1;
      const py = sign * stripHeight * (.56 + (i % 3) * .12);
      const travel = sampled.splinterPose;
      const length = (18 + i % 3 * 12) * unit;
      ctx.fillStyle = i % 3 === 0 ? '#bd6253' : '#403b35';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + direction * length, py - sign * 4 * unit);
      ctx.lineTo(px + direction * length * .6, py + sign * (8 + travel * 9) * unit);
      ctx.closePath();
      ctx.fill();
    }
  }

  polygon(ctx, TEAR, stripWidth, stripHeight);
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = '#403b35';
  ctx.lineWidth = 9 * unit;
  ctx.stroke();
  ctx.strokeStyle = '#fffdf5';
  ctx.lineWidth = 5 * unit;
  ctx.stroke();
  ctx.fillStyle = '#494139';
  ctx.globalAlpha = portraitAlpha * .65;
  ctx.fill();
  ctx.globalAlpha = portraitAlpha;

  ctx.save();
  ctx.clip();
  // Flat vermilion flanks make the eye close-up pop against the black cut.
  ctx.fillStyle = '#bd6253';
  polygon(ctx, [[-.55,.5],[-.48,.04],[-.15,-.48],[-.29,.22],[-.14,.5]], stripWidth, stripHeight);
  ctx.fill();
  polygon(ctx, [[.22,-.55],[.54,-.55],[.54,.38],[.29,.50],[.40,-.13]], stripWidth, stripHeight);
  ctx.fill();

  const faceWidth = stripWidth * .72;
  const faceHeight = faceWidth * profile.crop[3] / profile.crop[2];
  // Preserve aspect and the original face direction; clip the crop into the tear.
  const faceX = -faceWidth / 2 - direction * sampled.faceOffset * unit;
  if (!drawSprite(ctx, profile.path, faceX, -faceHeight / 2, faceWidth, faceHeight, profile.crop)) {
    ctx.fillStyle = '#fffdf5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.min(48 * unit, stripHeight * .4) + 'px sans-serif';
    ctx.fillText(String(entry.name || 'BOT'), 0, 0, stripWidth * .65);
  }
  // Sharp black strokes stay at the ends, away from the eyes.
  ctx.fillStyle = '#494139';
  for (let i = 0; i < 4; i++) {
    const y = -.42 + i * .25;
    polygon(ctx, [[-.52,y],[ -.23 - i % 2 * .04,y-.13],[-.43,y+.13]], stripWidth, stripHeight);
    ctx.fill();
    polygon(ctx, [[.52,y],[.26 + i % 2 * .05,y+.09],[.46,y-.13]], stripWidth, stripHeight);
    ctx.fill();
  }
  // Short pencil hatching in the coloured flanks; leave eyes unobstructed.
  ctx.strokeStyle = '#f2dfbd';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.3 * unit;
  ctx.globalAlpha = portraitAlpha * .38;
  ctx.beginPath();
  for (let i = 0; i < 56; i++) {
    const side = i < 28 ? -1 : 1;
    const j = i % 28;
    const x = side * stripWidth * (.30 + (j % 7) * .028);
    const y = (-.5 + Math.floor(j / 7) * .28 + Math.sin(j * 2.1) * .035) * stripHeight;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 18 * unit, y + (15 + j % 4 * 3) * unit);
  }
  ctx.stroke();
  ctx.restore();

  // Two imperfect pencil passes over the paper edge, stable across held frames.
  ctx.strokeStyle = '#51483d';
  for (let pass = 0; pass < 2; pass++) {
    ctx.globalAlpha = portraitAlpha * (pass ? .33 : .64);
    ctx.lineWidth = (pass ? .8 : 1.3) * unit;
    ctx.beginPath();
    TEAR.forEach(([nx, ny], i) => {
      const x = nx * stripWidth + Math.sin(i * 2.7 + pass) * 1.7 * unit;
      const y = ny * stripHeight + Math.cos(i * 1.9 + pass) * 2 * unit;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Vẽ hiệu ứng chấn động tiếp đất (Landing Impact Effect).
 * Xuất hiện tại vị trí platform mà Bot đáp xuống trong thế giới game (world position),
 * tính toán theo vị trí cuộn của camera (cameraY).
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context 2D
 * @param {Object} entry - Dữ liệu sự kiện bot (chứa impactWorldPosition)
 * @param {Object} sampled - Dữ liệu animation đã sample
 * @param {number} cameraY - Tọa độ cuộn camera Y hiện tại
 */
export function renderBotEntranceImpact(ctx, entry, sampled, cameraY) {
  if (sampled.impactAlpha <= 0) return;

  const { x, y } = entry.impactWorldPosition;
  // Chuyển đổi tọa độ thế giới (world Y) sang tọa độ màn hình (screen Y) dựa trên camera
  const screenY = y - cameraY;
  const p = sampled.impactProgress;

  ctx.save();
  ctx.strokeStyle = sampled.profile.accentColor;
  ctx.fillStyle = sampled.profile.accentColor;
  ctx.globalAlpha = sampled.impactAlpha;
  ctx.lineWidth = sampled.reduceMotion ? 2 : 4 * (1 - p * 0.5);

  // 1. Vòng sóng xung kích chính (hình elip dẹp góc nhìn 3D mặt đất) lan tỏa rộng ra
  const radius = sampled.reduceMotion ? 20 : 18 + easeOut(p) * 66;
  ctx.beginPath();
  ctx.ellipse(x, screenY, radius, radius * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (!sampled.reduceMotion) {
    // 2. Vòng sóng xung kích phụ màu sáng bên trong
    ctx.strokeStyle = '#fffdf5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, screenY - 2, radius * 0.73, radius * 0.19, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Các tia chấn động hướng lên trên tạo hiệu ứng lực va chạm dội ngược
    ctx.strokeStyle = sampled.profile.accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const angle = Math.PI + (i / 6) * Math.PI; // Phân bố nửa cung tròn phía trên
      const inner = 14 + p * 28;
      const outer = inner + 18 * (1 - p);
      ctx.moveTo(x + Math.cos(angle) * inner, screenY + Math.sin(angle) * inner * 0.7);
      ctx.lineTo(x + Math.cos(angle) * outer, screenY + Math.sin(angle) * outer * 0.7);
    }
    ctx.stroke();

    // 4. Các mảnh vụn / tia lửa (debris particles) văng tung tóe và rơi xuống theo gia tốc trọng lực
    for (let i = 0; i < 16; i++) {
      const angle = Math.PI + (i / 15) * Math.PI;
      const distance = 8 + easeOut(p) * (38 + (i % 4) * 17);
      const size = (5 + i % 4) * (1 - p * 0.65);
      ctx.fillStyle = i % 3 === 0 ? '#fffdf5' : sampled.profile.accentColor;
      ctx.fillRect(
        x + Math.cos(angle) * distance - size / 2,
        screenY + Math.sin(angle) * distance + p * p * 28, // p * p * 28 mô phỏng trọng lực kéo xuống
        size,
        size
      );
    }
  }

  ctx.restore();
}

/**
 * Vẽ nhãn/banner tên của Bot xuất hiện ở mép trên màn hình khi Bot tham chiến.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context 2D
 * @param {Object} entry - Dữ liệu sự kiện bot (chứa tên hoặc loại bot)
 * @param {Object} sampled - Dữ liệu animation đã sample
 * @param {number} width - Chiều rộng viewport game
 * @param {number} height - Chiều cao viewport game
 */
export function renderBotEntranceName(ctx, entry, sampled, width, height) {
  if (sampled.nameAlpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = sampled.nameAlpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const name = String(entry.name || entry.type || 'BOT');
  let fontSize = Math.min(24, width * 0.065);
  ctx.font = `bold ${fontSize}px sans-serif`;

  // Đo chiều rộng chuỗi text, tự động hạ cỡ chữ nếu tên quá dài vượt khung canvas
  const availableWidth = Math.max(1, width - 48);
  const measured = ctx.measureText(name).width;
  if (measured > availableWidth) {
    fontSize *= availableWidth / measured;
    ctx.font = `bold ${fontSize}px sans-serif`;
  }

  const labelWidth = Math.min(availableWidth, ctx.measureText(name).width) + 24;
  // Vị trí Y có hiệu ứng nảy nhẹ (bounce) khi vừa chạm đất
  const y = Math.max(fontSize * 0.75 + 8, height * 0.075 - 12) + (sampled.reduceMotion ? 0 : 5 * (1 - easeOut((sampled.ageMs - 900) / 150)));

  // Hộp nền sáng (background badge)
  ctx.fillStyle = '#faf7ed';
  ctx.fillRect((width - labelWidth) / 2, y - fontSize * 0.75, labelWidth, fontSize * 1.5);

  // Đường viền gạch dưới mang màu nhận diện (accent color) của Bot
  ctx.fillStyle = sampled.profile.accentColor;
  ctx.fillRect((width - labelWidth) / 2, y + fontSize * 0.75, labelWidth, 3);

  // Chữ tên Bot
  ctx.fillStyle = '#26372e';
  ctx.fillText(name, width / 2, y, availableWidth);

  ctx.restore();
}
