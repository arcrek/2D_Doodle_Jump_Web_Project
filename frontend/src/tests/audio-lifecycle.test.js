import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { sound } from '../game/audio.js';

let original;
let hidden;
let context;

beforeEach(() => {
  original = { ...sound };
  hidden = false;
  vi.useFakeTimers();
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  context = {
    state: 'running', currentTime: 0,
    suspend: vi.fn(() => { context.state = 'suspended'; return Promise.resolve(); }),
    resume: vi.fn(() => { context.state = 'running'; return Promise.resolve(); }),
  };
  sound.ctx = context;
  sound.enabled = true;
  sound.bgmPlaying = false;
  sound.schedulerTimer = null;
  sound.resumeBGMWhenVisible = false;
  sound.preserveBGMPositionOnVisibility = false;
  sound.bgmGain = sound.menuGain = sound.gameplayGain = null;
  vi.spyOn(sound, 'ensureContext').mockImplementation(() => {});
  vi.spyOn(sound, 'scheduleLoop').mockImplementation(() => {});
});

afterEach(() => {
  sound.stopBGM();
  vi.restoreAllMocks();
  vi.useRealTimers();
  Object.assign(sound, original);
});

function visibility(value) {
  hidden = value;
  document.dispatchEvent(new Event('visibilitychange'));
}

it('hide stops the music scheduler; repeated hide/show resumes exactly one scheduler', () => {
  sound.startBGM();
  expect(vi.getTimerCount()).toBe(1);
  visibility(true);
  visibility(true);
  expect(vi.getTimerCount()).toBe(0);
  expect(context.suspend).toHaveBeenCalledTimes(1);
  expect(sound.isBGMPlaying()).toBe(false);
  visibility(false);
  visibility(false);
  expect(vi.getTimerCount()).toBe(1);
  expect(context.resume).toHaveBeenCalledTimes(1);
  expect(sound.isBGMPlaying()).toBe(true);
  sound.startBGM();
  expect(vi.getTimerCount()).toBe(1);
});

it('music requested while hidden starts only when visible', () => {
  context.currentTime = 1;
  sound.currentStep = 42;
  sound.nextStepTime = 1.1;
  visibility(true);
  sound.startBGM();
  expect(sound.isBGMPlaying()).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
  visibility(false);
  expect(sound.isBGMPlaying()).toBe(true);
  expect(vi.getTimerCount()).toBe(1);
  expect(sound.currentStep).toBe(0);
  expect(sound.nextStepTime).toBeCloseTo(1.05);
});

it('mute while hidden keeps music stopped after show and unmute creates one scheduler', () => {
  sound.startBGM();
  visibility(true);
  expect(sound.toggleSound()).toBe(false);
  visibility(false);
  expect(sound.enabled).toBe(false);
  expect(sound.isBGMPlaying()).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
  expect(context.resume).not.toHaveBeenCalled();
  expect(sound.toggleSound()).toBe(true);
  expect(vi.getTimerCount()).toBe(1);
});

it('stop while hidden cancels pending resume and a quiet tab stays quiet', () => {
  sound.startBGM();
  visibility(true);
  sound.stopBGM();
  visibility(false);
  expect(sound.isBGMPlaying()).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
  visibility(true);
  visibility(false);
  expect(sound.isBGMPlaying()).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});

it('hide/show preserves the current musical phrase instead of rewinding it', () => {
  context.currentTime = 1;
  sound.startBGM();
  sound.currentStep = 42;
  sound.nextStepTime = 1.1;
  visibility(true);
  visibility(true);
  expect(vi.getTimerCount()).toBe(0);
  expect(sound.currentStep).toBe(42);
  expect(sound.nextStepTime).toBe(1.1);
  visibility(false);
  visibility(false);
  expect(sound.currentStep).toBe(42);
  expect(sound.nextStepTime).toBe(1.1);
  expect(sound.isBGMPlaying()).toBe(true);
  expect(context.resume).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(1);
});
