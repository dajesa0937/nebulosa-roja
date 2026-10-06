// Audio 100% procedural (WebAudio): sin archivos externos, funciona offline y pesa 0 KB.
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const MODES = {
  menu: { bpm: 84,  root: 45, prog: [0, -4, -2, -5], drums: false, arp: .5 },
  game: { bpm: 128, root: 40, prog: [0, 0, -4, -2], drums: true,  arp: 1 },
  boss: { bpm: 152, root: 38, prog: [0, 1, 0, -2],  drums: true,  arp: 1.2, dark: true }
};
export class AudioEngine {
  constructor() { this.ctx = null; this.vol = { master: .8, music: .55, sfx: .8 }; this.mode = null; this.step = 0; this.next = 0; this.last = {}; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.musicG = this.ctx.createGain(); this.sfxG = this.ctx.createGain();
    const comp = this.ctx.createDynamicsCompressor();
    this.musicG.connect(this.master); this.sfxG.connect(this.master); this.master.connect(comp); comp.connect(this.ctx.destination);
    const len = this.ctx.sampleRate; this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.setVolumes(this.vol);
    this.timer = setInterval(() => this.tick(), 30);
  }
  setVolumes(v) {
    Object.assign(this.vol, v); if (!this.ctx) return;
    this.master.gain.value = this.vol.master; this.musicG.gain.value = this.vol.music * .5; this.sfxG.gain.value = this.vol.sfx;
  }
  suspend(b) { if (!this.ctx) return; b ? this.ctx.suspend() : this.ctx.resume(); }
  tone(f, t, d, type, v, dest, f2, lp) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    let n = o; if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl; }
    n.connect(g); g.connect(dest || this.sfxG); o.start(t); o.stop(t + d + .02);
  }
  noiseHit(t, d, v, f0, f1, dest) {
    const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; fl.type = 'lowpass'; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(dest || this.sfxG); s.start(t); s.stop(t + d + .02);
  }
  sfx(n) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime, now = performance.now();
    const gate = { shoot: 60, hit: 40, coin: 30, boom: 30 }[n]; // evita saturar el audio
    if (gate) { if (now - (this.last[n] || 0) < gate) return; this.last[n] = now; }
    switch (n) {
      case 'shoot': this.tone(880, t, .07, 'square', .035, null, 260); break;
      case 'missile': this.tone(300, t, .2, 'sawtooth', .05, null, 120, 1400); break;
      case 'plasma': this.tone(500, t, .12, 'sawtooth', .04, null, 180, 2200); break;
      case 'boom': this.noiseHit(t, .28, .22, 2400, 120); this.tone(140, t, .22, 'sine', .15, null, 40); break;
      case 'big': this.noiseHit(t, 1.1, .5, 3000, 60); this.tone(90, t, .9, 'sine', .35, null, 28); break;
      case 'hit': this.tone(180, t, .12, 'square', .05, null, 90); break;
      case 'hurt': this.noiseHit(t, .5, .35, 1800, 90); this.tone(120, t, .45, 'sawtooth', .18, null, 40); break;
      case 'coin': this.tone(1318, t, .06, 'square', .04); this.tone(1760, t + .05, .1, 'square', .04); break;
      case 'power': [0, 4, 7, 12].forEach((s, i) => this.tone(mtof(72 + s), t + i * .05, .12, 'triangle', .07)); break;
      case 'bomb': this.noiseHit(t, 1.2, .55, 4000, 50); this.tone(70, t, 1, 'sine', .4, null, 20); break;
      case 'echo': this.tone(200, t, .5, 'sawtooth', .08, null, 1600, 3000); this.tone(1600, t + .25, .5, 'sine', .06, null, 200); break;
      case 'echoEnd': this.noiseHit(t, .5, .25, 5000, 200); this.tone(900, t, .4, 'sine', .08, null, 120); break;
      case 'click': this.tone(660, t, .05, 'triangle', .06); break;
      case 'buy': this.tone(880, t, .08, 'square', .05); this.tone(1320, t + .07, .14, 'square', .05); break;
      case 'deny': this.tone(160, t, .18, 'square', .06, null, 100); break;
      case 'warn': this.tone(220, t, .35, 'sawtooth', .08, null, 110); this.tone(220, t + .4, .35, 'sawtooth', .08, null, 110); break;
      case 'win': [0, 4, 7, 12, 16, 19].forEach((s, i) => this.tone(mtof(64 + s), t + i * .11, .3, 'triangle', .09)); break;
      case 'lose': [0, -3, -7, -12].forEach((s, i) => this.tone(mtof(60 + s), t + i * .22, .45, 'sawtooth', .07, null, null, 900)); break;
    }
  }
  music(mode) {
    if (mode === this.mode) return; this.mode = mode; this.step = 0;
    if (this.ctx) this.next = this.ctx.currentTime + .08;
  }
  tick() {
    if (!this.ctx || !this.mode || this.ctx.state !== 'running') return;
    const m = MODES[this.mode], dur = 60 / m.bpm / 4; // semicorchea
    while (this.next < this.ctx.currentTime + .18) { this.play16(m, this.step++, this.next, dur); this.next += dur; }
  }
  play16(m, s, t, dur) {
    const bar = Math.floor(s / 16) % 4, i = s % 16, root = m.root + m.prog[bar], dest = this.musicG;
    if (i % 2 === 0 || m.dark) { const sub = (i % 4 === 2) ? 12 : 0; this.tone(mtof(root + sub), t, dur * 1.8, 'sawtooth', .22, dest, null, m.dark ? 500 : 700); }
    const chord = [0, 3, 7, 10, 12, 15, 19, 15]; // arpegio menor
    if (m.arp) { const n = chord[(i * (m.arp > 1 ? 1 : 1) + bar) % chord.length]; if (i % (m.arp < 1 ? 4 : 1) === 0) this.tone(mtof(root + 24 + n), t, dur * 1.2, 'square', .05 * Math.min(1, m.arp), dest, null, 2400); }
    if (i === 0) [0, 7, 12].forEach(n => this.tone(mtof(root + 12 + n), t, dur * 15, 'triangle', .07, dest));
    if (m.drums) {
      if (i % 4 === 0) { this.tone(150, t, .14, 'sine', .5, dest, 38); }
      if (i % 4 === 2) { this.noiseHit(t, .05, .14, 9000, 6000, dest); }
      if (i === 4 || i === 12) { this.noiseHit(t, .13, .2, 4000, 1200, dest); }
    }
  }
}
