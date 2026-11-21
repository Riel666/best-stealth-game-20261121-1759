// Lantern's Edge — sound. One job: every sound the game makes, synthesized
// with WebAudio — no audio files. Soft footstep ticks while you walk, a
// rising two-tone alarm, a low sting when you are caught, and a small
// arpeggio when you slip through the exit. Nothing plays before the first
// user gesture, so the context starts muted and resumes on demand.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.lastStep = 0;
    this.alarmPhase = 0;
    this.alarmTimer = 0;
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // A short tone: frequency, seconds, gain, wave shape.
  blip(freq, dur, gain, type = 'sine', when = 0) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // A footstep: a soft filtered thud. Called by the game when the walk
  // cycle passes a step; sneaking steps are quieter and farther apart.
  footstep(sneaking) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const now = performance.now();
    const gap = sneaking ? 520 : 340;
    if (now - this.lastStep < gap) return;
    this.lastStep = now;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(sneaking ? 120 : 150, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.09);
    g.gain.setValueAtTime(sneaking ? 0.03 : 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  // The alarm's two-tone pulse, called once a frame while the alarm sounds.
  alarmTick(dt) {
    if (!this.enabled) return;
    this.alarmTimer -= dt;
    if (this.alarmTimer > 0) return;
    this.alarmTimer = 0.42;
    this.alarmPhase = 1 - this.alarmPhase;
    this.blip(this.alarmPhase ? 620 : 470, 0.22, 0.05, 'square');
  }

  // A warden grew suspicious: one short warning note.
  suspicious() {
    this.blip(880, 0.14, 0.05, 'sine');
  }

  // Caught: three descending notes.
  caught() {
    this.blip(320, 0.22, 0.09, 'sawtooth');
    this.blip(240, 0.22, 0.09, 'sawtooth', 0.18);
    this.blip(160, 0.4, 0.09, 'sawtooth', 0.36);
  }

  // Through the exit: a small rising arpeggio.
  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.blip(f, 0.3, 0.06, 'sine', i * 0.11));
  }

  // A new level starts: one warm low note.
  levelStart() {
    this.blip(392, 0.35, 0.05, 'sine');
  }
}
