/**
 * Doodle Art & Hand-Drawn Canvas Rendering Utilities
 * Renders sketch-style title, start button, arrow hints, and characters
 */

// Helper to draw a slightly jittered, hand-drawn straight line
export function drawSketchLine(ctx, x1, y1, x2, y2, jitter = 1.2) {
  const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * jitter;
  const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * jitter;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(midX, midY, x2, y2);
  ctx.stroke();
}

// Helper to draw a hand-drawn sketch box
export function drawSketchRect(ctx, x, y, w, h, radius = 6) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();

  // Second pass with slight offset for sketchy feel
  ctx.save();
  ctx.globalAlpha *= 0.6;
  ctx.beginPath();
  ctx.roundRect(x + 0.5, y + 0.5, w - 0.8, h - 0.8, radius);
  ctx.stroke();
  ctx.restore();
}

/**
 * 1. Title Screen: Large Doodle Jump Handwritten Title
 */
export function drawDoodleTitle(ctx, centerX, centerY, timeSec = 0) {
  ctx.save();

  // Subtle breathing/floating motion
  const floatY = Math.sin(timeSec * 2.5) * 4;
  const y = centerY + floatY;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Subtitle / edition pill
  ctx.font = 'bold 14px "Patrick Hand", "Comic Sans MS", cursive, sans-serif';
  ctx.fillStyle = '#2d5a43';
  ctx.fillText('★ USTH MULTIPLAYER EDITION ★', centerX, y - 54);

  // Decorative doodle stars/springs
  ctx.strokeStyle = '#e67e22';
  ctx.lineWidth = 2;
  // Left doodle spring
  ctx.beginPath();
  ctx.arc(centerX - 180, y, 14, 0, Math.PI * 1.8);
  ctx.stroke();
  // Right doodle star
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath();
  ctx.arc(centerX + 180, y - 8, 6, 0, Math.PI * 2);
  ctx.fill();

  // Main Title Shadow (hand-drawn pencil hatch)
  ctx.font = 'bold 64px "Patrick Hand", "Fredoka", "Comic Sans MS", cursive, sans-serif';
  ctx.fillStyle = '#d3c9b7';
  ctx.fillText('DOODLE JUMP', centerX + 3, y + 3);

  // Main Title Body
  ctx.fillStyle = '#224a37';
  ctx.fillText('DOODLE JUMP', centerX, y);

  // Hand-drawn underline squiggle
  ctx.strokeStyle = '#e67e22';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const startX = centerX - 160;
  const endX = centerX + 160;
  for (let i = 0; i <= 32; i++) {
    const px = startX + (i / 32) * (endX - startX);
    const py = y + 42 + Math.sin(i * 0.8 + timeSec * 4) * 3;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * 2. Small Start Button below Title
 */
export function drawDoodleStartButton(ctx, btnBounds, isHovered = false, timeSec = 0) {
  const { x, y, width, height } = btnBounds;
  ctx.save();

  const pulse = Math.sin(timeSec * 4) * 2;
  const drawX = x - pulse / 2;
  const drawY = y - pulse / 2;
  const drawW = width + pulse;
  const drawH = height + pulse;

  // Button background (warm parchment / green tint on hover)
  ctx.fillStyle = isHovered ? '#43765c' : '#ffffff';
  ctx.beginPath();
  ctx.roundRect(drawX, drawY, drawW, drawH, 10);
  ctx.fill();

  // Hand-drawn sketch border
  ctx.strokeStyle = isHovered ? '#1e3c2e' : '#2b5240';
  ctx.lineWidth = 2.5;
  drawSketchRect(ctx, drawX, drawY, drawW, drawH, 10);

  // Button Text + Play Icon
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px "Patrick Hand", "Fredoka", "Comic Sans MS", cursive, sans-serif';
  ctx.fillStyle = isHovered ? '#ffffff' : '#224a37';
  ctx.fillText('▶ BẮT ĐẦU CHƠI', x + width / 2, y + height / 2 + 1);

  ctx.restore();
}

/**
 * 3. Bottom-Right Frameless Doodle Arrow Key Tutorial Guide
 */
export function drawDoodleArrowGuide(ctx, canvasWidth, canvasHeight, timeSec = 0) {
  ctx.save();

  const marginX = canvasWidth - 230;
  const marginY = canvasHeight - 65;
  const pulse = Math.sin(timeSec * 5) * 3;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Cute sketch prompt text above
  ctx.font = 'bold 15px "Patrick Hand", "Comic Sans MS", cursive, sans-serif';
  ctx.fillStyle = '#234f3a';
  ctx.fillText('Bấm phím để xuất phát!', marginX + 100, marginY - 14);

  // Draw Key [ ← ]
  drawKeyBox(ctx, marginX + 55 + pulse, marginY + 12, '← / A');
  // Draw Key [ → ]
  drawKeyBox(ctx, marginX + 145 - pulse, marginY + 12, '→ / D');

  ctx.restore();
}

function drawKeyBox(ctx, cx, cy, label) {
  const w = 64;
  const h = 32;
  const x = cx - w / 2;
  const y = cy - h / 2;

  ctx.fillStyle = '#f8fdf9';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  ctx.strokeStyle = '#275841';
  ctx.lineWidth = 2;
  drawSketchRect(ctx, x, y, w, h, 6);

  ctx.font = 'bold 14px monospace, sans-serif';
  ctx.fillStyle = '#1b3d2d';
  ctx.fillText(label, cx, cy + 1);
}

/**
 * 4. Doodle Character Renderer with Eyes, Nose/Snout and Name Badge
 */
export function drawDoodleCharacter(ctx, char, cameraY, timeSec = 0, isPlayer = true, color = '#e8ad48') {
  const screenX = char.x;
  const screenY = char.y - cameraY;
  const w = char.width;
  const h = char.height;

  ctx.save();

  // Name badge above character
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = isPlayer ? '#166534' : '#1e293b';
  const label = isPlayer ? 'YOU' : (char.name || 'Bot');
  ctx.fillText(label, screenX + w / 2, screenY - 4);

  // Little marker triangle above player
  if (isPlayer) {
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(screenX + w / 2, screenY - 2);
    ctx.lineTo(screenX + w / 2 - 4, screenY - 8);
    ctx.lineTo(screenX + w / 2 + 4, screenY - 8);
    ctx.closePath();
    ctx.fill();
  }

  // Character body (rounded bean shape)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(screenX, screenY, w, h, 14);
  ctx.fill();

  // Doodle sketch body outline
  ctx.strokeStyle = '#1a3325';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Big cute cartoon eyes
  const isFacingRight = (char.direction === 'right' || char.vx >= 0);
  const eyeOffsetX = isFacingRight ? 6 : 0;

  // Eyes whites
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(screenX + 11 + eyeOffsetX, screenY + 12, 4.5, 0, Math.PI * 2);
  ctx.arc(screenX + 22 + eyeOffsetX, screenY + 12, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eyes pupils
  ctx.fillStyle = '#0f172a';
  const pupilShift = isFacingRight ? 1.5 : -1.5;
  ctx.beginPath();
  ctx.arc(screenX + 11 + eyeOffsetX + pupilShift, screenY + 12, 2.2, 0, Math.PI * 2);
  ctx.arc(screenX + 22 + eyeOffsetX + pupilShift, screenY + 12, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Little doodle snout / nose
  ctx.fillStyle = color;
  ctx.beginPath();
  const snoutX = isFacingRight ? screenX + w - 2 : screenX - 6;
  ctx.roundRect(snoutX, screenY + 16, 8, 7, 3);
  ctx.fill();
  ctx.stroke();

  // Little bouncing feet
  const legOffset = Math.sin(timeSec * 16) * 2;
  ctx.fillStyle = '#374151';
  ctx.beginPath();
  ctx.arc(screenX + 10, screenY + h + legOffset, 3.5, 0, Math.PI * 2);
  ctx.arc(screenX + w - 10, screenY + h - legOffset, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 5. Hand-Drawn Wipe Transition Curtain
 */
export function drawDoodleWipe(ctx, progress, canvasWidth, canvasHeight) {
  if (progress <= 0 || progress >= 1) return;

  ctx.save();
  // Wipe from left to right with ragged pencil edge
  const coverage = progress <= 0.5 ? progress * 2 : (1 - progress) * 2;
  const wipeX = canvasWidth * coverage;

  // Draw dark green wipe curtain
  ctx.fillStyle = '#0f241a';
  ctx.fillRect(0, 0, wipeX, canvasHeight);

  // Ragged sketch leading edge
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let y = 0; y <= canvasHeight; y += 10) {
    const jitterX = wipeX + (Math.sin(y * 0.1) * 8) + ((y % 20 === 0) ? 6 : -6);
    if (y === 0) ctx.moveTo(jitterX, y);
    else ctx.lineTo(jitterX, y);
  }
  ctx.stroke();

  ctx.restore();
}
