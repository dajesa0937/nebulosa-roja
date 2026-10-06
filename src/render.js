// Dibujo del campo de juego. Todo con sprites pre-renderizados + mezcla aditiva para brillos.
import { shipSprite, enemySprite, bossSprite, glowSprite } from './sprites.js';
import { POWER } from './data.js';
const TAU = Math.PI * 2;
function glow(ctx, color, x, y, r, a = 1) { ctx.globalAlpha = a; const s = glowSprite(color, 32); ctx.drawImage(s, x - r, y - r, r * 2, r * 2); }

export function render(g, dt) {
  const ctx = g.ctx, W = g.LW || 480, H = g.LH, QC = g.QC; const LWc = 480;
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.save();
  if (g.shake > 0 && g.state === 'play') ctx.translate((Math.random() - .5) * g.shake, (Math.random() - .5) * g.shake);
  // fondo: nebulosa desplazable
  const nh = LWc * 2, off = QC.nebScroll ? (g.scrollY * .5) % nh : 0;
  for (let y = -nh + off; y < H; y += nh) ctx.drawImage(g.neb, -4, y, LWc + 8, nh);
  // estrellas con parallax
  const speed = g.state === 'play' ? 1 : .35;
  ctx.fillStyle = '#efe9ff';
  for (const s of g.stars) { s.y += s.z * s.z * 160 * dt * speed; if (s.y > H) { s.y = 0; s.x = Math.random() * LWc; } ctx.globalAlpha = .25 + s.z * .7; const z = s.z * 2.2; ctx.fillRect(s.x, s.y, z, z * (1 + s.z * 2.5)); }
  ctx.globalAlpha = 1;
  if (g.state === 'menu' || g.state === 'result' || !g.player) { drawMenuShip(g, ctx, H); ctx.restore(); return; }
  const p = g.player, t = g.t, light = QC.glow;

  // asteroides y enemigos
  for (const e of g.enemies) {
    ctx.save(); ctx.translate(e.x, e.y); if (e.type === 6) ctx.rotate(e.rot);
    const f = Math.sin(e.t * 9) > 0 ? 1 : 0, sp = enemySprite(e.type, f); ctx.drawImage(sp, -30, -30, 60, 60);
    if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .8; ctx.drawImage(sp, -30, -30, 60, 60); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if (e.sh > 0) { ctx.strokeStyle = `rgba(120,190,255,${.55 + Math.sin(t * 8) * .25})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(90,168,255,.12)'; ctx.fill(); }
    if (e.type === 2 && e.hp < e.max) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(-16, -26, 32, 4); ctx.fillStyle = '#b26bff'; ctx.fillRect(-16, -26, 32 * e.hp / e.max, 4); }
    ctx.restore();
    if (e.tele > 0) { ctx.strokeStyle = `rgba(60,224,176,${.3 + (.7 - e.tele) * .9})`; ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(e.ang) * 900, e.y + Math.sin(e.ang) * 900); ctx.stroke(); ctx.setLineDash([]); }
  }
  // jefe
  if (g.boss) drawBoss(g, ctx);
  // monedas y potenciadores
  ctx.globalCompositeOperation = 'lighter';
  for (const c of g.coinsArr) { glow(ctx, '#ffd166', c.x, c.y, 12, .7); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  for (const c of g.coinsArr) { const w = Math.abs(Math.cos(t * 6 + c.x)) * 4 + 1; ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.ellipse(c.x, c.y, w, 5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#a8741a'; ctx.lineWidth = 1; ctx.stroke(); }
  for (const w of g.powers) {
    const d = POWER[w.k], r = 13 + Math.sin(w.t * 6) * 1.5;
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, d[1], w.x, w.y, 26, .8); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(10,6,30,.85)'; ctx.beginPath(); ctx.arc(w.x, w.y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = d[1]; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = d[1]; ctx.font = '700 15px Rajdhani,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(w.k === 'X' ? '2×' : w.k, w.x, w.y + 1);
  }
  // balas enemigas
  for (const b of g.ebullets) {
    if (light) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, b.col, b.x, b.y, b.r * 3.2, .85); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * .55, 0, TAU); ctx.fill();
    if (b.tail) { ctx.strokeStyle = b.col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * .04, b.y - b.vy * .04); ctx.stroke(); }
    else { ctx.strokeStyle = b.col; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); }
  }
  // balas del jugador
  for (const b of g.bullets) {
    const col = b.kind === 'plasma' ? '#c58bff' : b.kind === 'missile' ? '#ff9a3c' : b.kind === 'echo' ? '#9ae6ff' : '#5ef2ff';
    if (light) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, col, b.x, b.y, b.kind === 'plasma' ? 22 : 13, .8); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    ctx.fillStyle = col; ctx.globalAlpha = b.kind === 'echo' ? .8 : 1; ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    ctx.fillStyle = '#fff'; ctx.fillRect(b.x - b.w / 4, b.y - b.h / 2, b.w / 2, b.h); ctx.globalAlpha = 1;
  }
  // ecos
  for (const e of g.echoes) {
    const sp = shipSprite(g.ship.id, '#9ae6ff'); ctx.globalAlpha = .55 + Math.sin(t * 20) * .12;
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, '#7ad8ff', e.x, e.y, 38, .55); ctx.globalAlpha = .55; ctx.drawImage(sp, e.x - 36, e.y - 36, 72, 72);
    ctx.globalAlpha = .35; ctx.strokeStyle = '#9ae6ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(e.x, e.y, 26, 0, TAU); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // estela del recorrido que viene
    ctx.strokeStyle = 'rgba(154,230,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = e.i; i < Math.min(e.s.length, e.i + 30); i += 3) { const s = e.s[i]; i === e.i ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y); } ctx.stroke();
  }
  // jugador
  if (p.lives > 0 && (p.inv <= 0 || Math.floor(p.inv * 14) % 2)) drawPlayer(g, ctx, p, t);
  // partículas
  ctx.globalCompositeOperation = 'lighter';
  for (const q of g.parts) { ctx.globalAlpha = Math.max(0, Math.min(1, q.life * 1.6)); ctx.fillStyle = q.col; ctx.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz); }
  for (const r of g.rings) { ctx.globalAlpha = Math.max(0, r.life * 2); ctx.strokeStyle = r.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  for (const x of g.texts) { ctx.globalAlpha = Math.max(0, x.life); ctx.fillStyle = x.col; ctx.font = '700 17px Rajdhani,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(x.txt, x.x, x.y); } ctx.globalAlpha = 1;
  // joystick
  if (g.stick.on) { const s = g.stick; ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.ox, s.oy, 55, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(94,242,255,.35)'; ctx.beginPath(); ctx.arc(s.ox + s.dx * 55, s.oy + s.dy * 55, 22, 0, TAU); ctx.fill(); }
  // barra del jefe
  if (g.boss) { const b = g.boss, bw = Math.min(360, W - 60), x = (W - bw) / 2, y = 84; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - 2, y - 2, bw + 4, 12); ctx.fillStyle = b.def.col; ctx.fillRect(x, y, bw * Math.max(0, b.hp) / b.max, 8);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '700 12px Orbitron,Rajdhani,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(b.def.name, W / 2, y + 24);
    if (b.id === 'emperor') { ctx.fillStyle = 'rgba(0,0,0,.6)'; [.33, .66].forEach(m => ctx.fillRect(x + bw * m - 1, y, 2, 8)); } }
  ctx.restore();
}
function drawPlayer(g, ctx, p, t) {
  const sp = shipSprite(g.ship.id, g.shipColor), th = g.QC.glow;
  ctx.save(); ctx.translate(p.x, p.y);
  // llama del motor
  const fl = 14 + Math.random() * 9 + (p.speedT > 0 ? 10 : 0);
  ctx.globalCompositeOperation = 'lighter'; glow(ctx, p.speedT > 0 ? '#fff36a' : '#ffa23c', 0, 24, 22, .7);
  ctx.fillStyle = '#ffd98a'; ctx.globalAlpha = .9; ctx.beginPath(); ctx.moveTo(-6, 16); ctx.lineTo(0, 16 + fl); ctx.lineTo(6, 16); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(sp, -36, -36, 72, 72);
  if (p.shield > 0) { const a = p.shield < 2 ? (Math.floor(t * 10) % 2 ? .2 : .6) : .55; ctx.strokeStyle = `rgba(110,190,255,${a})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.stroke(); ctx.fillStyle = `rgba(90,168,255,${a * .22})`; ctx.fill(); }
  ctx.restore();
}
function drawBoss(g, ctx) {
  const b = g.boss, sp = bossSprite(b.id, b.def.col), w = 240, h = 140; ctx.save(); ctx.translate(b.x, b.y);
  if (b.dying > 0) ctx.translate((Math.random() - .5) * 6, (Math.random() - .5) * 6);
  ctx.globalCompositeOperation = 'lighter'; glow(ctx, b.def.col, 0, 0, 120, .22 + Math.sin(g.t * 3) * .06); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.drawImage(sp, -w / 2, -h / 2, w, h);
  if (b.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .7; ctx.drawImage(sp, -w / 2, -h / 2, w, h); }
  ctx.restore(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
function drawMenuShip(g, ctx, H) {
  // Escena del menú: planeta rojo con atmósfera y aliens lejanos cruzando.
  const W = 480, t = g.t, pr = W * .62, px = W * .86, py = H * .9;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; glow(ctx, '#ff3b6a', px - pr * .1, py - pr * .15, pr * 1.55, .35);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const pg = ctx.createRadialGradient(px - pr * .45, py - pr * .5, pr * .1, px, py, pr);
  pg.addColorStop(0, '#ff9a5a'); pg.addColorStop(.35, '#d6304a'); pg.addColorStop(.75, '#5a0f3a'); pg.addColorStop(1, '#14061c');
  ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.clip();
  ctx.globalAlpha = .12; ctx.fillStyle = '#2a0620'; for (let i = 0; i < 7; i++) ctx.fillRect(px - pr, py - pr * .9 + i * pr * .26 + Math.sin(t * .2 + i) * 4, pr * 2, pr * .1);
  ctx.restore(); ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,170,150,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, pr, Math.PI * 1.02, Math.PI * 1.5); ctx.stroke();
  // aliens lejanos cruzando
  for (let i = 0; i < 4; i++) {
    const k = (t * (.018 + i * .006) + i * .27) % 1, x = -40 + k * (W + 80), y = H * (.12 + i * .075) + Math.sin(t * 1.3 + i * 2) * 10;
    ctx.globalAlpha = .28; const s = enemySprite(i % 3 === 2 ? 4 : i % 3, Math.sin(t * 6 + i) > 0 ? 1 : 0), z = 34 + i * 5; ctx.drawImage(s, x - z / 2, y - z / 2, z, z);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
