import { expect, it } from 'vitest';
import { sampleIntroCameraMotion } from '../game/intro-camera-motion.js';

it.each([
  [0, 0, 0.774195],
  [0.3, 9.183718, 72.702049],
  [0.6, 53.625664, 205.353072],
  [0.9, 93.195535, 59.818528],
  [1.2, 100, -4.006407],
])('matches supplied value and signed velocity at %s seconds', (time, value, velocity) => {
  const sample = sampleIntroCameraMotion(time / 1.2);
  expect(sample.value * 100).toBeCloseTo(value, 3);
  expect(sample.velocity * 100 / 1.2).toBeCloseTo(velocity, 2);
});

it('clamps only outside keyframes and preserves overshoot and signed return velocity', () => {
  expect(sampleIntroCameraMotion(-1)).toEqual({ value: 0, velocity: 0 });
  expect(sampleIntroCameraMotion(2)).toEqual({ value: 1, velocity: 0 });
  const peak = sampleIntroCameraMotion(1.17011 / 1.2);
  expect(peak.value * 100).toBeCloseTo(100.060694, 3);
  expect(sampleIntroCameraMotion(1.19 / 1.2).velocity).toBeLessThan(0);
  let maximum = 0;
  for (let frame = 0; frame <= 72; frame += 1) {
    const sample = sampleIntroCameraMotion(frame / 72);
    expect(sample.value).toBeGreaterThanOrEqual(0);
    expect(sample.value).toBeLessThanOrEqual(1.000607);
    maximum = Math.max(maximum, sample.value);
  }
  expect(maximum).toBeGreaterThan(1);
});
