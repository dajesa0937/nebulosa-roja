// Motor del juego: lógica, entrada, oleadas, jefes y la mecánica propia "Eco Temporal".
import { CONFIG } from './config.js';
import { SHIPS, SKINS, ENEMIES, BOSSES, LEVELS, WAVES_PER_LEVEL, POWER } from './data.js';
import { makeNebula } from './sprites.js';
import { render } from './render.js';

const LW = CONFIG.LW;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);
function sweep(a, keep) { let j = 0; for (let i = 0; i < a.length; i++) { const e = a[i]; if (keep(e)) a[j++] = e; } a.length = j; }
const hit = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
export const QUALITY = [
  { part: .35, stars: 45,  nebScroll: false, dpr: 1,   glow: false },
  { part: .7,  stars: 90,  nebScroll: true,  dpr: 1.5, glow: true },
  { part: 1,   stars: 150, nebScroll: true,  dpr: 2,   glow: true }
];

export class Game {
  constructor(o) {
    Object.assign(this, o); // canvas, save, audio, hooks: onHud, onEnd, onTip, onBanner, vibrate
    this.cv = o.canvas; this.ctx = this.cv.getContext('2d', { alpha: false });
    this.LH = 800; this.state = 'menu'; this.keys = {}; this.t = 0; this.scrollY = 0; this.shake = 0;
    this.player = null; this.stick = { on: false, ox: 0, oy: 0, dx: 0, dy: 0 }; this.touching = false;
    this.q = matchMedia('(pointer:coarse)').matches ? 1 : 2; this.fpsN = 0; this.fpsT = 0;
    this.levelNum = 1; this.setLevelBg(1); this.stars = []; this.initStars();
    this.hud = { score: 0, lives: 0, maxLives: 0, level: 1, wave: 1, waves: 3, coins: 0, bombs: 0, echo: 0, combo: 0, mult: 1, powers: [], boss: false };
    this.arrays();
    this.bindInput();
  }
  arrays() { this.bullets = []; this.ebullets = []; this.enemies = []; this.parts = []; this.powers = []; this.coinsArr = []; this.rings = []; this.texts = []; this.echoes = []; this.boss = null; this.rec = []; }
  get QC() { return QUALITY[this.q]; }
  settings() { return this.save.settings; }

  // ---------- tamaño / calidad ----------
  resize(boxW, boxH) {
    this.boxW = boxW; this.boxH = boxH; this.LH = Math.round(LW * boxH / boxW);
    this.applySize(); this.initStars(); this.setLevelBg(this.levelNum);
    if (this.player) { this.player.x = clamp(this.player.x, 20, LW - 20); this.player.y = clamp(this.player.y, this.LH * .35, this.LH - 50); }
  }
  applySize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.QC.dpr), s = this.boxW * dpr / LW;
    this.cv.width = Math.round(this.boxW * dpr); this.cv.height = Math.round(this.boxH * dpr);
    this.ctx.setTransform(s, 0, 0, s, 0, 0);
  }
  setQuality(n) { if (n === this.q) return; this.q = n; this.applySize(); this.initStars(); }
  initStars() { this.stars = []; const n = this.QC.stars; for (let i = 0; i < n; i++) this.stars.push({ x: Math.random() * LW, y: Math.random() * this.LH, z: Math.random() * .85 + .15 }); }
  setLevelBg(n) { this.levelNum = n; this.level = LEVELS[n - 1] || LEVELS[0]; this.neb = makeNebula(this.level, 512, 1024, n); }

  // ---------- entrada ----------
  toLogical(e) { const r = this.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * LW / r.width, y: (e.clientY - r.top) * this.LH / r.height }; }
  bindInput() {
    const cv = this.cv;
    cv.addEventListener('pointerdown', e => {
      if (this.state !== 'play' || this.pid != null) return; this.audio.init();
      this.pid = e.pointerId; this.touching = true; const p = this.toLogical(e);
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      if (this.settings().control === 'joystick') { this.stick.on = true; this.stick.ox = p.x; this.stick.oy = p.y; this.stick.dx = this.stick.dy = 0; }
      else { this.offX = this.player.x - p.x; this.offY = this.player.y - p.y; }
    });
    cv.addEventListener('pointermove', e => {
      if (e.pointerId !== this.pid || !this.player) return; const p = this.toLogical(e);
      if (this.stick.on) { let dx = p.x - this.stick.ox, dy = p.y - this.stick.oy; const d = Math.hypot(dx, dy), m = 55; if (d > m) { dx *= m / d; dy *= m / d; this.stick.ox = p.x - dx; this.stick.oy = p.y - dy; } this.stick.dx = dx / m; this.stick.dy = dy / m; }
      else { this.player.tx = p.x + this.offX; this.player.ty = p.y + this.offY; }
    });
    const up = e => { if (e.pointerId !== this.pid) return; this.pid = null; this.touching = false; this.stick.on = false; this.stick.dx = this.stick.dy = 0; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase(); this.keys[k] = true;
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k) && this.state === 'play') e.preventDefault();
      if (this.state === 'play') { if (k === 'b') this.useBomb(); if (k === 'e' || k === 'shift') this.useEcho(); }
      if ((k === 'p' || k === 'escape') && (this.state === 'play' || this.state === 'pause')) this.togglePause();
    });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { if (this.state === 'play') this.togglePause(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play') this.togglePause(); });
  }

  // ---------- inicio de nivel ----------
  startLevel(n, tutorial) {
    const sv = this.save, ship = SHIPS.find(s => s.id === sv.ship) || SHIPS[0], up = sv.up;
    this.ship = ship; this.arrays(); this.setLevelBg(n); this.t = 0;
    const skin = SKINS[sv.skin] || SKINS[0]; this.shipColor = skin.color || ship.color;
    this.player = {
      x: LW / 2, y: this.LH - 110, tx: LW / 2, ty: this.LH - 110, w: 16, h: 20, lives: ship.lives, maxLives: ship.lives + 2,
      shield: up.shield * 2, inv: 1.5, tripleT: 0, plasmaT: 0, missileT: 0, speedT: 0, multT: 0, bombs: 1, fireCd: 0, missCd: 0,
      spd: ship.speed * (1 + .06 * up.spd), dmg: ship.dmg * (1 + .15 * up.dmg)
    };
    this.run = { score: 0, kills: 0, coins: 0, crystals: 0, time: 0, hits: 0, combo: 0, bestCombo: 0, bosses: 0, eco: 0, level: n, emperor: false };
    this.combo = 0; this.comboT = 0; this.echoMeter = 0; this.echoRec = 0; this.wave = 0; this.phase = 'intro'; this.phaseT = 1.6;
    this.swarmT = 8; this.rockT = 3; this.pending = 0; this.pid = null; this.touching = false; this.stick.on = false; this.hits = 0;
    this.tutorial = !!tutorial; this.tut = { step: 0, t: 0, moved: 0, kills0: 0 };
    this.state = 'play'; this.lastShot = 0;
    this.banner(`SECTOR ${n}`, this.level.name);
    this.audio.music('game'); this.pushHud(true);
    if (this.tutorial) this.onTip('Arrastra el dedo para mover tu nave');
  }
  togglePause() {
    if (this.state === 'play') { this.state = 'pause'; this.onPause && this.onPause(true); this.audio.suspend(true); }
    else if (this.state === 'pause') { this.state = 'play'; this.onPause && this.onPause(false); this.audio.suspend(false); this.pid = null; this.touching = false; this.stick.on = false; }
  }
  quit() { this.state = 'menu'; this.arrays(); this.audio.music('menu'); this.onTip(null); }

  // ---------- utilidades ----------
  banner(a, b) { this.onBanner && this.onBanner(a, b); }
  buzz(ms) { if (this.settings().vibration && navigator.vibrate) { try { navigator.vibrate(ms); } catch (_) {} } }
  boom(x, y, col, n = 18, sp = 220, big = false) {
    n = Math.round(n * this.QC.part);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = Math.random() * sp; this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .4 + Math.random() * .6, max: 1, col, sz: 1.5 + Math.random() * 2 }); }
    if (this.parts.length > 420) this.parts.splice(0, this.parts.length - 420);
    this.rings.push({ x, y, r: 4, max: big ? 90 : 34, life: .35, col });
  }
  text(x, y, txt, col) { this.texts.push({ x, y, txt, col, life: 1 }); }
  pushHud(force) {
    const h = this.hud, p = this.player; if (!p) return;
    h.score = this.run.score; h.lives = p.lives; h.maxLives = p.maxLives; h.level = this.run.level; h.wave = Math.max(1, this.wave); h.waves = WAVES_PER_LEVEL;
    h.coins = this.run.coins; h.bombs = p.bombs; h.echo = Math.min(100, Math.floor(this.echoMeter)); h.combo = this.combo; h.mult = this.mult();
    h.powers.length = 0;
    for (const k of ['tripleT', 'plasmaT', 'missileT', 'speedT', 'multT']) if (p[k] > 0) h.powers.push({ k, t: p[k] });
    if (p.shield > 0) h.powers.push({ k: 'shield', t: p.shield });
    h.boss = !!this.boss; this.onHud && this.onHud(h, force);
  }
  mult() { return (1 + Math.min(2, Math.floor(this.combo / 10) * .5)) * (this.player && this.player.multT > 0 ? 2 : 1); }
  addScore(n) { this.run.score += Math.round(n * this.mult()); }

  // ---------- oleadas ----------
  spawnWave() {
    this.wave++; const L = this.levelNum, pool = this.level.types.filter(t => t !== 6);
    const cols = clamp(4 + Math.floor((L + this.wave) / 5), 4, Math.min(6, Math.floor(LW / 62))), rows = clamp(2 + Math.floor((L + this.wave) / 5), 2, 4), gap = Math.min(58, (LW - 50) / cols);
    const strong = pool.filter(t => t >= 2); const hpS = 1 + (L - 1) * .1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      let t; if (r === 0 && strong.length && this.wave > 1) t = strong[(c + L) % strong.length]; else t = pool[Math.floor(Math.random() * Math.min(pool.length, 1 + Math.floor((L + r) / 2)))] ;
      if (t === 2 && c % 2) t = pool[0]; // tanques espaciados
      this.addEnemy(t, (LW - gap * (cols - 1)) / 2 + c * gap, 70 + r * 46, -40 - r * 36 - c * 8, hpS);
    }
    this.banner(`OLEADA ${this.wave}/${WAVES_PER_LEVEL}`, ''); this.phase = 'wave';
  }
  addEnemy(t, bx, by, y0, hpS = 1, extra) {
    const d = ENEMIES[t], e = {
      type: t, x: bx, y: y0, bx, by, w: d.w, h: d.h, hp: Math.max(1, Math.round(d.hp * (t === 2 ? hpS : 1))), t: Math.random() * 6, ph: Math.random() * 6, entry: true, flash: 0,
      st: 0, cd: 1 + Math.random() * 3, sh: t === 5 ? 3 : 0, divT: t === 3 || t === 1 ? 2 + Math.random() * 8 : 0, vx: 0, vy: 0, tele: 0, ang: 0, rot: Math.random() * 6
    };
    e.max = e.hp; if (extra) Object.assign(e, extra); this.enemies.push(e); return e;
  }
  enemyShoot(e) {
    const p = this.player, a = Math.atan2(p.y - e.y, p.x - e.x), L = this.levelNum, s = 180 + L * 7;
    if (e.type === 2) { for (let i = -1; i <= 1; i++) this.ebullets.push({ x: e.x, y: e.y + 14, vx: Math.cos(a + i * .22) * s, vy: Math.sin(a + i * .22) * s, r: 5, col: '#c58bff' }); this.audio.sfx('hit'); }
    else if (e.type === 4) { e.tele = .7; e.ang = a; }
    else this.ebullets.push({ x: e.x, y: e.y + 10, vx: e.type === 5 ? Math.cos(a) * s * .8 : 0, vy: e.type === 5 ? Math.sin(a) * s * .8 : s, r: 4.5, col: ENEMIES[e.type].col });
  }

  // ---------- armas del jugador ----------
  playerFire(p, dt) {
    p.fireCd -= dt; p.missCd -= dt; if (p.fireCd > 0) return false;
    const d = p.dmg, pl = p.plasmaT > 0, pierce = pl || this.ship.pierce;
    p.fireCd = pl ? .2 : .15;
    const mk = (dx, vx, vy, dm, kind, big) => this.bullets.push({ x: p.x + dx, y: p.y - 24, vx, vy, w: big ? 10 : 4, h: big ? 22 : 14, dmg: dm, kind, hits: (kind === 'plasma' || (pierce && kind === 'laser')) ? [] : null });
    if (pl) mk(0, 0, -700, d * 2.2, 'plasma', true); else mk(0, 0, -780, d, 'laser');
    if (p.tripleT > 0) { mk(-12, -150, -740, d * .8, 'laser'); mk(12, 150, -740, d * .8, 'laser'); }
    if (this.ship.id === 'destroyer' && !pl) { mk(-14, 0, -780, d * .5, 'laser'); mk(14, 0, -780, d * .5, 'laser'); }
    if (this.ship.id === 'titan' && !pl) { mk(-9, -40, -760, d * .5, 'laser'); mk(9, 40, -760, d * .5, 'laser'); }
    if (p.missileT > 0 && p.missCd <= 0) { p.missCd = .55; for (const s of [-1, 1]) this.bullets.push({ x: p.x + s * 14, y: p.y - 6, vx: s * 90, vy: -240, w: 7, h: 14, dmg: d * 2.5, kind: 'missile', t: 0 }); this.audio.sfx('missile'); }
    this.audio.sfx(pl ? 'plasma' : 'shoot'); return true;
  }
  useBomb() {
    const p = this.player; if (this.state !== 'play' || p.bombs <= 0) return; p.bombs--;
    this.rings.push({ x: p.x, y: p.y, r: 10, max: Math.max(LW, this.LH), life: .8, col: '#ff9a3c' }); this.shake = 18; this.audio.sfx('bomb'); this.buzz(120);
    for (const e of this.enemies) { e.hp -= 8; e.flash = .15; }
    if (this.boss && !this.boss.intro) { this.boss.hp -= Math.round(this.boss.max * .08); this.boss.flash = .2; }
    for (const b of this.ebullets) { this.boom(b.x, b.y, '#ffd166', 2, 80); this.spawnCoin(b.x, b.y, 1); } this.ebullets.length = 0;
    this.pushHud();
  }
  useEcho() {
    const p = this.player; if (this.state !== 'play') return;
    if (this.echoMeter < 100) { this.audio.sfx('deny'); return; }
    if (this.rec.length < 20) { this.audio.sfx('deny'); this.onTip && this.onTip('Muévete un poco: el Eco necesita registrar tu recorrido'); setTimeout(() => this.tutorial || this.onTip(null), 1600); return; }
    this.echoMeter = 0; this.run.eco++; this.save.mis.eco++;
    this.echoes.push({ s: this.rec.slice(), i: 0, acc: 0, x: this.rec[0].x, y: this.rec[0].y, life: 1, absorbed: 0 });
    this.audio.sfx('echo'); this.buzz(60); this.banner('ECO TEMPORAL', 'Tu pasado combate a tu lado'); this.pushHud(true);
  }
  spawnCoin(x, y, v) { this.coinsArr.push({ x, y, vx: rand(-40, 40), vy: rand(-80, -20), v, t: 0 }); }
  spawnPower(x, y, k) { if (!k) { const r = Math.random(); k = r < .22 ? 'T' : r < .36 ? 'E' : r < .48 ? 'M' : r < .58 ? 'P' : r < .70 ? 'V' : r < .80 ? 'X' : r < .90 ? 'B' : '+'; } this.powers.push({ x, y, w: 26, h: 26, k, t: 0 }); }

  // ---------- daños ----------
  hurt() {
    const p = this.player; if (p.inv > 0 || p.lives <= 0) return;
    if (p.shield > 0) { p.shield = 0; p.inv = .8; this.boom(p.x, p.y, '#5aa8ff', 16, 200); this.audio.sfx('hit'); this.buzz(30); return; }
    p.lives--; this.run.hits++; p.inv = 2.2; p.tripleT = p.plasmaT = p.missileT = 0; this.combo = 0; this.shake = 16;
    this.boom(p.x, p.y, '#5ef2ff', 40, 320, true); this.audio.sfx('hurt'); this.buzz(200);
    if (p.lives <= 0) { this.phase = 'dead'; this.phaseT = 1.4; this.boom(p.x, p.y, '#ffd166', 60, 400, true); this.audio.sfx('big'); this.audio.music(null); }
    this.pushHud(true);
  }
  killEnemy(e) {
    const d = ENEMIES[e.type]; e.hp = 0; this.addScore(d.score * (e.dive ? 2 : 1)); this.boom(e.x, e.y, d.col, e.type === 2 ? 34 : 18, 220, e.type === 2);
    this.audio.sfx('boom'); this.shake = Math.max(this.shake, e.type === 2 ? 7 : 3);
    if (e.type === 6) { if (Math.random() < .4) this.spawnCoin(e.x, e.y, 1); return; }
    this.run.kills++; this.save.stats.kills++; this.combo++; this.comboT = 2.2; this.run.bestCombo = Math.max(this.run.bestCombo, this.combo);
    this.echoMeter = Math.min(100, this.echoMeter + (e.type === 2 ? 8 : 4) * (1 + .15 * this.save.up.echo));
    if (Math.random() < .5) this.spawnCoin(e.x, e.y, e.type === 2 ? 3 : 1);
    if (Math.random() < .07 + (e.type >= 2 ? .06 : 0)) this.spawnPower(e.x, e.y);
  }
  damageEnemy(e, dm, b) {
    if (e.entry && e.y < 10) return false;
    if (e.sh > 0) { e.sh -= dm >= 3 ? 2 : 1; e.flash = .06; this.boom(b ? b.x : e.x, e.y + 8, '#5aa8ff', 3, 90); this.audio.sfx('hit'); return true; }
    e.hp -= dm; e.flash = .08; if (e.hp <= 0) this.killEnemy(e); else { this.boom(e.x, e.y, '#fff', 3, 90); this.audio.sfx('hit'); } return true;
  }

  // ---------- jefes ----------
  spawnBoss(def) {
    const hpScale = 1 + (this.save.up.dmg * .05);
    this.boss = { def, id: def.id, x: LW / 2, y: -140, w: def.w, h: def.h * .75, hp: Math.round(def.hp * hpScale), max: Math.round(def.hp * hpScale), t: 0, cd: 2, ph: 1, sp: 0, flash: 0, intro: true, dying: 0, dc: 0 };
    this.phase = 'boss'; this.banner('¡ADVERTENCIA!', def.name); this.audio.sfx('warn'); this.audio.music('boss');
  }
  bossShoot(b) {
    const p = this.player, a = Math.atan2(p.y - b.y, p.x - b.x), push = (an, s, r = 5, col = '#ff4f8b') => this.ebullets.push({ x: b.x, y: b.y + 24, vx: Math.cos(an) * s, vy: Math.sin(an) * s, r, col });
    const L = this.levelNum, sp = 190 + L * 7;
    if (b.id === 'destroyer') {
      b.cd = b.ph === 1 ? 1.15 : .95; const n = b.ph === 1 ? 5 : 7; for (let i = 0; i < n; i++) push(Math.PI / 2 + (i - (n - 1) / 2) * .26, sp);
      if (b.ph === 2) { for (let i = -1; i <= 1; i++) push(a + i * .12, sp * 1.3, 4.5, '#ffd166'); }
    } else if (b.id === 'mothership') {
      b.cd = .13; b.sp += .34; push(b.sp, sp, 4.5, '#b26bff'); push(b.sp + Math.PI, sp, 4.5, '#b26bff'); if (b.ph === 2) { push(b.sp + Math.PI / 2, sp, 4.5, '#ff9ae0'); push(b.sp - Math.PI / 2, sp, 4.5, '#ff9ae0'); }
      if (b.ph === 2) { b.drone = (b.drone || 0) + 1; if (b.drone % 60 === 0) { for (const dx of [-60, 60]) this.addEnemy(3, b.x + dx, b.y, b.y + 20, 1, { entry: false, dive: true, vy: 200, divT: 0 }); } }
    } else { // emperador
      if (b.ph === 1) { b.cd = 1; for (let i = 0; i < 7; i++) push(Math.PI / 2 + (i - 3) * .24, sp); }
      else if (b.ph === 2) { b.cd = .12; b.sp += .3; for (let k = 0; k < 3; k++) push(b.sp + k * 2.094, sp, 4.5, '#ff6ad0'); if (!b.aim || b.aim++ % 9 === 0) { b.aim = b.aim || 1; push(a, sp * 1.5, 5, '#ffd166'); } }
      else { b.cd = .1; b.sp += .27; for (let k = 0; k < 2; k++) push(b.sp + k * Math.PI, sp * 1.1, 4.5, '#ff6ad0'); b.rain = (b.rain || 0) + 1; if (b.rain % 4 === 0) this.ebullets.push({ x: rand(20, LW - 20), y: -10, vx: 0, vy: sp * 1.2, r: 4.5, col: '#ffd166' }); if (b.rain % 40 === 0) push(a, sp * 1.6, 6, '#fff'); }
    }
    this.audio.sfx('hit');
  }
  updateBoss(b, dt) {
    b.t += dt; b.flash = Math.max(0, b.flash - dt);
    if (b.dying > 0) { b.dying -= dt; b.dc -= dt; if (b.dc <= 0) { b.dc = .09; this.boom(b.x + rand(-b.w / 2, b.w / 2), b.y + rand(-b.h / 2, b.h / 2), Math.random() < .5 ? '#ffd166' : b.def.col, 22, 300, true); this.audio.sfx('boom'); this.shake = 14; }
      if (b.dying <= 0) this.bossDead(b); return; }
    if (b.intro) { b.y += (185 - b.y) * dt * 1.6; if (b.y > 180) b.intro = false; return; }
    const spd = b.ph === 3 ? 1.5 : b.ph === 2 ? 1.1 : .8; b.x = LW / 2 + Math.sin(b.t * spd) * (LW / 2 - b.w / 2 - 6); b.y = 185 + Math.sin(b.t * 1.7) * 12;
    const f = b.hp / b.max, np = b.id === 'emperor' ? (f < .33 ? 3 : f < .66 ? 2 : 1) : (f < .5 ? 2 : 1);
    if (np !== b.ph) { b.ph = np; this.banner('¡FASE ' + np + '!', b.def.name); this.audio.sfx('warn'); this.shake = 20; this.boom(b.x, b.y, '#fff', 40, 300, true); for (const e of this.ebullets) this.spawnCoin(e.x, e.y, 1); this.ebullets.length = 0; b.cd = 1.2; }
    b.cd -= dt; if (b.cd <= 0) this.bossShoot(b);
    if (hit(b, this.player)) this.hurt();
  }
  bossDead(b) {
    this.run.bosses++; this.save.stats.bosses++; if (b.id === 'emperor') { this.run.emperor = true; this.save.stats.emperor++; }
    this.addScore(3000 + this.levelNum * 300); for (let i = 0; i < b.def.reward * 3; i++) this.spawnCoin(b.x + rand(-60, 60), b.y + rand(-30, 30), 5);
    this.run.crystals += b.def.reward >= 25 ? 5 : b.def.reward >= 10 ? 3 : 2; this.spawnPower(b.x, b.y, '+'); this.spawnPower(b.x + 30, b.y, 'B');
    for (const e of this.ebullets) this.spawnCoin(e.x, e.y, 1); this.ebullets.length = 0; this.boss = null; this.audio.sfx('big'); this.audio.music('game');
  }

  // ---------- bucle ----------
  frame(t) {
    const dt = Math.min(.033, (t - (this.lastT || t)) / 1000); this.lastT = t;
    if (this.state === 'play') { this.update(dt); this.autoQuality(dt); }
    else if (this.state === 'menu' || this.state === 'result') { this.t += dt; }
    if (this.state !== 'pause') render(this, dt);
  }
  autoQuality(dt) {
    if (this.settings().quality !== 'auto') return; this.fpsN++; this.fpsT += dt;
    if (this.fpsN >= 100) { const avg = this.fpsT / this.fpsN; if (avg > 1 / 40 && this.q > 0) this.setQuality(this.q - 1); this.fpsN = 0; this.fpsT = 0; }
  }
  update(dt) {
    const p = this.player, W = LW, H = this.LH, run = this.run, st = this.settings(), K = this.keys;
    this.t += dt; if (this.phase !== 'dead') run.time += dt; this.scrollY += dt * 40;
    // --- jugador
    if (p.lives > 0) {
      const sp = 340 * p.spd * (p.speedT > 0 ? 1.45 : 1);
      let kx = (K.arrowright || K.d ? 1 : 0) - (K.arrowleft || K.a ? 1 : 0), ky = (K.arrowdown || K.s ? 1 : 0) - (K.arrowup || K.w ? 1 : 0);
      if (kx || ky) { const n = Math.hypot(kx, ky); p.tx = p.x + kx / n * sp * dt * 3; p.ty = p.y + ky / n * sp * dt * 3; }
      else if (this.stick.on) { p.tx = p.x + this.stick.dx * sp * dt * 3; p.ty = p.y + this.stick.dy * sp * dt * 3; }
      p.tx = clamp(p.tx, 18, W - 18); p.ty = clamp(p.ty, H * .3, H - 46);
      const k = Math.min(1, dt * 11 * p.spd * (p.speedT > 0 ? 1.3 : 1)), ox = p.x, oy = p.y; p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k;
      this.tut.moved += Math.hypot(p.x - ox, p.y - oy);
      p.inv = Math.max(0, p.inv - dt); for (const q of ['tripleT', 'plasmaT', 'missileT', 'speedT', 'multT', 'shield']) p[q] = Math.max(0, p[q] - dt);
      const firing = st.autofire || K[' '] || this.touching;
      let fired = false; if (firing) fired = this.playerFire(p, dt); else { p.fireCd -= dt; p.missCd -= dt; }
      // grabación del Eco (30 muestras/s, últimos 4 s)
      this.echoRec += dt; while (this.echoRec >= 1 / 30) { this.echoRec -= 1 / 30; this.rec.push({ x: p.x, y: p.y, f: fired ? 1 : 0 }); fired = false; if (this.rec.length > 120) this.rec.shift(); }
    }
    this.comboT -= dt; if (this.comboT <= 0 && this.combo > 0) { this.combo = 0; }
    // --- balas del jugador
    for (const b of this.bullets) {
      if (b.kind === 'missile') { b.t += dt; let tg = null, bd = 1e9; for (const e of this.enemies) { const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2; if (d < bd && e.y > 0) { bd = d; tg = e; } } if (this.boss && !this.boss.intro) tg = tg && bd < 90000 ? tg : this.boss;
        if (tg) { const a = Math.atan2(tg.y - b.y, tg.x - b.x), c = Math.atan2(b.vy, b.vx); let da = a - c; da = Math.atan2(Math.sin(da), Math.cos(da)); const na = c + clamp(da, -dt * 6, dt * 6), sp = Math.min(560, 240 + b.t * 700); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; } else { b.vy -= dt * 600; } }
      b.x += b.vx * dt; b.y += b.vy * dt;
    }
    for (const b of this.ebullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    // --- oleadas / fases del nivel
    this.phaseT -= dt; this.levelFlow(dt);
    // --- enemigos
    const diveL = 1 + this.levelNum * .08;
    for (const e of this.enemies) {
      e.t += dt; e.flash = Math.max(0, e.flash - dt); const fx = e.bx + Math.sin(e.t * 1.1 + e.ph) * 28, fy = e.by + Math.sin(e.t * 1.9 + e.ph) * 5;
      if (e.type === 6) { e.y += e.vy * dt; e.x += e.vx * dt; e.rot += dt * e.vr; e.entry = false; if (e.y > H + 50) e.hp = 0; }
      else if (e.dive) {
        if (e.type === 3) { const a = Math.atan2(p.y - e.y, p.x - e.x), c = Math.atan2(e.vy, e.vx || .001); let da = a - c; da = Math.atan2(Math.sin(da), Math.cos(da)); const na = c + clamp(da, -dt * 1.6, dt * 1.6), s = 280 + this.levelNum * 12; e.vx = Math.cos(na) * s; e.vy = Math.sin(na) * s; }
        else { e.vx = Math.sin(e.t * 5 + e.ph) * 160; e.vy = 230 * diveL; }
        e.x += e.vx * dt; e.y += e.vy * dt; if (e.y > H + 40 || e.x < -60 || e.x > W + 60) { if (e.type === 3 && e.spawnSwarm) e.hp = 0; else { e.dive = false; e.y = -40; e.entry = true; e.x = e.bx; } }
      } else if (e.entry) { e.x += (fx - e.x) * dt * 3.2; e.y += (fy - e.y) * dt * 3.2; if (Math.abs(fy - e.y) < 3 && e.y > 0) e.entry = false; }
      else {
        e.x = fx; e.y = fy; if (e.divT > 0 && (e.divT -= dt) <= 0 && this.phase === 'wave' && p.lives > 0) { e.dive = true; e.vx = 0; e.vy = 160; this.audio.sfx('hit'); }
        e.cd -= dt; const d = ENEMIES[e.type]; if (d.fire && e.cd <= 0 && e.tele <= 0 && p.lives > 0) { e.cd = (1 / (d.fire * (1 + this.levelNum * .05))) * rand(.7, 1.5) * Math.max(1, this.enemies.length / 14); this.enemyShoot(e); }
      }
      if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { this.ebullets.push({ x: e.x, y: e.y + 10, vx: Math.cos(e.ang) * 470, vy: Math.sin(e.ang) * 470, r: 3.5, col: '#3ce0b0', tail: true }); this.audio.sfx('missile'); } }
      if (!e.entry && p.lives > 0 && hit(e, p)) { if (e.type === 6) { e.hp = 0; } else if (e.type !== 2) e.hp = 0; if (e.hp <= 0) this.boom(e.x, e.y, ENEMIES[e.type].col, 14); this.hurt(); }
    }
    if (this.boss) this.updateBoss(this.boss, dt);
    // --- colisiones balas jugador
    for (const b of this.bullets) {
      if (b.y < -30 || b.dead) continue;
      for (const e of this.enemies) { if (e.hp > 0 && !(b.hits && b.hits.includes(e)) && hit(b, e)) { if (this.damageEnemy(e, b.dmg, b)) { if (b.hits) b.hits.push(e); else { b.dead = true; if (b.kind === 'missile') this.boom(b.x, b.y, '#ff9a3c', 10, 150); } } if (!b.hits) break; } }
      if (this.boss && !b.dead && !this.boss.intro && !this.boss.dying && !(b.hits && b.hits.includes(this.boss)) && hit(b, this.boss)) {
        const B = this.boss; B.hp -= b.dmg; B.flash = .06; this.echoMeter = Math.min(100, this.echoMeter + .25); this.boom(b.x, b.y, '#ffd166', 3, 100); this.audio.sfx('hit');
        if (b.hits) b.hits.push(B); else b.dead = true; if (B.hp <= 0 && !B.dying) { B.dying = 1.8; B.dc = 0; this.ebullets.length = 0; this.audio.music(null); }
      }
    }
    sweep(this.bullets, b => !b.dead && b.y > -30 && b.y < H + 30 && b.x > -30 && b.x < W + 30);
    // --- Eco temporal: reproduce el pasado del jugador
    for (const g of this.echoes) {
      g.acc += dt; const step = 1 / 30; while (g.acc >= step && g.i < g.s.length - 1) { g.acc -= step; g.i++; const s = g.s[g.i]; g.x = s.x; g.y = s.y;
        if (s.f) { this.bullets.push({ x: g.x, y: g.y - 24, vx: 0, vy: -780, w: 5, h: 16, dmg: p.dmg * 1.3, kind: 'echo' }); if (g.i % 4 === 0) this.audio.sfx('shoot'); } }
      for (const b of this.ebullets) if (!b.dead && (b.x - g.x) ** 2 + (b.y - g.y) ** 2 < 28 * 28) { b.dead = true; g.absorbed++; this.boom(b.x, b.y, '#9ae6ff', 3, 80); this.addScore(5); }
      if (g.i >= g.s.length - 1) { g.over = true; this.boom(g.x, g.y, '#9ae6ff', 50, 360, true); this.rings.push({ x: g.x, y: g.y, r: 6, max: 130, life: .5, col: '#9ae6ff' }); this.audio.sfx('echoEnd'); this.shake = 10;
        for (const e of this.enemies) if ((e.x - g.x) ** 2 + (e.y - g.y) ** 2 < 130 * 130) { e.sh = 0; this.damageEnemy(e, 6, null); } if (this.boss && !this.boss.intro && (this.boss.x - g.x) ** 2 + (this.boss.y - g.y) ** 2 < 160 * 160) { this.boss.hp -= 12; this.boss.flash = .15; if (this.boss.hp <= 0 && !this.boss.dying) { this.boss.dying = 1.8; this.boss.dc = 0; this.audio.music(null); } } }
    }
    sweep(this.echoes, g => !g.over);
    // --- balas enemigas
    for (const b of this.ebullets) if (!b.dead && p.lives > 0 && Math.abs(b.x - p.x) < p.w / 2 + b.r && Math.abs(b.y - p.y) < p.h / 2 + b.r) { b.dead = true; this.hurt(); }
    sweep(this.ebullets, b => !b.dead && b.y < H + 30 && b.y > -40 && b.x > -40 && b.x < W + 40);
    sweep(this.enemies, e => e.hp > 0);
    // --- objetos: monedas / potenciadores
    const mg = 60 + this.save.up.magnet * 38;
    for (const c of this.coinsArr) { c.t += dt; c.vy += 260 * dt * (c.t < .4 ? 1 : 0); if (c.t > .4) c.vy = Math.min(c.vy, 110); const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
      if (d < mg && p.lives > 0) { c.x += dx / d * 380 * dt; c.y += dy / d * 380 * dt; } else { c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= .96; }
      if (d < 20 && p.lives > 0) { c.dead = true; run.coins += c.v; this.save.stats.coinsTotal += c.v; this.audio.sfx('coin'); } else if (c.y > H + 20) c.dead = true; }
    sweep(this.coinsArr, c => !c.dead);
    for (const w of this.powers) { w.t += dt; w.y += 95 * dt; if (p.lives > 0 && hit(w, { x: p.x, y: p.y, w: 34, h: 34 })) { w.dead = true; this.collect(w.k, w); } else if (w.y > H + 30) w.dead = true; }
    sweep(this.powers, w => !w.dead);
    // --- efectos
    for (const q of this.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .96; q.vy *= .96; q.life -= dt; } sweep(this.parts, q => q.life > 0);
    for (const r of this.rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 7); } sweep(this.rings, r => r.life > 0);
    for (const x of this.texts) { x.life -= dt * 1.1; x.y -= 30 * dt; } sweep(this.texts, x => x.life > 0);
    this.shake = Math.max(0, this.shake - dt * 28);
    if (this.tutorial) this.tutorialStep(dt);
    this.pushHud();
  }
  collect(k, w) {
    const p = this.player, d = POWER[k]; this.audio.sfx('power'); this.buzz(25); this.text(w.x, w.y, d[2], d[1]); this.addScore(50);
    if (k === 'T') p.tripleT = d[0]; else if (k === 'P') { p.plasmaT = d[0]; } else if (k === 'M') p.missileT = d[0]; else if (k === 'E') p.shield = d[0] + this.save.up.shield * 2;
    else if (k === 'V') p.speedT = d[0]; else if (k === 'X') p.multT = d[0]; else if (k === '+') { p.lives = Math.min(p.maxLives, p.lives + 1); } else if (k === 'B') p.bombs = Math.min(5, p.bombs + 1);
    this.pushHud(true);
  }
  levelFlow(dt) {
    const p = this.player, L = this.levelNum, lv = this.level;
    if (this.phase === 'dead') { if (this.phaseT <= 0) this.finish(false); return; }
    if (this.phase === 'clear') { if (this.phaseT <= 0) this.finish(true); return; }
    if (this.phase === 'intro') { if (this.phaseT <= 0 && (!this.tutorial || this.tut.step >= 1)) this.spawnWave(); return; }
    // asteroides
    if (lv.rocks && (this.phase === 'wave' || this.phase === 'between')) { this.rockT -= dt; if (this.rockT <= 0) { this.rockT = rand(2.2, 4.2) - L * .12; const e = this.addEnemy(6, rand(30, LW - 30), 0, -40, 1, { vy: rand(80, 150), vx: rand(-30, 30), vr: rand(-2, 2), entry: false }); e.y = -40; } }
    if (this.phase === 'wave') {
      // enjambre de kamikazes
      if (lv.types.includes(3) && this.wave >= 2) { this.swarmT -= dt; if (this.swarmT <= 0) { this.swarmT = 9 - Math.min(4, L * .4); for (let i = 0; i < 2 + Math.floor(L / 4); i++) this.addEnemy(3, rand(40, LW - 40), 0, -30 - i * 34, 1, { entry: false, dive: true, vx: 0, vy: 160, spawnSwarm: true, divT: 0 }); } }
      const alive = this.enemies.some(e => e.type !== 6 && !e.spawnSwarm) || this.enemies.some(e => e.entry && e.type !== 6);
      if (!alive) { for (const e of this.enemies) if (e.type !== 6 && e.spawnSwarm) this.killEnemy(e);
        if (this.wave < WAVES_PER_LEVEL) { this.phase = 'between'; this.phaseT = 1.6; if (!this.tutorial) this.addScore(200); }
        else if (BOSSES[L]) { this.phase = 'bossWait'; this.phaseT = 1.8; } else { this.phase = 'clear'; this.phaseT = 2; this.audio.sfx('win'); this.audio.music(null); } }
    } else if (this.phase === 'between') { if (this.phaseT <= 0 && (!this.tutorial || this.tut.step >= 1)) this.spawnWave(); }
    else if (this.phase === 'bossWait') { if (this.phaseT <= 0) this.spawnBoss(BOSSES[L]); }
    else if (this.phase === 'boss') { if (!this.boss) { this.phase = 'clear'; this.phaseT = 2.5; this.audio.sfx('win'); } }
  }
  tutorialStep(dt) {
    const T = this.tut, p = this.player; T.t += dt; if (this.phase === 'intro' && T.step === 0 && T.t < 1) return;
    const next = (txt, fn) => { T.step++; T.t = 0; this.onTip(txt); this.audio.sfx('click'); fn && fn(); };
    if (T.step === 0 && ((T.moved > 90 && T.t > 2) || T.t > 7)) next('Tu nave dispara sola: ¡destruye a los aliens!', () => { T.kills0 = this.run.kills; });
    else if (T.step === 1 && ((this.run.kills - T.kills0 >= 3 && T.t > 2) || T.t > 12)) next('Recoge los ítems brillantes: dan poderes', () => this.spawnPower(p.x, p.y - 220, 'T'));
    else if (T.step === 2 && ((p.tripleT > 0 && T.t > 1.5) || T.t > 9)) next('Matar aliens carga ECO: toca ECO y tu pasado combatirá contigo', () => { this.echoMeter = 100; });
    else if (T.step === 3 && ((this.run.eco > 0 && T.t > 1.5) || T.t > 10)) next('Entre misiones mejora tu nave en Hangar y Mejoras', null);
    else if (T.step === 4 && T.t > 3.5) { this.tutorial = false; this.save.settings.tutorialDone = true; this.onTip(null); }
  }
  finish(win) {
    const r = this.run, sv = this.save; this.state = 'result'; this.onTip(null);
    const bonusCoins = win ? 40 * r.level + (r.hits === 0 ? 120 : 0) : 0, stars = !win ? 0 : r.hits === 0 ? 3 : r.hits <= 2 ? 2 : 1;
    const xp = Math.round(r.score / 40) + (win ? 60 * r.level : 0);
    sv.coins += r.coins + bonusCoins; sv.crystals += r.crystals; sv.xp += xp; sv.stats.runs++; sv.stats.time += r.time; sv.stats.bestCombo = Math.max(sv.stats.bestCombo, r.bestCombo);
    if (win && r.hits === 0) sv.stats.flawless++; if (win) sv.maxLevel = Math.max(sv.maxLevel, Math.min(LEVELS.length + 1, r.level + 1));
    const isBest = r.score > sv.best; if (isBest) sv.best = r.score;
    sv.scores.push({ s: r.score, l: r.level, w: win ? 1 : 0, d: Date.now() }); sv.scores.sort((a, b) => b.s - a.s); sv.scores.length = Math.min(sv.scores.length, 10);
    if (r.score > 0) { sv.pending.push({ score: r.score, level: r.level, kills: r.kills, time: Math.round(r.time), win: win ? 1 : 0, ts: Date.now() }); if (sv.pending.length > 30) sv.pending.shift(); }
    if (!win) this.audio.sfx('lose'); this.audio.music('menu');
    this.onEnd({ win, score: r.score, kills: r.kills, coins: r.coins, bonusCoins, crystals: r.crystals, xp, time: r.time, stars, level: r.level, isBest, hits: r.hits, bestCombo: r.bestCombo, eco: r.eco });
  }
}
