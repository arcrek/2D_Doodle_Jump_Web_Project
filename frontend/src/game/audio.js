/**
 * Synthetic Web Audio API Synthesizer & Procedural Dual-Mode BGM for Doodle Jump
 * Zero external audio files required. All sounds and music generated mathematically.
 */

// Musical Tuning & Frequencies (Equal Temperament)
const NOTES = {
  // Octave 2
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, Gs2: 103.83, A2: 110.00, B2: 123.47,
  // Octave 3
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, Gs3: 207.65, A3: 220.00, B3: 246.94,
  // Octave 4
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, Gs4: 415.30, A4: 440.00, B4: 493.88,
  // Octave 5
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, Gs5: 830.61, A5: 880.00, B5: 987.77,
  // Octave 6
  C6: 1046.50, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98, A6: 1760.00, B6: 1975.53,
};

// 126 BPM Rhythm Clock (shared between Menu and Gameplay for sample-accurate crossfading)
const BPM = 126;
const SECONDS_PER_BEAT = 60 / BPM;
const SIXTEENTH_TIME = SECONDS_PER_BEAT / 4; // ~0.119s per step
const TOTAL_STEPS = 128; // 8 measures of 16 steps
const LOOKAHEAD_SEC = 0.12;
const SCHEDULE_INTERVAL_MS = 35;

// =============================================================================
// TRACK 1: MENU THEME (Outside Main Gameplay - Whimsical, Sunny, Laid-back)
// =============================================================================

const MENU_BASS_SCORE = {
  // Bar 0: C Major bouncy walk
  0: NOTES.C3, 4: NOTES.G2, 6: NOTES.C3, 8: NOTES.E3, 10: NOTES.G3, 12: NOTES.E3, 14: NOTES.B2,
  // Bar 1: A Minor
  16: NOTES.A2, 20: NOTES.E2, 22: NOTES.A2, 24: NOTES.C3, 26: NOTES.E3, 28: NOTES.C3, 30: NOTES.G2,
  // Bar 2: F Major
  32: NOTES.F2, 36: NOTES.C3, 38: NOTES.F3, 40: NOTES.A2, 42: NOTES.C3, 44: NOTES.A2, 46: NOTES.E2,
  // Bar 3: G Major
  48: NOTES.G2, 52: NOTES.D3, 54: NOTES.G3, 56: NOTES.B2, 58: NOTES.D3, 60: NOTES.G2, 62: NOTES.B2,
  // Bar 4: C Major
  64: NOTES.C3, 68: NOTES.G2, 70: NOTES.C3, 72: NOTES.E3, 74: NOTES.G3, 76: NOTES.E3, 78: NOTES.B2,
  // Bar 5: E Minor
  80: NOTES.E2, 84: NOTES.B2, 86: NOTES.E3, 88: NOTES.G2, 90: NOTES.B2, 92: NOTES.A2, 94: NOTES.C3,
  // Bar 6: D Minor
  96: NOTES.D3, 100: NOTES.A2, 102: NOTES.D3, 104: NOTES.F3, 106: NOTES.A3, 108: NOTES.F3, 110: NOTES.D3,
  // Bar 7: G7 turnaround
  112: NOTES.G2, 116: NOTES.D3, 118: NOTES.F3, 120: NOTES.G3, 122: NOTES.B2, 124: NOTES.D3, 126: NOTES.G2,
};

const MENU_CHORD_SCORE = {
  // Bar 0 (C)
  2: [NOTES.E4, NOTES.G4, NOTES.C5], 6: [NOTES.E4, NOTES.G4, NOTES.C5],
  10: [NOTES.E4, NOTES.G4, NOTES.C5], 14: [NOTES.E4, NOTES.G4, NOTES.C5],
  // Bar 1 (Am)
  18: [NOTES.C4, NOTES.E4, NOTES.A4], 22: [NOTES.C4, NOTES.E4, NOTES.A4],
  26: [NOTES.C4, NOTES.E4, NOTES.A4], 30: [NOTES.C4, NOTES.E4, NOTES.A4],
  // Bar 2 (F)
  34: [NOTES.C4, NOTES.F4, NOTES.A4], 38: [NOTES.C4, NOTES.F4, NOTES.A4],
  42: [NOTES.C4, NOTES.F4, NOTES.A4], 46: [NOTES.C4, NOTES.F4, NOTES.A4],
  // Bar 3 (G)
  50: [NOTES.B3, NOTES.D4, NOTES.G4], 54: [NOTES.B3, NOTES.D4, NOTES.G4],
  58: [NOTES.B3, NOTES.D4, NOTES.G4], 62: [NOTES.B3, NOTES.D4, NOTES.G4],
  // Bar 4 (C)
  66: [NOTES.E4, NOTES.G4, NOTES.C5], 70: [NOTES.E4, NOTES.G4, NOTES.C5],
  74: [NOTES.E4, NOTES.G4, NOTES.C5], 78: [NOTES.E4, NOTES.G4, NOTES.C5],
  // Bar 5 (Em)
  82: [NOTES.E4, NOTES.G4, NOTES.B4], 86: [NOTES.E4, NOTES.G4, NOTES.B4],
  90: [NOTES.E4, NOTES.G4, NOTES.B4], 94: [NOTES.E4, NOTES.G4, NOTES.B4],
  // Bar 6 (Dm)
  98: [NOTES.F4, NOTES.A4, NOTES.D5], 102: [NOTES.F4, NOTES.A4, NOTES.D5],
  106: [NOTES.F4, NOTES.A4, NOTES.D5], 110: [NOTES.F4, NOTES.A4, NOTES.D5],
  // Bar 7 (G7)
  114: [NOTES.F4, NOTES.G4, NOTES.B4], 118: [NOTES.F4, NOTES.G4, NOTES.B4],
  122: [NOTES.F4, NOTES.G4, NOTES.B4], 126: [NOTES.F4, NOTES.G4, NOTES.B4],
};

const MENU_MELODY_SCORE = {
  // Bar 0 (C)
  0: { freq: NOTES.E5, len: 2 },
  2: { freq: NOTES.G5, len: 2 },
  4: { freq: NOTES.C6, len: 2 },
  7: { freq: NOTES.G5, len: 1 },
  8: { freq: NOTES.E5, len: 2 },
  10: { freq: NOTES.D5, len: 1 },
  11: { freq: NOTES.E5, len: 1 },
  12: { freq: NOTES.G5, len: 2 },
  14: { freq: NOTES.A5, len: 2 },

  // Bar 1 (Am)
  16: { freq: NOTES.C6, len: 2 },
  18: { freq: NOTES.A5, len: 2 },
  20: { freq: NOTES.E5, len: 2 },
  23: { freq: NOTES.A5, len: 1 },
  24: { freq: NOTES.G5, len: 2 },
  26: { freq: NOTES.E5, len: 2 },
  28: { freq: NOTES.D5, len: 2 },
  30: { freq: NOTES.C5, len: 2 },

  // Bar 2 (F)
  32: { freq: NOTES.A5, len: 2 },
  34: { freq: NOTES.C6, len: 2 },
  36: { freq: NOTES.D6, len: 2 },
  39: { freq: NOTES.C6, len: 1 },
  40: { freq: NOTES.A5, len: 2 },
  42: { freq: NOTES.F5, len: 2 },
  44: { freq: NOTES.G5, len: 2 },
  46: { freq: NOTES.A5, len: 2 },

  // Bar 3 (G)
  48: { freq: NOTES.B5, len: 2 },
  50: { freq: NOTES.G5, len: 2 },
  52: { freq: NOTES.D6, len: 2 },
  55: { freq: NOTES.B5, len: 1 },
  56: { freq: NOTES.G5, len: 2 },
  58: { freq: NOTES.A5, len: 2 },
  60: { freq: NOTES.B5, len: 2 },
  62: { freq: NOTES.D6, len: 2 },

  // Bar 4 (C)
  64: { freq: NOTES.E6, len: 2 },
  66: { freq: NOTES.D6, len: 2 },
  68: { freq: NOTES.C6, len: 2 },
  71: { freq: NOTES.G5, len: 1 },
  72: { freq: NOTES.A5, len: 2 },
  74: { freq: NOTES.C6, len: 2 },
  76: { freq: NOTES.E6, len: 2 },
  78: { freq: NOTES.G6, len: 2 },

  // Bar 5 (Em)
  80: { freq: NOTES.E6, len: 2 },
  82: { freq: NOTES.C6, len: 2 },
  84: { freq: NOTES.B5, len: 2 },
  87: { freq: NOTES.G5, len: 1 },
  88: { freq: NOTES.A5, len: 2 },
  90: { freq: NOTES.B5, len: 2 },
  92: { freq: NOTES.C6, len: 2 },
  94: { freq: NOTES.E6, len: 2 },

  // Bar 6 (Dm)
  96: { freq: NOTES.F6, len: 2 },
  98: { freq: NOTES.E6, len: 2 },
  100: { freq: NOTES.D6, len: 2 },
  103: { freq: NOTES.C6, len: 1 },
  104: { freq: NOTES.D6, len: 2 },
  106: { freq: NOTES.E6, len: 2 },
  108: { freq: NOTES.F6, len: 2 },
  110: { freq: NOTES.D6, len: 2 },

  // Bar 7 (G7)
  112: { freq: NOTES.G6, len: 2 },
  114: { freq: NOTES.F6, len: 2 },
  116: { freq: NOTES.D6, len: 2 },
  118: { freq: NOTES.B5, len: 2 },
  120: { freq: NOTES.G5, len: 1 },
  121: { freq: NOTES.A5, len: 1 },
  122: { freq: NOTES.B5, len: 1 },
  123: { freq: NOTES.C6, len: 1 },
  124: { freq: NOTES.D6, len: 2 },
  126: { freq: NOTES.B5, len: 2 },
};

// =============================================================================
// TRACK 2: GAMEPLAY THEME (Active Main Gameplay - High Energy, Driving, Bouncy)
// =============================================================================

const GAMEPLAY_BASS_SCORE = {
  // Bar 0: Am - driving 8th notes
  0: NOTES.A2, 2: NOTES.A2, 4: NOTES.E3, 6: NOTES.A2, 8: NOTES.C3, 10: NOTES.D3, 12: NOTES.E3, 14: NOTES.G2,
  // Bar 1: F
  16: NOTES.F2, 18: NOTES.F2, 20: NOTES.C3, 22: NOTES.F2, 24: NOTES.A2, 26: NOTES.C3, 28: NOTES.F3, 30: NOTES.E2,
  // Bar 2: C
  32: NOTES.C3, 34: NOTES.C3, 36: NOTES.G2, 38: NOTES.C3, 40: NOTES.E3, 42: NOTES.G3, 44: NOTES.E3, 46: NOTES.B2,
  // Bar 3: G
  48: NOTES.G2, 50: NOTES.G2, 52: NOTES.D3, 54: NOTES.G2, 56: NOTES.B2, 58: NOTES.D3, 60: NOTES.G3, 62: NOTES.G2,
  // Bar 4: Dm
  64: NOTES.D3, 66: NOTES.D3, 68: NOTES.A2, 70: NOTES.D3, 72: NOTES.F3, 74: NOTES.A3, 76: NOTES.F3, 78: NOTES.C3,
  // Bar 5: Em
  80: NOTES.E2, 82: NOTES.E2, 84: NOTES.B2, 86: NOTES.E2, 88: NOTES.G2, 90: NOTES.B2, 92: NOTES.E3, 94: NOTES.D3,
  // Bar 6: F
  96: NOTES.F2, 98: NOTES.F2, 100: NOTES.C3, 102: NOTES.F2, 104: NOTES.A2, 106: NOTES.C3, 108: NOTES.F3, 110: NOTES.G2,
  // Bar 7: E7
  112: NOTES.E2, 114: NOTES.E2, 116: NOTES.B2, 118: NOTES.D3, 120: NOTES.E3, 122: NOTES.Gs2, 124: NOTES.B2, 126: NOTES.D3,
};

const GAMEPLAY_ARP_SCORE = {
  // Bar 0 (Am)
  0: NOTES.A4, 2: NOTES.C5, 4: NOTES.E5, 6: NOTES.A5, 8: NOTES.E5, 10: NOTES.C5, 12: NOTES.A4, 14: NOTES.C5,
  // Bar 1 (F)
  16: NOTES.F4, 18: NOTES.A4, 20: NOTES.C5, 22: NOTES.F5, 24: NOTES.C5, 26: NOTES.A4, 28: NOTES.F4, 30: NOTES.A4,
  // Bar 2 (C)
  32: NOTES.G4, 34: NOTES.C5, 36: NOTES.E5, 38: NOTES.G5, 40: NOTES.E5, 42: NOTES.C5, 44: NOTES.G4, 46: NOTES.C5,
  // Bar 3 (G)
  48: NOTES.G4, 50: NOTES.B4, 52: NOTES.D5, 54: NOTES.G5, 56: NOTES.D5, 58: NOTES.B4, 60: NOTES.G4, 62: NOTES.B4,
  // Bar 4 (Dm)
  64: NOTES.F4, 66: NOTES.A4, 68: NOTES.D5, 70: NOTES.F5, 72: NOTES.D5, 74: NOTES.A4, 76: NOTES.F4, 78: NOTES.A4,
  // Bar 5 (Em)
  80: NOTES.E4, 82: NOTES.G4, 84: NOTES.B4, 86: NOTES.E5, 88: NOTES.B4, 90: NOTES.G4, 92: NOTES.E4, 94: NOTES.G4,
  // Bar 6 (F)
  96: NOTES.F4, 98: NOTES.A4, 100: NOTES.C5, 102: NOTES.F5, 104: NOTES.C5, 106: NOTES.A4, 108: NOTES.F4, 110: NOTES.A4,
  // Bar 7 (E7)
  112: NOTES.E4, 114: NOTES.Gs4, 116: NOTES.B4, 118: NOTES.D5, 120: NOTES.B4, 122: NOTES.Gs4, 124: NOTES.E4, 126: NOTES.B4,
};

const GAMEPLAY_MELODY_SCORE = {
  // Bar 0: Am - energetic launch
  0: { freq: NOTES.E5, len: 2 },
  3: { freq: NOTES.A5, len: 3 },
  6: { freq: NOTES.B5, len: 2 },
  8: { freq: NOTES.C6, len: 3 },
  11: { freq: NOTES.B5, len: 2 },
  13: { freq: NOTES.A5, len: 2 },
  15: { freq: NOTES.B5, len: 1 },

  // Bar 1: F - soaring upwards
  16: { freq: NOTES.C6, len: 2 },
  19: { freq: NOTES.D6, len: 3 },
  22: { freq: NOTES.C6, len: 2 },
  24: { freq: NOTES.A5, len: 3 },
  27: { freq: NOTES.F5, len: 2 },
  29: { freq: NOTES.A5, len: 3 },

  // Bar 2: C - bright peak
  32: { freq: NOTES.G5, len: 2 },
  35: { freq: NOTES.C6, len: 3 },
  38: { freq: NOTES.D6, len: 2 },
  40: { freq: NOTES.E6, len: 3 },
  43: { freq: NOTES.D6, len: 2 },
  45: { freq: NOTES.C6, len: 3 },

  // Bar 3: G - turnaround
  48: { freq: NOTES.D6, len: 3 },
  51: { freq: NOTES.B5, len: 3 },
  54: { freq: NOTES.G5, len: 2 },
  56: { freq: NOTES.A5, len: 2 },
  58: { freq: NOTES.B5, len: 2 },
  60: { freq: NOTES.C6, len: 2 },
  62: { freq: NOTES.D6, len: 2 },

  // Bar 4: Dm - high sprint
  64: { freq: NOTES.F6, len: 3 },
  67: { freq: NOTES.E6, len: 2 },
  69: { freq: NOTES.D6, len: 3 },
  72: { freq: NOTES.A5, len: 2 },
  74: { freq: NOTES.D6, len: 2 },
  76: { freq: NOTES.F6, len: 2 },
  78: { freq: NOTES.E6, len: 2 },

  // Bar 5: Em - fast leaps
  80: { freq: NOTES.E6, len: 3 },
  83: { freq: NOTES.D6, len: 2 },
  85: { freq: NOTES.B5, len: 3 },
  88: { freq: NOTES.G5, len: 2 },
  90: { freq: NOTES.B5, len: 2 },
  92: { freq: NOTES.D6, len: 2 },
  94: { freq: NOTES.E6, len: 2 },

  // Bar 6: F - peak altitude climax
  96: { freq: NOTES.F6, len: 2 },
  98: { freq: NOTES.G6, len: 2 },
  100: { freq: NOTES.A6, len: 3 },
  103: { freq: NOTES.G6, len: 2 },
  105: { freq: NOTES.F6, len: 3 },
  108: { freq: NOTES.E6, len: 2 },
  110: { freq: NOTES.D6, len: 2 },

  // Bar 7: E7 - suspense flourish resolving to Am
  112: { freq: NOTES.E6, len: 3 },
  115: { freq: NOTES.D6, len: 2 },
  117: { freq: NOTES.B5, len: 3 },
  120: { freq: NOTES.Gs5, len: 2 },
  122: { freq: NOTES.B5, len: 2 },
  124: { freq: NOTES.C6, len: 2 },
  126: { freq: NOTES.B5, len: 2 },
};

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmVolume = 0.12;
    this.bgmGain = null;
    this.menuGain = null;
    this.gameplayGain = null;
    this.bgmMode = 'menu'; // 'menu' (outside gameplay) | 'gameplay' (active race)
    this.noiseBuffer = null;
    this.bgmPlaying = false;
    this.schedulerTimer = null;
    this.currentStep = 0;
    this.nextStepTime = 0;
    this.lastBotBounceTime = 0;

    // UI interactive sound tracking
    this.lastHoveredTarget = null;
    this.lastHoverTime = 0;
    this.lastClickTime = 0;

    // Setup global listeners in browser environment
    if (typeof window !== 'undefined') {
      const unlockInteraction = () => {
        if (!this.enabled) return;
        this.ensureContext();
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        if (!this.bgmPlaying && this.enabled) {
          this.startBGM();
        }
      };

      window.addEventListener('pointerdown', unlockInteraction, { passive: true });
      window.addEventListener('keydown', unlockInteraction, { passive: true });
      window.addEventListener('touchstart', unlockInteraction, { passive: true });

      // Tab visibility management (pause/resume audio context)
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            if (this.ctx && this.ctx.state === 'running') {
              this.ctx.suspend().catch(() => {});
            }
          } else {
            if (this.enabled && this.ctx && this.ctx.state === 'suspended') {
              this.ctx.resume().catch(() => {});
            }
          }
        });

        // Global delegate for soft tactile button hover and click sounds
        const isInteractive = (el) => {
          if (!el || !el.closest) return null;
          return el.closest(
            'button, [role="button"], .btn, .doodle-menu-toggle, .skin-card, .btn-primary, .btn-secondary, a, input[type="submit"], input[type="button"]'
          );
        };

        // Pointer hover sound
        document.addEventListener('pointerover', (e) => {
          const target = isInteractive(e.target);
          if (!target) {
            this.lastHoveredTarget = null;
            return;
          }
          if (this.lastHoveredTarget === target) return;
          this.lastHoveredTarget = target;

          const now = Date.now();
          if (now - this.lastHoverTime < 35) return; // throttle rapid sweeps
          this.lastHoverTime = now;

          this.playButtonHover();
        }, { passive: true, capture: true });

        // Canvas start button hover detection
        document.addEventListener('pointermove', (e) => {
          if (e.target && e.target.tagName === 'CANVAS') {
            if (e.target.style && e.target.style.cursor === 'pointer') {
              if (this.lastHoveredTarget !== 'canvas-btn') {
                this.lastHoveredTarget = 'canvas-btn';
                const now = Date.now();
                if (now - this.lastHoverTime >= 35) {
                  this.lastHoverTime = now;
                  this.playButtonHover();
                }
              }
              return;
            }
          }
          if (this.lastHoveredTarget === 'canvas-btn') {
            this.lastHoveredTarget = null;
          }
        }, { passive: true });

        // Pointer click sound
        document.addEventListener('pointerdown', (e) => {
          const target = isInteractive(e.target);
          if (target) {
            const now = Date.now();
            if (now - this.lastClickTime < 50) return;
            this.lastClickTime = now;
            this.playButtonClick();

            // Handle UI button transitions (Pause, Resume, Menu, Restart)
            const text = (target.textContent || '').toLowerCase();
            const className = String(target.className || '');
            if (className.includes('restart') || text.includes('chơi lại')) {
              this.switchBGM('menu', 0.25);
            } else if (className.includes('menu') || text.includes('tiêu đề') || text.includes('thoát')) {
              this.switchBGM('menu', 0.4);
            } else if (className.includes('pause') || text.includes('tạm dừng')) {
              this.switchBGM('menu', 0.4);
            } else if (text.includes('tiếp tục')) {
              this.switchBGM('gameplay', 0.4);
            }
          }
        }, { passive: true, capture: true });
      }
    }
  }

  ensureContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx) {
      if (!this.bgmGain) {
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
        this.bgmGain.connect(this.ctx.destination);
      }

      if (!this.menuGain) {
        this.menuGain = this.ctx.createGain();
        this.menuGain.gain.setValueAtTime(this.bgmMode === 'menu' ? 1.0 : 0.001, this.ctx.currentTime);
        this.menuGain.connect(this.bgmGain);
      }

      if (!this.gameplayGain) {
        this.gameplayGain = this.ctx.createGain();
        this.gameplayGain.gain.setValueAtTime(this.bgmMode === 'gameplay' ? 1.0 : 0.001, this.ctx.currentTime);
        this.gameplayGain.connect(this.bgmGain);
      }

      if (!this.noiseBuffer) {
        try {
          const bufferSize = Math.floor(this.ctx.sampleRate * 0.5);
          this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = this.noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
        } catch (_) {}
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.pauseBGM();
    } else {
      this.resumeBGM();
    }
    return this.enabled;
  }

  setBGMVolume(vol) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    }
  }

  isBGMPlaying() {
    return this.bgmPlaying;
  }

  getBGMMode() {
    return this.bgmMode;
  }

  setBGMMode(mode) {
    this.switchBGM(mode, 0.4);
  }

  // =========================================================================
  // INTERACTIVE BUTTON SOUND EFFECTS (Soft & Tactile)
  // =========================================================================

  // Soft marimba / bubble pop on button hover
  playButtonHover() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.035);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.046, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
      osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  playHover() {
    this.playButtonHover();
  }

  // Soft tactile mechanical switch / wooden click on button press
  playButtonClick() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Layer 1: Tactile snap transient (ultra-short high triangle)
      const snapOsc = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snapOsc.type = 'triangle';
      snapOsc.frequency.setValueAtTime(1500, now);
      snapOsc.frequency.exponentialRampToValueAtTime(700, now + 0.015);
      snapGain.gain.setValueAtTime(0.065, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.016);
      snapOsc.connect(snapGain);
      snapGain.connect(this.ctx.destination);
      snapOsc.start(now);
      snapOsc.stop(now + 0.02);
      snapOsc.onended = () => { snapOsc.disconnect(); snapGain.disconnect(); };

      // Layer 2: Warm wooden acoustic body (low sine drop)
      const bodyOsc = this.ctx.createOscillator();
      const bodyGain = this.ctx.createGain();
      bodyOsc.type = 'sine';
      bodyOsc.frequency.setValueAtTime(390, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(160, now + 0.045);
      bodyGain.gain.setValueAtTime(0.088, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      bodyOsc.connect(bodyGain);
      bodyGain.connect(this.ctx.destination);
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.05);
      bodyOsc.onended = () => { bodyOsc.disconnect(); bodyGain.disconnect(); };

      // Layer 3: Subtle tactile noise tap
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(3.5, now);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.038, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.02);
        noise.onended = () => { noise.disconnect(); filter.disconnect(); noiseGain.disconnect(); };
      }
    } catch (_) {}
  }

  playClick() {
    this.playButtonClick();
  }

  // =========================================================================
  // PROCEDURAL DUAL-MODE BGM ENGINE (Web Audio Clock Scheduling & Crossfade)
  // =========================================================================

  // Smooth crossfade switch between Menu Theme and Gameplay Theme
  switchBGM(newMode, fadeDuration = 0.5) {
    if (!this.ctx) {
      this.bgmMode = newMode;
      return;
    }

    this.ensureContext();
    if (this.bgmMode === newMode && this.bgmPlaying) return;
    this.bgmMode = newMode;

    if (!this.bgmPlaying && this.enabled) {
      this.startBGM();
    }

    if (!this.menuGain || !this.gameplayGain) return;

    try {
      const now = this.ctx.currentTime;
      const targetMenu = newMode === 'menu' ? 1.0 : 0.001;
      const targetGameplay = newMode === 'gameplay' ? 1.0 : 0.001;

      this.menuGain.gain.cancelScheduledValues(now);
      this.menuGain.gain.setValueAtTime(this.menuGain.gain.value, now);
      this.menuGain.gain.linearRampToValueAtTime(targetMenu, now + fadeDuration);

      this.gameplayGain.gain.cancelScheduledValues(now);
      this.gameplayGain.gain.setValueAtTime(this.gameplayGain.gain.value, now);
      this.gameplayGain.gain.linearRampToValueAtTime(targetGameplay, now + fadeDuration);
    } catch (_) {}
  }

  startBGM() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    if (this.bgmPlaying && this.schedulerTimer) return;

    this.bgmPlaying = true;
    const now = this.ctx.currentTime;
    this.nextStepTime = now + 0.05;
    this.currentStep = 0;

    // Smooth master fade in
    if (this.bgmGain) {
      try {
        this.bgmGain.gain.cancelScheduledValues(now);
        this.bgmGain.gain.setValueAtTime(0.001, now);
        this.bgmGain.gain.linearRampToValueAtTime(this.bgmVolume, now + 0.35);
      } catch (_) {}
    }

    // Set initial gains based on current mode
    if (this.menuGain && this.gameplayGain) {
      try {
        this.menuGain.gain.setValueAtTime(this.bgmMode === 'menu' ? 1.0 : 0.001, now);
        this.gameplayGain.gain.setValueAtTime(this.bgmMode === 'gameplay' ? 1.0 : 0.001, now);
      } catch (_) {}
    }

    if (!this.schedulerTimer) {
      this.schedulerTimer = setInterval(() => this.scheduleLoop(), SCHEDULE_INTERVAL_MS);
    }
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.bgmGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.bgmGain.gain.cancelScheduledValues(now);
        this.bgmGain.gain.setValueAtTime(0.001, now);
      } catch (_) {}
    }
  }

  pauseBGM() {
    this.bgmPlaying = false;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  resumeBGM() {
    if (!this.enabled) return;
    this.startBGM();
  }

  fadeBGM(targetGain = 0.001, duration = 0.4) {
    if (!this.bgmGain || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
      this.bgmGain.gain.linearRampToValueAtTime(targetGain, now + duration);
    } catch (_) {}
  }

  scheduleLoop() {
    if (!this.enabled || !this.bgmPlaying || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Guard against clock drift or sleep resume
      if (this.nextStepTime < now - 0.25) {
        this.nextStepTime = now + 0.05;
      }

      while (this.nextStepTime < now + LOOKAHEAD_SEC) {
        this.scheduleStep(this.currentStep, this.nextStepTime);
        this.nextStepTime += SIXTEENTH_TIME;
        this.currentStep = (this.currentStep + 1) % TOTAL_STEPS;
      }
    } catch (_) {}
  }

  scheduleStep(step, time) {
    if (!this.ctx || !this.bgmGain) return;

    const isMenuAudible = this.menuGain && this.menuGain.gain.value > 0.005;
    const isGameplayAudible = this.gameplayGain && this.gameplayGain.gain.value > 0.005;

    // =========================================================================
    // 1. SCHEDULE MENU THEME (Outside Gameplay)
    // =========================================================================
    if (isMenuAudible) {
      // Menu Bass
      const bassNote = MENU_BASS_SCORE[step];
      if (bassNote) this.playMenuBass(bassNote, time);

      // Menu Chords
      const chord = MENU_CHORD_SCORE[step];
      if (chord) this.playMenuChord(chord, time);

      // Menu Melody
      const melody = MENU_MELODY_SCORE[step];
      if (melody) this.playMenuMelody(melody.freq, melody.len, time);

      // Menu Percussion (Downbeat woodblock, rim on 4/12, light shaker)
      const stepInBar = step % 16;
      if (stepInBar === 0 || stepInBar === 8) this.playMenuKick(time);
      if (stepInBar === 4 || stepInBar === 12) this.playMenuRim(time);
      if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) this.playMenuShaker(time);
      if (step === 61 || step === 62 || step === 63 || step === 125 || step === 126 || step === 127) {
        this.playMenuRim(time, 0.04);
      }
    }

    // =========================================================================
    // 2. SCHEDULE GAMEPLAY THEME (Active Main Gameplay - High Energy & Driving)
    // =========================================================================
    if (isGameplayAudible) {
      // Driving 8th-note Synth Bass
      const gpBass = GAMEPLAY_BASS_SCORE[step];
      if (gpBass) this.playGameplayBass(gpBass, time);

      // Sparkling Arpeggio Plucks
      const gpArp = GAMEPLAY_ARP_SCORE[step];
      if (gpArp) this.playGameplayArp(gpArp, time);

      // Heroic Upbeat Lead Melody
      const gpMelody = GAMEPLAY_MELODY_SCORE[step];
      if (gpMelody) this.playGameplayMelody(gpMelody.freq, gpMelody.len, time);

      // Driving Percussion (Four-on-the-floor kick, snappy snare/rim, 16th rolling hats)
      const stepInBar = step % 16;
      if (stepInBar === 0 || stepInBar === 4 || stepInBar === 8 || stepInBar === 12) {
        this.playGameplayKick(time);
      }
      if (stepInBar === 4 || stepInBar === 12) {
        this.playGameplayRim(time, 0.08);
      }
      if (stepInBar % 2 === 0) {
        this.playGameplayShaker(time);
      }
      // Drum fills at ends of measure 4 and 8
      if (step === 60 || step === 61 || step === 62 || step === 63 || step === 124 || step === 125 || step === 126 || step === 127) {
        this.playGameplayRim(time, 0.05);
      }
    }
  }

  // =========================================================================
  // MENU THEME INSTRUMENTS
  // =========================================================================

  playMenuKick(time) {
    if (!this.ctx || !this.menuGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.065);
      gain.gain.setValueAtTime(0.09, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.065);
      osc.connect(gain);
      gain.connect(this.menuGain);
      osc.start(time);
      osc.stop(time + 0.07);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  playMenuRim(time, customGain = 0.07) {
    if (!this.ctx || !this.menuGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540, time);
      osc.frequency.exponentialRampToValueAtTime(260, time + 0.045);
      gain.gain.setValueAtTime(customGain, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
      osc.connect(gain);
      gain.connect(this.menuGain);
      osc.start(time);
      osc.stop(time + 0.05);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  playMenuShaker(time) {
    if (!this.ctx || !this.menuGain || !this.noiseBuffer) return;
    try {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(5500, time);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.024, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.menuGain);
      noise.start(time);
      noise.stop(time + 0.03);
      noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  playMenuBass(freq, time) {
    if (!this.ctx || !this.menuGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, time);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.13, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.menuGain);
      osc.start(time);
      osc.stop(time + 0.17);
      osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  playMenuChord(frequencies, time) {
    if (!this.ctx || !this.menuGain) return;
    try {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, time);
      filter.connect(this.menuGain);
      frequencies.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(0.032, time + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
        osc.connect(gain);
        gain.connect(filter);
        osc.start(time);
        osc.stop(time + 0.10);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      });
    } catch (_) {}
  }

  playMenuMelody(freq, stepDuration, time) {
    if (!this.ctx || !this.menuGain) return;
    try {
      const durationSec = stepDuration * SIXTEENTH_TIME * 0.92;
      const osc = this.ctx.createOscillator();
      const oscOvertone = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      const gainOvertone = this.ctx.createGain();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, time);
      filter.Q.setValueAtTime(2, time);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      oscOvertone.type = 'sine';
      oscOvertone.frequency.setValueAtTime(freq * 2, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.075, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, time + durationSec);

      gainOvertone.gain.setValueAtTime(0.001, time);
      gainOvertone.gain.linearRampToValueAtTime(0.02, time + 0.006);
      gainOvertone.gain.exponentialRampToValueAtTime(0.001, time + durationSec * 0.6);

      osc.connect(filter);
      oscOvertone.connect(filter);
      filter.connect(gain);
      gain.connect(this.menuGain);

      osc.start(time);
      oscOvertone.start(time);
      osc.stop(time + durationSec + 0.01);
      oscOvertone.stop(time + durationSec + 0.01);

      osc.onended = () => {
        osc.disconnect();
        oscOvertone.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    } catch (_) {}
  }

  // =========================================================================
  // GAMEPLAY THEME INSTRUMENTS (Punchy, Driving, Exciting)
  // =========================================================================

  playGameplayKick(time) {
    if (!this.ctx || !this.gameplayGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(155, time);
      osc.frequency.exponentialRampToValueAtTime(46, time + 0.065);
      gain.gain.setValueAtTime(0.10, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.065);
      osc.connect(gain);
      gain.connect(this.gameplayGain);
      osc.start(time);
      osc.stop(time + 0.07);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  playGameplayRim(time, customGain = 0.08) {
    if (!this.ctx || !this.gameplayGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, time);
      osc.frequency.exponentialRampToValueAtTime(280, time + 0.045);
      gain.gain.setValueAtTime(customGain, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
      osc.connect(gain);
      gain.connect(this.gameplayGain);
      osc.start(time);
      osc.stop(time + 0.05);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  playGameplayShaker(time) {
    if (!this.ctx || !this.gameplayGain || !this.noiseBuffer) return;
    try {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6000, time);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.026, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.022);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.gameplayGain);
      noise.start(time);
      noise.stop(time + 0.025);
      noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  playGameplayBass(freq, time) {
    if (!this.ctx || !this.gameplayGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, time);
      filter.Q.setValueAtTime(2.0, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.14, time + 0.010);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.gameplayGain);

      osc.start(time);
      osc.stop(time + 0.15);
      osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  playGameplayArp(freq, time) {
    if (!this.ctx || !this.gameplayGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1700, time);
      filter.Q.setValueAtTime(2.5, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.040, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.gameplayGain);

      osc.start(time);
      osc.stop(time + 0.09);
      osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  playGameplayMelody(freq, stepDuration, time) {
    if (!this.ctx || !this.gameplayGain) return;
    try {
      const durationSec = stepDuration * SIXTEENTH_TIME * 0.90;
      const osc = this.ctx.createOscillator();
      const oscOvertone = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      const gainOvertone = this.ctx.createGain();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, time);
      filter.Q.setValueAtTime(2.2, time);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      oscOvertone.type = 'sine';
      oscOvertone.frequency.setValueAtTime(freq * 2, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.082, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + durationSec);

      gainOvertone.gain.setValueAtTime(0.001, time);
      gainOvertone.gain.linearRampToValueAtTime(0.025, time + 0.005);
      gainOvertone.gain.exponentialRampToValueAtTime(0.001, time + durationSec * 0.65);

      osc.connect(filter);
      oscOvertone.connect(filter);
      filter.connect(gain);
      gain.connect(this.gameplayGain);

      osc.start(time);
      oscOvertone.start(time);
      osc.stop(time + durationSec + 0.01);
      oscOvertone.stop(time + durationSec + 0.01);

      osc.onended = () => {
        osc.disconnect();
        oscOvertone.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    } catch (_) {}
  }

  // =========================================================================
  // SOUND EFFECTS & CINEMATIC TRANSITIONS
  // =========================================================================

  // Soft wind whoosh during camera descent (Transitions to Menu Theme)
  playWhoosh(duration = 1.2) {
    if (!this.enabled) return;
    this.ensureContext();
    this.switchBGM('menu', 0.4);
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

  // Launch bounce chord - seamlessly triggers Gameplay Theme!
  playLaunch() {
    if (!this.enabled) return;
    this.ensureContext();
    this.switchBGM('gameplay', 0.5);
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
    this.switchBGM('menu', 0.3);
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

  // Subtle game over tone with smooth transition to Menu Theme
  playGameOver() {
    if (!this.enabled) return;
    this.ensureContext();
    this.switchBGM('menu', 0.6);

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

  // =========================================================================
  // PLAYER & BOT SOUND EFFECTS
  // =========================================================================

  // Player platform bounce (standard, bouncy spring, or fragile crack)
  playPlayerBounce(type = 'standard') {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      if (type === 'bouncy') {
        // Iconic cartoon spring "BOOIIING!" with pitch sweep and vibrato wobble
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.28);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(26, now);
        lfoGain.gain.setValueAtTime(25, now);
        lfoGain.gain.exponentialRampToValueAtTime(1, now + 0.32);

        lfo.connect(osc.frequency);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.36);
        osc.stop(now + 0.36);

        osc.onended = () => {
          lfo.disconnect();
          lfoGain.disconnect();
          osc.disconnect();
          gain.disconnect();
        };
      } else if (type === 'fragile' || type === 'breakable') {
        // Crunchy snap / wood crack
        if (this.noiseBuffer) {
          const noise = this.ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1300, now);
          filter.Q.setValueAtTime(3, now);

          const noiseGain = this.ctx.createGain();
          noiseGain.gain.setValueAtTime(0.12, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(this.ctx.destination);

          noise.start(now);
          noise.stop(now + 0.09);
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.08);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.09);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      } else {
        // Crisp, bouncy rubber pop for standard platform
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(290, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.09);

        gain.gain.setValueAtTime(0.13, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.10);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      }
    } catch (_) {}
  }

  // Cute quick warp sound when player wraps around screen edges
  playPlayerWrap() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(1020, now + 0.06);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  // Bot bounce (softer, spatial stereo panning, throttled to prevent audio clutter)
  playBotBounce(type = 'standard', normalizedX = 0.5) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (now - this.lastBotBounceTime < 0.05) return; // throttle
    this.lastBotBounceTime = now;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const pan = Math.max(-0.85, Math.min(0.85, (normalizedX - 0.5) * 1.7));
      let outputNode = this.ctx.destination;

      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(pan, now);
        panner.connect(this.ctx.destination);
        outputNode = panner;
      }

      if (type === 'bouncy') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.18);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      }

      osc.connect(gain);
      gain.connect(outputNode);

      osc.start(now);
      osc.stop(now + 0.21);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  // Playful swoop whistle when a bot joins the race
  playBotEntrance() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.16);

      gain.gain.setValueAtTime(0.065, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.19);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }

  // Cartoon descending whistle drop when a bot falls off-screen
  playBotFall(normalizedX = 0.5) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const pan = Math.max(-0.85, Math.min(0.85, (normalizedX - 0.5) * 1.7));
      let outputNode = this.ctx.destination;
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(pan, now);
        panner.connect(this.ctx.destination);
        outputNode = panner;
      }

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.35);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.connect(gain);
      gain.connect(outputNode);

      osc.start(now);
      osc.stop(now + 0.37);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch (_) {}
  }
}

export const sound = new SoundEngine();
