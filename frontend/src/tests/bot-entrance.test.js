import { afterEach, expect, it, vi } from 'vitest';
import { BOT_ENTRANCE_PROFILES, sampleBotEntrance, renderBotEntranceBackground, renderBotEntranceImpact, renderBotEntranceName } from '../game/bot-entrance.js';
import { soundManager } from '../game/audio.js';
const { drawSprite } = vi.hoisted(() => ({ drawSprite: vi.fn(() => true) }));
vi.mock('../game/sprites.js', async importOriginal => ({ ...await importOriginal(), drawSprite }));
const entry = { type: 'STANDARD', side: 'left', startMs: 8000, name: 'Thầy Việt', impactWorldPosition: { x: 100, y: -500 } };

afterEach(() => { vi.restoreAllMocks(); drawSprite.mockClear(); });

function drawingContext() {
  return Object.fromEntries(['save', 'restore', 'translate', 'rotate', 'scale', 'beginPath', 'closePath', 'clip', 'moveTo', 'lineTo', 'fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'ellipse'].map(name => [name, vi.fn()]));
}

it.each(['left', 'right'])('dải %s crop cận mắt trong mask và phục hồi clip trước gameplay', side => {
  const current = { ...entry, side };
  const before = structuredClone(current);
  const ctx = drawingContext();
  renderBotEntranceBackground(ctx, current, sampleBotEntrance(current, 8500), 960, 540);
  expect(ctx.clip).toHaveBeenCalledOnce();
  expect(ctx.clip.mock.invocationCallOrder[0]).toBeLessThan(drawSprite.mock.invocationCallOrder.at(-1));
  expect(ctx.restore).toHaveBeenCalledTimes(2);
  expect(drawSprite.mock.invocationCallOrder.at(-1)).toBeLessThan(ctx.restore.mock.invocationCallOrder[0]);
  expect(ctx.save).toHaveBeenCalledTimes(2);
  expect(current).toEqual(before);
  const [, , , , w, h, crop] = drawSprite.mock.calls.at(-1);
  expect(w / h).toBeCloseTo(crop[2] / crop[3]);
  expect(crop[3]).toBeLessThan(300);
});

it('crop bốn ảnh giữ đường mắt, không dùng lại crop toàn thân', () => {
  const eyeCenters = { NOVICE: [670, 468], STANDARD: [570, 535], SPEEDRUNNER: [700, 605], PERFECT: [715, 508] };
  for (const [type, profile] of Object.entries(BOT_ENTRANCE_PROFILES)) {
    const [x,y,w,h] = profile.crop;
    const [eyeX,eyeY] = eyeCenters[type];
    expect(eyeX).toBeGreaterThan(x);
    expect(eyeX).toBeLessThan(x+w);
    expect(eyeY).toBeGreaterThan(y);
    expect(eyeY).toBeLessThan(y+h);
    expect(w/h).toBeGreaterThan(2);
  }
});

it.each(['left','right'])('dải %s bật mở và khép tại chỗ bằng các pose giữ hình', side => {
  const current = { ...entry, side };
  const sample = age => sampleBotEntrance(current, 8000 + age);
  expect(sample(0).scaleY).toBeLessThan(.1);
  expect(sample(120).scaleY).toBeGreaterThan(1);
  expect(sample(190).scaleY).toBeLessThan(1);
  expect(sample(500)).toMatchObject({ scaleX: 1, scaleY: 1, slide: 0, portraitAlpha: .78 });
  expect(sample(1100).scaleY).toBeLessThan(.1);
  expect(sample(1160).portraitAlpha).toBe(0);
  for (let age=0; age<1400; age+=13) expect(Math.abs(sample(age).slide)).toBeLessThan(.02);
  // Drawing transforms stay identical throughout every hold, including face and shards.
  for (const [start,end] of [[0,59],[60,119],[120,189],[190,269],[270,899],[900,969],[970,1039],[1040,1099],[1100,1159]]) {
    const drawing = age => {
      const ctx=drawingContext();
      renderBotEntranceBackground(ctx,current,sample(age),960,540);
      return { translate:ctx.translate.mock.calls,rotate:ctx.rotate.mock.calls,scale:ctx.scale.mock.calls,
        lines:ctx.lineTo.mock.calls,sprite:drawSprite.mock.calls.at(-1)?.slice(1) };
    };
    expect(drawing(end)).toEqual(drawing(start));
  }
  const held=sample(350);sample(1150);expect(sample(350)).toEqual(held);
});

it('reduced motion không trượt/xoay; mask và màu còn rõ, hết lifetime không vẽ', () => {
  const current = sampleBotEntrance(entry, 8500, true);
  expect(current).toMatchObject({ slide: 0, portraitTilt: 0, scaleX: 1, scaleY: 1, portraitAlpha: .78 });
  const ctx = drawingContext();
  renderBotEntranceBackground(ctx, entry, current, 390, 219);
  expect(ctx.rotate).toHaveBeenCalledExactlyOnceWith(0);
  expect(ctx.scale).toHaveBeenCalledExactlyOnceWith(1, 1);
  expect(ctx.clip).toHaveBeenCalledOnce();
  const expired = drawingContext();
  renderBotEntranceBackground(expired, entry, sampleBotEntrance(entry, 9400), 960, 540);
  expect(expired.save).not.toHaveBeenCalled();
});

it('ảnh lỗi có fallback tên trong mask, render replay không đổi hình học', () => {
  drawSprite.mockReturnValueOnce(false);
  const ctx = drawingContext();
  renderBotEntranceBackground(ctx, entry, sampleBotEntrance(entry, 8500), 960, 540);
  expect(ctx.fillText).toHaveBeenCalledWith(entry.name, 0, 0, expect.any(Number));
  const second = drawingContext();
  renderBotEntranceBackground(second, entry, sampleBotEntrance(entry, 8500), 960, 540);
  expect(second.lineTo.mock.calls).toEqual(ctx.lineTo.mock.calls);
});

it('chỉ vẽ trong lifetime, tên và impact cùng mốc đáp; sampling không sửa entry', () => {
  const snapshot = structuredClone(entry);
  expect(sampleBotEntrance(entry, 7999).active).toBe(false);
  expect(sampleBotEntrance(entry, 8000).active).toBe(true);
  expect(sampleBotEntrance(entry, 8899).nameAlpha).toBe(0);
  expect(sampleBotEntrance(entry, 8900)).toMatchObject({ impactAlpha: 1, nameAlpha: 1 });
  expect(sampleBotEntrance(entry, 9399).active).toBe(true);
  expect(sampleBotEntrance(entry, 9400)).toMatchObject({ active: false, portraitAlpha: 0, nameAlpha: 0, impactAlpha: 0 });
  expect(sampleBotEntrance({ ...entry, impactWorldPosition: null }, 8900).impactAlpha).toBe(0);
  expect(entry).toEqual(snapshot);
});

it('mọi hướng dùng chung cut-in và reduced motion giữ timing', () => {
  expect(sampleBotEntrance(entry, 8300).direction).toBe(-1);
  expect(sampleBotEntrance({ ...entry, side: 'right' }, 8300)).toEqual(sampleBotEntrance(entry, 8300));
  for (const age of [0, 150, 300, 900, 930, 1200, 1400]) {
    const normal = sampleBotEntrance(entry, 8000 + age);
    const reduced = sampleBotEntrance(entry, 8000 + age, true);
    expect(reduced).toMatchObject({ active: normal.active, impactAlpha: normal.impactAlpha, nameAlpha: normal.nameAlpha, slide: 0, shake: 0, anticipationAlpha: 0 });
  }
  expect(sampleBotEntrance({ ...entry, type: 'missing' }, 8300).profile).toBe(BOT_ENTRANCE_PROFILES.NOVICE);
  expect(new Set(Object.values(BOT_ENTRANCE_PROFILES).map(profile => profile.path)).size).toBe(4);
});

it('impact neo tọa độ world theo camera và reduced motion bỏ mảnh bay', () => {
  const ctx = drawingContext();
  renderBotEntranceImpact(ctx, entry, sampleBotEntrance(entry, 9000, true), -600);
  expect(ctx.ellipse.mock.calls[0].slice(0, 2)).toEqual([100, 100]);
  expect(ctx.ellipse).toHaveBeenCalledOnce();
  expect(ctx.fillRect).not.toHaveBeenCalled();
  expect(ctx.lineTo).not.toHaveBeenCalled();
  renderBotEntranceImpact(ctx, entry, sampleBotEntrance(entry, 9000), -600);
  expect(ctx.fillRect).toHaveBeenCalledTimes(16);
  expect(ctx.fillRect.mock.calls.length).toBeLessThanOrEqual(20);
  expect(ctx.ellipse).toHaveBeenCalledTimes(3);
  expect(ctx.lineTo).toHaveBeenCalledTimes(7);
});

it('tên dài được đo và co trong viewport hẹp', () => {
  const ctx = { save: vi.fn(), restore: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(), measureText: vi.fn(() => ({ width: 900 })) };
  renderBotEntranceName(ctx, { ...entry, name: 'Tên rất dài '.repeat(10) }, sampleBotEntrance(entry, 8900), 240, 520);
  expect(ctx.fillText.mock.calls[0][3]).toBe(192);
  expect(ctx.fillRect.mock.calls[0][2]).toBeLessThanOrEqual(240);
});

it.each([[undefined, 0.08], [2, 1], [0, 0], [-1, 0], [0.25, 0.25]])('synthetic impact volume %s giới hạn mức %s và dọn node', (volume, expected) => {
  const osc = { frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() };
  const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
  const manager = Object.create(Object.getPrototypeOf(soundManager));
  manager.config = { sfx: { botImpact: { volume } } };
  manager.synth = { ctx: { currentTime: 10, createOscillator: vi.fn(() => osc), createGain: vi.fn(() => gain), destination: {} } };
  manager.ensureContext = vi.fn();
  manager.isMuted = true;
  manager.playSyntheticSFX('botImpact');
  expect(manager.ensureContext).not.toHaveBeenCalled();
  manager.isMuted = false;
  manager.playSyntheticSFX('botImpact');
  if (expected === 0) {
    expect(manager.synth.ctx.createOscillator).not.toHaveBeenCalled();
    expect(manager.synth.ctx.createGain).not.toHaveBeenCalled();
    expect(gain.gain.setValueAtTime).not.toHaveBeenCalled();
    expect(osc.stop).not.toHaveBeenCalled();
    return;
  }
  expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(expected, 10);
  expect(osc.stop).toHaveBeenCalledWith(10.15);
  osc.onended();
  expect(osc.disconnect).toHaveBeenCalledOnce();
  expect(gain.disconnect).toHaveBeenCalledOnce();
});
