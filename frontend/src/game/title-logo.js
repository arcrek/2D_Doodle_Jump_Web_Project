import { TITLE_LOGO_PATH, drawSprite } from './sprites.js';

// Transparent artwork is sampled as three separate held pencil drawings.
export const TITLE_LOGO = {
  width: 2103,
  height: 748,
  bounds: [90, 108, 1930, 552],
  layers: [
    { name: 'subtitle', rect: [90, 108, 1930, 102] },
    { name: 'letters', rect: [90, 220, 1930, 319] },
    { name: 'underline', rect: [90, 540, 1930, 120] },
  ],
};

const POSES = [[0, 0, 0], [1.2, -.6, .002], [-.7, .8, -.0025], [.5, -.9, .001], [-1, .3, -.0015], [.3, .7, .002]];

export function drawTitleLogo(ctx, centerX, centerY, timeSec = 0) {
  const [cropX, cropY, cropWidth, cropHeight] = TITLE_LOGO.bounds;
  const width = Math.min(650, Math.max(1, centerX * 2 - 48), cropWidth / cropHeight * 140);
  const scale = width / cropWidth;
  const left = centerX - width / 2 - cropX * scale;
  const top = centerY - 20 - cropHeight * scale / 2 - cropY * scale;
  const drawing = Math.floor(timeSec * 7.5);
  let ready = true;
  TITLE_LOGO.layers.forEach(({ rect }, index) => {
    const [x, y, w, h] = rect;
    const [dx, dy, angle] = POSES[(drawing + index * 2) % POSES.length];
    ctx.save();
    ctx.translate(left + (x + w / 2) * scale + dx, top + (y + h / 2) * scale + dy);
    ctx.rotate(angle);
    ready = drawSprite(ctx, TITLE_LOGO_PATH, -w * scale / 2, -h * scale / 2, w * scale, h * scale, rect) && ready;
    ctx.restore();
  });
  return ready;
}
