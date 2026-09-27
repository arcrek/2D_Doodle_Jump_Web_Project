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
