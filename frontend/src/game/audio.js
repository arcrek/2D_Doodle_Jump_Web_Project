/**
 * Synthetic Web Audio API Synthesizer for Doodle Jump Transition
 * Zero external audio files required. All sounds generated mathematically.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  ensureContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Soft wind whoosh during camera descent
  playWhoosh(duration = 1.2) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const now = this.ctx.currentTime;
      filter.frequency.setValueAtTime(150, now);
      filter.frequency.exponentialRampToValueAtTime(650, now + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(120, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.08, now + duration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch (_) {}
  }

  // Gentle small hop pop for idle warmup
  playHop(pitch = 380) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.6, now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (_) {}
  }

  // Powerful launch bounce chord when game starts
  playLaunch() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880]; // A-Major bright chord
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.25);

        gain.gain.setValueAtTime(0.08, now + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.03);
        osc.stop(now + 0.35);
      });
    } catch (_) {}
  }

  // Wipe transition sweep sound on restart
  playWipe() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.32);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch (_) {}
  }

  // Subtle game over tone
  playGameOver() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [320, 260, 210, 160].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0.08, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.12);
        osc.stop(now + (i + 1) * 0.12);
      });
    } catch (_) {}
  }
}

export const sound = new SoundEngine();

import { AUDIO_CONFIG } from './index.js';

export class SoundManager {
  constructor(config = AUDIO_CONFIG) {
    this.config = config;
    this.isMuted = false;
    this.bgmAudio = null;
    this.synth = new SoundEngine();
  }

  ensureContext() {
    this.synth.ensureContext();
  }

  playBGM(loop = true) {
    if (this.isMuted || typeof Audio === 'undefined') return;
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return;
    try {
      if (!this.bgmAudio && this.config?.bgm?.src) {
        this.bgmAudio = new Audio(this.config.bgm.src);
      }
      if (this.bgmAudio) {
        this.bgmAudio.loop = loop;
        this.bgmAudio.volume = this.config?.bgm?.volume ?? 0.5;
        this.bgmAudio.play().catch(() => {});
      }
    } catch (_) {}
  }

  stopBGM() {
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return;
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      } catch (_) {}
    }
  }

  playSFX(name) {
    if (this.isMuted) return;
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return;

    const sfxEntry = this.config?.sfx?.[name];
    if (typeof Audio !== 'undefined' && sfxEntry?.src) {
      try {
        const audio = new Audio(sfxEntry.src);
        audio.volume = Math.max(0, Math.min(1, sfxEntry.volume ?? 1));
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this.playSyntheticSFX(name);
          });
        }
        return;
      } catch (_) {
        this.playSyntheticSFX(name);
      }
    } else {
      this.playSyntheticSFX(name);
    }
  }

  playSyntheticSFX(name) {
    if (this.isMuted) return;
    this.ensureContext();
    const ctx = this.synth.ctx;
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      if (name === 'jump') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (name === 'rocket') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(580, now + 0.35);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (name === 'shield') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (name === 'lavaBurn') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.3);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (name === 'shieldBreak') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (_) {}
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.bgmAudio) {
      try {
        this.bgmAudio.volume = this.isMuted ? 0 : (this.config?.bgm?.volume ?? 0.5);
      } catch (_) {}
    }
    this.synth.enabled = !this.isMuted;
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
