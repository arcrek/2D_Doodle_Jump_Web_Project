// =============================================================================
// FILE: doodle-jump-usth/frontend/src/game/doodle-art.js
// VAI TRÒ: BỘ CÔNG CỤ VẼ ĐỒ HỌA PHÁC THẢO TAY TRÊN CANVAS 2D (DOODLE ART UTILITIES)
// =============================================================================
// Module này chịu trách nhiệm vẽ các phần tử đồ họa mang phong cách vẽ tay (hand-drawn sketch):
// 1. drawSketchLine & drawSketchRect: Các hàm vẽ đường thẳng/khung chữ nhật rung nhẹ giả nét bút chì.
// 2. drawDoodleTitle: Logo bút chì tách thành chữ phụ, chữ chính và gạch chân, giữ từng nhịp stop motion.
// 3. drawDoodleStartButton: Vẽ nút "▶ BẮT ĐẦU CHƠI" với hiệu ứng thở (pulse) và đổi màu khi rê chuột.
// 4. drawDoodleArrowGuide: Vẽ gợi ý phím bấm điều khiển [ ← / A ] và [ → / D ] ở góc màn hình.
// 5. drawDoodleCharacter: Vẽ nhân vật dạng hạt đậu hoạt hình (mắt, con ngươi liếc, mũi, chân nhún).
// 6. drawDoodleWipe: Lật sang trang giấy kẻ ô mới khi chơi lại.
// =============================================================================

import { drawTitleLogo } from './title-logo.js';
import { t } from '../i18n/index.js';

/**
 * Vẽ một đoạn thẳng có độ rung ngẫu nhiên (jitter) tạo cảm giác nét vẽ tay của người thật.
 * @param {CanvasRenderingContext2D} ctx - Ngữ cảnh vẽ 2D
 * @param {number} x1 - Tọa độ X điểm đầu
 * @param {number} y1 - Tọa độ Y điểm đầu
 * @param {number} x2 - Tọa độ X điểm cuối
 * @param {number} y2 - Tọa độ Y điểm cuối
 * @param {number} jitter - Biên độ rung lệch tâm (mặc định 1.2px)
 */
export function drawSketchLine(ctx, x1, y1, x2, y2, jitter = 1.2) {
  // Tính điểm uốn cong ở giữa bằng cách lệch ngẫu nhiên một khoảng nhỏ
  const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * jitter;
  const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * jitter;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  // Dùng đường cong bậc 2 (quadratic curve) để nét vẽ hơi cong tự nhiên chứ không thẳng tắp
  ctx.quadraticCurveTo(midX, midY, x2, y2);
  ctx.stroke();
}

/**
 * Vẽ một khung chữ nhật bo góc có viền phác thảo tay nét đôi (2 passes).
 * @param {CanvasRenderingContext2D} ctx - Ngữ cảnh vẽ 2D
 * @param {number} x - Tọa độ X góc trên bên trái
 * @param {number} y - Tọa độ Y góc trên bên trái
 * @param {number} w - Chiều rộng khung
 * @param {number} h - Chiều cao khung
 * @param {number} radius - Bán kính bo góc (mặc định 6px)
 */
export function drawSketchRect(ctx, x, y, w, h, radius = 6) {
  // Lượt vẽ thứ 1: Nét viền chính
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();

  // Lượt vẽ thứ 2: Nét viền lệch nhẹ + giảm độ mờ (opacity) tạo hiệu ứng vẽ chì đè nét
  ctx.save();
  ctx.globalAlpha *= 0.6;
  ctx.beginPath();
  ctx.roundRect(x + 0.5, y + 0.5, w - 0.8, h - 0.8, radius);
  ctx.stroke();
  ctx.restore();
}

/**
 * 1. Vẽ toàn bộ cụm Tiêu đề màn hình mở đầu (Title Screen)
 * Ba lớp logo bút chì trên nền trong suốt; chữ Canvas dự phòng khi ảnh chưa tải được.
 * @param {CanvasRenderingContext2D} ctx - Ngữ cảnh vẽ 2D
 * @param {number} centerX - Tọa độ X tâm màn hình (ví dụ: width / 2)
 * @param {number} centerY - Tọa độ Y tâm tiêu đề (gốc neo giữ)
 * @param {number} timeSec - Thời gian trôi qua tính bằng giây (phục vụ animation nhấp nhô)
 */
function graphiteNoise(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

// Redraw at seven drawings per second. All offsets are ink only; collision geometry stays fixed.
export function drawDoodlePlatform(ctx, platform, screenY, timeSec = 0, identity = 0) {
  const seed = platform.y * 13.7 + identity * 97;
  const drawing = Math.floor(timeSec * 7 + graphiteNoise(seed) * 4);
  const noise = (n) => graphiteNoise(seed + drawing * 173 + n * 31);
  const palette = {
    standard: ['#a4cf62', '#5b793c'],
    moving: ['#82cbe0', '#397b91'],
    fragile: ['#c4bf9f', '#78715b'],
    bouncy: ['#bea0d7', '#75528f'],
  }[platform.type] || ['#a4cf62', '#5b793c'];
  const w = platform.width, h = platform.height;
  ctx.save();
  ctx.translate(platform.x, screenY);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const sections = platform.type === 'fragile' ? [[0, w * .48], [w * .54, w]] : [[0, w]];
  sections.forEach(([left, right], section) => {
    const points = [];
    const radius = Math.min(7, h / 2);
    // Slightly irregular rounded silhouette, held steady between drawings.
    for (let i = 0; i <= 8; i++) {
      points.push([left + radius + (right - left - radius * 2) * i / 8,
        (noise(i + section * 100) - .5) * 1.3]);
    }
    points.push([right - 1 + (noise(10) - .5) * .8, h * .25], [right, h * .65], [right - radius, h + (noise(11) - .5)]);
    for (let i = 8; i >= 0; i--) {
      points.push([left + radius + (right - left - radius * 2) * i / 8,
        h + (noise(20 + i + section * 100) - .5) * 1.5]);
    }
    points.push([left + 1, h * .75], [left, h * .35], [left + radius, 0]);
    if (platform.type === 'fragile') {
      // Keep the broken central seam recognisable on both halves.
      if (section === 0) points.splice(9, 3, [right - 3, h * .2], [right - 8, h * .45], [right - 1, h * .75], [right - radius, h]);
      else points.splice(points.length - 3, 3, [left + 7, h * .8], [left + 1, h * .55], [left + 8, h * .3], [left + radius, 0]);
    }
    const trace = () => {
      ctx.beginPath();
      ctx.moveTo(...points[0]);
      points.slice(1).forEach(point => ctx.lineTo(...point));
      ctx.closePath();
    };
    trace();
    ctx.fillStyle = palette[0];
    ctx.fill();
    ctx.save();
    ctx.clip();
    // Short uneven coloured-pencil hatching rather than a solid digital fill.
    for (let i = 0; i < 18; i++) {
      const x = left + noise(40 + i) * (right - left);
      const y = noise(70 + i) * h;
      ctx.strokeStyle = i % 3 ? palette[1] + '55' : '#fffde766';
      ctx.lineWidth = .6 + noise(90 + i) * 1.6;
      ctx.beginPath(); ctx.moveTo(x - 4, y + 2); ctx.lineTo(x + 5 + noise(120 + i) * 8, y - 3); ctx.stroke();
    }
    ctx.restore();
    // Pressure varies along the outline; a second broken pass leaves graphite grain.
    for (let i = 1; i < points.length; i++) {
      ctx.strokeStyle = `rgba(48,49,38,${.45 + noise(150 + i) * .4})`;
      ctx.lineWidth = .8 + noise(180 + i) * .9;
      ctx.beginPath(); ctx.moveTo(...points[i - 1]); ctx.lineTo(...points[i]); ctx.stroke();
    }
    ctx.strokeStyle = palette[1] + '88';
    ctx.lineWidth = .6;
    ctx.setLineDash([2, 3, 5, 2]);
    trace(); ctx.stroke(); ctx.setLineDash([]);
  });
  if (platform.type === 'bouncy') {
    ctx.strokeStyle = '#73582f'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    const mid = w / 2;
    ctx.moveTo(mid - 5, 2);
    for (let i = 0; i < 5; i++) ctx.lineTo(mid + (i % 2 ? -5 : 5) + (noise(220 + i) - .5) * .7, -i * 2);
    ctx.stroke();
    ctx.fillStyle = '#edd061'; ctx.fillRect(mid - 7, -10, 14, 3);
  }
  ctx.restore();
}

// Each drawing is held for ~130 ms: grain/pressure change on drawings, not render frames.
function charcoalStroke(ctx, points, drawing, strength = 1) {
  ctx.save();
  ctx.lineCap = 'butt';
  for (let index = 1; index < points.length; index += 1) {
    const [ax, ay] = points[index - 1], [bx, by] = points[index];
    const length = Math.hypot(bx - ax, by - ay);
    const nx = -(by - ay) / (length || 1), ny = (bx - ax) / (length || 1);
    const seed = drawing * 71 + index * 113;
    const pressure = .4 + .6 * graphiteNoise(seed);
    for (let pass = 0; pass < 3; pass += 1) {
      const offset = (graphiteNoise(seed + pass * 9) - .5) * 1.8;
      ctx.strokeStyle = `rgba(47,43,38,${(.16 + pressure * .24) * strength})`;
      ctx.lineWidth = .6 + pressure * 1.4;
      ctx.beginPath();
      ctx.moveTo(ax + nx * offset, ay + ny * offset);
      ctx.lineTo(bx + nx * offset, by + ny * offset);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(47,43,38,${(.15 + pressure * .35) * strength})`;
    for (let grain = 0; grain < length * 1.5; grain += 1) {
      const t = graphiteNoise(seed + grain * 17);
      const spread = (graphiteNoise(seed + grain * 31) - .5) * (3 + pressure * 2);
      const size = .35 + graphiteNoise(seed + grain * 43) * .65;
      ctx.fillRect(ax + (bx - ax) * t + nx * spread, ay + (by - ay) * t + ny * spread, size, size * .7);
    }
  }
  ctx.restore();
}

export function drawDoodleTitle(ctx, centerX, centerY, timeSec = 0) {
  if (drawTitleLogo(ctx, centerX, centerY, timeSec)) return;
  ctx.save();

  // Chữ dự phòng cũng giữ từng nhịp, đồng bộ với cache stop motion.
  const floatY = Math.sin(Math.floor(timeSec * 7.5) / 7.5 * 2.5) * 2;
  const y = centerY + floatY;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // --- PHẦN 1: Dòng chữ phụ phiên bản trường USTH ---
  ctx.font = 'bold 14px "Patrick Hand", "Comic Sans MS", cursive, sans-serif';
  ctx.fillStyle = '#30302d';
  ctx.fillText('★ USTH WEB PROJECT ★', centerX, y - 54);

  // --- PHẦN 3: Bóng đổ bút chì của tiêu đề chính (Shadow) ---
  // Lệch góc (+3px, +3px), dùng màu be sẫm (#d3c9b7) để tạo cảm giác nét than chì chìm
  ctx.font = 'bold 64px "Patrick Hand", "Fredoka", "Comic Sans MS", cursive, sans-serif';
  ctx.fillStyle = '#d3c9b7';
  ctx.fillText('DOODLE JUMP', centerX + 3, y + 3);

  // --- PHẦN 4: Thân chữ chính "DOODLE JUMP" ---
  ctx.fillStyle = '#30302d';
  ctx.fillText('DOODLE JUMP', centerX, y);

  // --- PHẦN 5: Nét chì than, giữ từng hình vẽ như stop motion ---
  const drawing = Math.floor(timeSec * 7.5);
  const startX = centerX - 160;
  const endX = centerX + 160;
  const points = [];
  for (let i = 0; i <= 40; i++) {
    const px = startX + i / 40 * (endX - startX);
    const py = centerY + 42 + Math.sin(i * .65 + drawing * .19) * 2
      + (graphiteNoise(drawing * 13 + i * 19) - .5) * 1.3;
    points.push([px, py]);
  }
  charcoalStroke(ctx, points, drawing, 1.15);

  ctx.restore();
}

/**
 * 2. Vẽ nút bấm "BẮT ĐẦU CHƠI" (Start Button)
 * Có hiệu ứng đập nhẹ theo nhịp thở (pulse) và đổi màu khi người chơi rê chuột vào (isHovered).
 * @param {CanvasRenderingContext2D} ctx - Ngữ cảnh vẽ 2D
 * @param {Object} btnBounds - Tọa độ và kích thước nút { x, y, width, height }
 * @param {boolean} isHovered - Trạng thái con trỏ chuột có đang nằm trên nút không
 * @param {number} timeSec - Thời gian hiện tại tính bằng giây
 */
export function drawDoodleStartButton(ctx, btnBounds, isHovered = false, timeSec = 0) {
  const { x, y, width, height } = btnBounds;
  ctx.save();

  const drawing = Math.floor(timeSec * 7.5);
  const pulse = (graphiteNoise(drawing * 17) - .5) * 4;
  const drawX = x - pulse / 2;
  const drawY = y - pulse / 2;
  const drawW = width + pulse;
  const drawH = height + pulse;

  // Transparent button: keep the paper grid visible through the charcoal outline.

  const outline = [];
  const radius = 7 + graphiteNoise(drawing * 41) * 3;
  const corners = [[drawX + drawW - radius, drawY + radius],
    [drawX + drawW - radius, drawY + drawH - radius],
    [drawX + radius, drawY + drawH - radius], [drawX + radius, drawY + radius]];
  const perimeter = [];
  for (let corner = 0; corner < 4; corner += 1) {
    const [cx, cy] = corners[corner];
    const angle = -Math.PI / 2 + corner * Math.PI / 2;
    const arcStart = [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    if (perimeter.length) {
      const [ax, ay] = perimeter[perimeter.length - 1];
      const count = Math.ceil(Math.hypot(arcStart[0] - ax, arcStart[1] - ay) / 12);
      for (let i = 1; i < count; i += 1) perimeter.push([ax + (arcStart[0] - ax) * i / count, ay + (arcStart[1] - ay) * i / count]);
    }
    for (let i = 0; i <= 5; i += 1) {
      const a = angle + i / 5 * Math.PI / 2;
      perimeter.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
    }
  }
  const [lastX, lastY] = perimeter[perimeter.length - 1];
  const [firstX, firstY] = perimeter[0];
  const closingCount = Math.ceil(Math.hypot(firstX - lastX, firstY - lastY) / 12);
  for (let i = 1; i < closingCount; i += 1) perimeter.push([lastX + (firstX - lastX) * i / closingCount, lastY + (firstY - lastY) * i / closingCount]);
  for (const [index, [px, py]] of perimeter.entries()) {
    outline.push([px + (graphiteNoise(drawing * 29 + index * 7) - .5) * 1.8,
      py + (graphiteNoise(drawing * 31 + index * 11) - .5) * 2.4]);
  }
  outline.push(outline[0]);
  charcoalStroke(ctx, outline, drawing + 101, (isHovered ? 1.3 : 1) * (.8 + graphiteNoise(drawing * 53) * .4));

  // 3. Chữ bên trong nút
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px "Patrick Hand", "Fredoka", "Comic Sans MS", cursive, sans-serif';
  const label = t('game.start_btn_canvas');
  let penX = x + width / 2 - ctx.measureText(label).width / 2;
  ctx.textAlign = 'left';
  for (const [index, letter] of Array.from(label).entries()) {
    const seed = drawing * 37 + index * 23;
    ctx.save();
    ctx.translate(penX + (graphiteNoise(seed + 13) - .5) * .65, y + height / 2 + 1 + (graphiteNoise(seed) - .5) * 2);
    ctx.rotate((graphiteNoise(seed + 7) - .5) * .045);
    ctx.fillStyle = `rgba(47,43,38,${.68 + graphiteNoise(seed + 3) * .3})`;
    ctx.fillText(letter, 0, 0);
    ctx.fillStyle = 'rgba(47,43,38,.18)';
    ctx.fillText(letter, .45, -.3);
    ctx.restore();
    penX += ctx.measureText(letter).width;
  }

  ctx.restore();
}

/**
 * 3. Hướng dẫn bấm phím ở góc dưới bên phải màn hình (Arrow Key Tutorial Guide)
 * Hiển thị lời nhắc "Bấm phím để xuất phát!" cùng 2 ô phím [ ← / A ] và [ → / D ] nhún nhảy.
 * @param {CanvasRenderingContext2D} ctx - Ngữ cảnh vẽ 2D
 * @param {number} canvasWidth - Chiều rộng Canvas
 * @param {number} canvasHeight - Chiều cao Canvas
 * @param {number} timeSec - Thời gian phục vụ nhịp rung
 */
export function drawDoodleArrowGuide(ctx, canvasWidth, canvasHeight, timeSec = 0) {
  ctx.save();
  const x = canvasWidth - 230, y = canvasHeight - 65;
  const drawing = Math.floor(timeSec * 7.5);
  drawPencilLabel(ctx, t('game.press_key_start'), x + 100, y - 14, drawing, 15);
  drawKeyBox(ctx, x + 55, y + 12, '← / A', drawing + 53);
  drawKeyBox(ctx, x + 145, y + 12, '→ / D', drawing + 107);
  ctx.restore();
}

function drawPencilLabel(ctx, label, cx, cy, drawing, size) {
  ctx.font = `bold ${size}px "Patrick Hand", "Comic Sans MS", cursive, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let penX = cx - ctx.measureText(label).width / 2;
  for (const [i, letter] of Array.from(label).entries()) {
    const seed = drawing * 37 + i * 23;
    ctx.save();
    ctx.translate(penX + (graphiteNoise(seed) - .5) * .5, cy + (graphiteNoise(seed + 7) - .5) * 1.4);
    ctx.rotate((graphiteNoise(seed + 13) - .5) * .035);
    ctx.fillStyle = `rgba(47,43,38,${.7 + graphiteNoise(seed + 19) * .28})`;
    ctx.fillText(letter, 0, 0);
    ctx.restore();
    penX += ctx.measureText(letter).width;
  }
}

function drawKeyBox(ctx, cx, cy, label, drawing) {
  const w = 64, h = 32, radius = 6;
  const points = [];
  const corners = [[cx+w/2-radius,cy-h/2+radius], [cx+w/2-radius,cy+h/2-radius],
    [cx-w/2+radius,cy+h/2-radius], [cx-w/2+radius,cy-h/2+radius]];
  corners.forEach(([x,y], corner) => {
    for (let i=0; i<=5; i++) {
      const angle=-Math.PI/2 + corner*Math.PI/2 + i/5*Math.PI/2;
      const seed=drawing*31+corner*47+i*13;
      points.push([x+Math.cos(angle)*radius+(graphiteNoise(seed)-.5)*1.4,
        y+Math.sin(angle)*radius+(graphiteNoise(seed+7)-.5)*1.3]);
    }
  });
  points.push(points[0]);
  // Transparent interior, pencil pressure and grain held for each stop-motion drawing.
  charcoalStroke(ctx, points, drawing, .95);
  drawPencilLabel(ctx, label, cx, cy, drawing, 14);
}

/**
 * 4. Vẽ Nhân vật hình hạt đậu Doodle (Character Renderer)
 * Vẽ nhân vật người chơi hoặc bot với: Biển tên, tam giác chỉ định, mắt to liếc nhìn, mũi và chân nhảy.
 * @param {CanvasRenderingContext2D} ctx - Ngữ cảnh vẽ 2D
 * @param {Object} char - Dữ liệu nhân vật { x, y, width, height, direction, vx, name... }
 * @param {number} cameraY - Tọa độ cuộn của camera
 * @param {number} timeSec - Thời gian phục vụ hoạt cảnh chân nhún
 * @param {boolean} isPlayer - Có phải người chơi chính không (để vẽ biển YOU / tam giác chỉ định)
 * @param {string} color - Mã màu trang phục nhân vật
 */
export function drawDoodleCharacter(ctx, char, cameraY, timeSec = 0, isPlayer = true, color = '#e8ad48') {
  // Quy đổi tọa độ thế giới sang tọa độ hiển thị trên màn hình Canvas
  const screenX = char.x;
  const screenY = char.y - cameraY;
  const w = char.width;
  const h = char.height;

  ctx.save();

  // 1. Biển tên định danh phía trên đầu nhân vật
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = isPlayer ? '#166534' : '#1e293b';
  const label = isPlayer ? t('game.player_you') : (char.name || 'Bot');
  ctx.fillText(label, screenX + w / 2, screenY - 4);

  // 2. Mũi tên tam giác màu xanh lá chỉ định vị trí người chơi
  if (isPlayer) {
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(screenX + w / 2, screenY - 2);
    ctx.lineTo(screenX + w / 2 - 4, screenY - 8);
    ctx.lineTo(screenX + w / 2 + 4, screenY - 8);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Thân nhân vật dạng hạt đậu bo tròn góc lớn (radius = 14px)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(screenX, screenY, w, h, 14);
  ctx.fill();

  // Viền phác thảo thân màu tối
  ctx.strokeStyle = '#1a3325';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. Mắt hoạt hình to tròn ngộ nghĩnh
  // Xác định hướng nhìn: liếc sang phải nếu đang đi sang phải
  const isFacingRight = (char.direction === 'right' || char.vx >= 0);
  const eyeOffsetX = isFacingRight ? 6 : 0;

  // Lòng trắng mắt
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(screenX + 11 + eyeOffsetX, screenY + 12, 4.5, 0, Math.PI * 2);
  ctx.arc(screenX + 22 + eyeOffsetX, screenY + 12, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Con ngươi đen liếc theo hướng di chuyển
  ctx.fillStyle = '#0f172a';
  const pupilShift = isFacingRight ? 1.5 : -1.5;
  ctx.beginPath();
  ctx.arc(screenX + 11 + eyeOffsetX + pupilShift, screenY + 12, 2.2, 0, Math.PI * 2);
  ctx.arc(screenX + 22 + eyeOffsetX + pupilShift, screenY + 12, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // 5. Mũi dài dạng ống đặc trưng của Doodle Jump
  ctx.fillStyle = color;
  ctx.beginPath();
  const snoutX = isFacingRight ? screenX + w - 2 : screenX - 6;
  ctx.roundRect(snoutX, screenY + 16, 8, 7, 3);
  ctx.fill();
  ctx.stroke();

  // 6. Chân nhỏ nhún nhảy theo nhịp chạy
  const legOffset = Math.sin(timeSec * 16) * 2;
  ctx.fillStyle = '#374151';
  ctx.beginPath();
  ctx.arc(screenX + 10, screenY + h + legOffset, 3.5, 0, Math.PI * 2);
  ctx.arc(screenX + w - 10, screenY + h - legOffset, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 5. Hiệu ứng Rèm gạt chuyển cảnh (Wipe Transition Curtain)
 * Trang giấy ấm với mép xé và nét chì che kín thời điểm reset, rồi trượt sang phải.
 * @param {CanvasRenderingContext2D} ctx - Ngữ cảnh vẽ 2D
 * @param {number} progress - Tiến độ chuyển cảnh từ 0.0 (mở) -> 0.5 (đóng kín) -> 1.0 (mở hết)
 * @param {number} canvasWidth - Chiều rộng Canvas
 * @param {number} canvasHeight - Chiều cao Canvas
 */
export function drawDoodleWipe(ctx, progress, canvasWidth, canvasHeight) {
  if (progress <= 0 || progress >= 1) return;
  const ease = t => t * t * (3 - 2 * t);
  const sheetWidth = canvasWidth + 96;
  const left = progress < .44
    ? -sheetWidth + (sheetWidth - 48) * ease(progress / .44)
    : progress > .56
      ? -48 + (canvasWidth + 96) * ease((progress - .56) / .44)
      : -48;
  const right = left + sheetWidth;
  const edgeX = y => right + Math.sin(y * .17) * 3 + Math.sin(y * .047) * 2;
  ctx.save();
  // Narrow warm shadow along the moving page edge, no opaque dark curtain.
  ctx.fillStyle = 'rgba(94,73,43,.12)';
  ctx.fillRect(left - 9, 0, sheetWidth + 18, canvasHeight);
  ctx.beginPath();
  ctx.moveTo(left, -8);
  ctx.lineTo(edgeX(-8), -8);
  for (let y = 0; y <= canvasHeight + 12; y += 8) ctx.lineTo(edgeX(y), y);
  ctx.lineTo(left, canvasHeight + 12);
  ctx.closePath();
  ctx.fillStyle = '#faf4e8';
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(127,151,161,.18)';
  ctx.lineWidth = .7;
  ctx.beginPath();
  for (let y = 0; y <= canvasHeight; y += 22) { ctx.moveTo(left, y); ctx.lineTo(right + 8, y); }
  for (let x = left; x < right; x += 22) { ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(177,88,70,.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(left + 98, 0); ctx.lineTo(left + 98, canvasHeight); ctx.stroke();
  // A few graphite hatch marks give the page edge a drawn, tactile finish.
  ctx.strokeStyle = '#807363';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let y = 0; y < canvasHeight; y += 7) {
    ctx.moveTo(edgeX(y) - 6, y); ctx.lineTo(edgeX(y) - 14, y + 5);
  }
  ctx.stroke();
  ctx.strokeStyle = '#655d50';
  ctx.beginPath(); ctx.moveTo(edgeX(0) - 1, 0);
  for (let y = 8; y <= canvasHeight + 8; y += 8) ctx.lineTo(edgeX(y) - 1, y);
  ctx.stroke();
  const centerX = left + sheetWidth / 2;
  ctx.fillStyle = '#554c3e';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '32px "Doodle Hand", "Comic Sans MS", cursive';
  ctx.fillText(t('game.new_page'), centerX, canvasHeight / 2 - 7);
  ctx.strokeStyle = '#a2844b';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(centerX - 97, canvasHeight / 2 + 22);
  ctx.quadraticCurveTo(centerX + 8, canvasHeight / 2 + 17, centerX + 103, canvasHeight / 2 + 23);
  ctx.stroke();
  ctx.restore();
}
