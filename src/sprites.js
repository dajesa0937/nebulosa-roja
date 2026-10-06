// Todo el arte se dibuja por código (original, sin imágenes con copyright) y se pre-renderiza en canvas.
import { SHIPS, ENEMIES, BOSSES } from './data.js';
const cache = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };
export function shade(hex, a) { // a>0 aclara, a<0 oscurece
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(a >= 0 ? v + (255 - v) * a : v * (1 + a))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
export function glowSprite(color, r = 32) {
  const k = 'g' + color + r; if (cache.has(k)) return cache.get(k);
  const c = mk(r * 2, r * 2), x = c.getContext('2d'), g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, color); g.addColorStop(.25, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalAlpha = 1; x.fillStyle = g; x.fillRect(0, 0, r * 2, r * 2); cache.set(k, c); return c;
}
function sprite(w, h, S, fn) { const c = mk(w * S, h * S), x = c.getContext('2d'); x.scale(S, S); x.translate(w / 2, h / 2); fn(x); return c; }
const lg = (x, y0, y1, c0, c1) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };
function poly(x, pts, fill, stroke) { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = 1.2; x.stroke(); } }

// ---------- Naves del jugador (casco metálico iluminado + acentos de color) ----------
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const bbox = pts => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; };
const tr = (x, pts) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); };
const mir = pts => pts.map(([a, b]) => [-a, b]).reverse();
// Pieza de casco: degradado metálico, brillo especular desde arriba-izquierda, sombra interior y filo de luz.
function plate(x, pts, base, o = {}) {
  const [x0, y0, x1, y1] = bbox(pts); tr(x, pts);
  const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, shade(base, .5)); g.addColorStop(.4, shade(base, .06)); g.addColorStop(1, shade(base, -.62));
  x.fillStyle = g; x.fill(); x.save(); tr(x, pts); x.clip();
  const s = x.createLinearGradient(x0, y0, x0 + (x1 - x0) * .7, y0 + (y1 - y0) * .7); s.addColorStop(0, 'rgba(255,255,255,.3)'); s.addColorStop(.6, 'rgba(255,255,255,0)');
  x.fillStyle = s; x.fillRect(x0, y0, x1 - x0, y1 - y0); x.lineJoin = 'round'; tr(x, pts); x.strokeStyle = 'rgba(0,0,12,.6)'; x.lineWidth = o.edge || 3.2; x.stroke(); x.restore();
  tr(x, pts); const rg = x.createLinearGradient(x0, y0, x1, y1); rg.addColorStop(0, o.rim || 'rgba(255,255,255,.9)'); rg.addColorStop(.55, 'rgba(255,255,255,.2)'); rg.addColorStop(1, 'rgba(255,255,255,.05)');
  x.strokeStyle = rg; x.lineWidth = .8; x.lineJoin = 'round'; x.stroke();
}
function seam(x, pts, w = .6) { x.lineJoin = 'round'; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.strokeStyle = 'rgba(0,0,12,.75)'; x.lineWidth = w; x.stroke(); x.save(); x.translate(.45, .45); x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = w * .8; x.stroke(); x.restore(); }
function stripes(x, pts, col, gap = 4.5) { x.save(); tr(x, pts); x.clip(); const [x0, y0, x1, y1] = bbox(pts); x.strokeStyle = col; x.globalAlpha = .6; x.lineWidth = gap * .45; for (let i = x0 - (y1 - y0); i < x1 + 4; i += gap) { x.beginPath(); x.moveTo(i, y1); x.lineTo(i + (y1 - y0), y0); x.stroke(); } x.restore(); }
function cyl(x, cx, y0, w, h, base) { const g = x.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); g.addColorStop(0, shade(base, -.6)); g.addColorStop(.35, shade(base, .5)); g.addColorStop(1, shade(base, -.6)); x.fillStyle = g; x.fillRect(cx - w / 2, y0, w, h); x.strokeStyle = 'rgba(0,0,10,.65)'; x.lineWidth = .5; x.strokeRect(cx - w / 2, y0, w, h); }
function rivets(x, list, r = .7) { for (const [a, b] of list) { x.fillStyle = 'rgba(0,0,0,.5)'; x.beginPath(); x.arc(a + .3, b + .3, r, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(a, b, r * .8, 0, 7); x.fill(); } }
function glowAt(x, cx, cy, r, col, a = 1) { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = a; x.drawImage(glowSprite(col, 32), cx - r, cy - r, r * 2, r * 2); x.restore(); }
function nozzle(x, cx, cy, r, col = '#ffb450') { const g = x.createRadialGradient(cx, cy, r * .2, cx, cy, r); g.addColorStop(0, '#12121a'); g.addColorStop(.7, '#3a3a48'); g.addColorStop(1, '#98a3ba'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,10,.7)'; x.lineWidth = .6; x.stroke(); glowAt(x, cx, cy, r * 1.7, col, .9); x.fillStyle = '#fff3d0'; x.beginPath(); x.arc(cx, cy, r * .38, 0, 7); x.fill(); }
function canopy(x, cx, cy, rx, ry, tint = '#5ef2ff') { const g = x.createLinearGradient(cx, cy - ry, cx, cy + ry); g.addColorStop(0, '#d8efff'); g.addColorStop(.25, shade(tint, -.2)); g.addColorStop(.6, '#0a1a3a'); g.addColorStop(1, '#030814'); x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(20,24,36,.95)'; x.lineWidth = 1; x.stroke(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(cx - rx * .3, cy - ry * .35, rx * .28, ry * .4, -.3, 0, 7); x.fill(); }
const HULL = { interceptor: '#8693ab', destroyer: '#867b74', guardian: '#7d9486', plasma: '#7b749f', titan: '#77705f' };
export const SHIP_ENGINES = { interceptor: [[0, 26]], destroyer: [[-6, 27], [6, 27]], guardian: [[-8, 26], [8, 26]], plasma: [[0, 21]], titan: [[-14, 28], [14, 28]] };
const both = (x, pts, base, o) => { plate(x, pts, base, o); plate(x, mir(pts), base, o); };
const SHIP_DRAW = {
  interceptor(x, c) {
    const h = HULL.interceptor;
    both(x, [[-4, -6], [-32, 22], [-30, 28], [-12, 23], [-4, 20]], h); both(x, [[-6, -1], [-29, 21], [-27, 23.5], [-5, 4]], c, { edge: 1 });
    both(x, [[-4, -17], [-13, -10], [-4, -9]], h, { edge: 1.4 });
    plate(x, [[0, -34], [4, -20], [6, -2], [6, 18], [3, 27], [-3, 27], [-6, 18], [-6, -2], [-4, -20]], h);
    plate(x, [[0, -27], [2, -14], [2.3, 17], [-2.3, 17], [-2, -14]], c, { edge: 1 });
    x.fillStyle = '#07080e'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 6, -1); x.lineTo(s * 9, 0); x.lineTo(s * 9, 9); x.lineTo(s * 6, 10); x.closePath(); x.fill(); }
    seam(x, [[-6, 12], [-15, 16]]); seam(x, [[6, 12], [15, 16]]); seam(x, [[-12, 6], [-24, 20]], .5); seam(x, [[12, 6], [24, 20]], .5);
    rivets(x, [[-3.5, 4], [3.5, 4], [-3.5, 14], [3.5, 14], [-18, 20], [18, 20]]);
    canopy(x, 0, -12, 3.2, 8, c); nozzle(x, 0, 26, 3.8);
    glowAt(x, -30, 27, 4.5, '#ff3a3a', .9); glowAt(x, 30, 27, 4.5, '#3aff6a', .9);
  },
  destroyer(x, c) {
    const h = HULL.destroyer;
    const wing = [[-9, -8], [-35, -4], [-33, 20], [-10, 17]]; both(x, wing, h); x.save(); stripes(x, wing, c); stripes(x, mir(wing), c); x.restore();
    for (const s of [-1, 1]) { const px = s * 26.5; plate(x, s < 0 ? [[-31, -10], [-22, -10], [-21, 10], [-32, 10]] : [[22, -10], [31, -10], [32, 10], [21, 10]], '#55555f'); cyl(x, px, -27, 3.6, 18, '#3c3c46'); glowAt(x, px, -27, 3.6, c, .85); rivets(x, [[px - 3, -6], [px + 3, -6], [px - 3, 6], [px + 3, 6]], .6); }
    plate(x, [[0, -27], [8, -14], [11, 4], [10, 22], [5, 28], [-5, 28], [-10, 22], [-11, 4], [-8, -14]], h);
    plate(x, [[0, -22], [5, -12], [6, 6], [0, 11], [-6, 6], [-5, -12]], shade(h, .15) && '#a79b92');
    plate(x, [[0, -20], [1.8, -10], [1.8, 8], [-1.8, 8], [-1.8, -10]], c, { edge: 1 });
    x.fillStyle = '#0a0a10'; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) x.fillRect(s * 8 - 1.5, 8 + i * 3, 3, 1.6);
    seam(x, [[-8, -14], [8, -14]]); seam(x, [[-10, 2], [10, 2]]); canopy(x, 0, -9, 2.8, 6, c);
    nozzle(x, -6, 27.5, 3.3); nozzle(x, 6, 27.5, 3.3);
  },
  guardian(x, c) {
    const h = HULL.guardian, hull = []; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; hull.push([Math.cos(a) * 19, 3 + Math.sin(a) * 24]); }
    both(x, [[-12, 10], [-31, 18], [-32, 26], [-14, 26]], h);
    plate(x, hull, h);
    both(x, [[-3, -31], [-19, -21], [-28, 0], [-22, 3], [-14, -13], [-2, -24]], '#6b7d72'); both(x, [[-3, -31], [-19, -21], [-20.8, -17.6], [-4.2, -27.6]], c, { edge: 1 });
    for (const s of [-1, 1]) { const ex = s * 25, ey = -4; x.fillStyle = '#10141a'; x.beginPath(); x.arc(ex, ey, 4, 0, 7); x.fill(); glowAt(x, ex, ey, 9, c, .9); x.fillStyle = '#eafff0'; x.beginPath(); x.arc(ex, ey, 1.5, 0, 7); x.fill(); }
    seam(x, [[-12, -8], [12, -8]]); seam(x, [[-17, 6], [17, 6]]); seam(x, [[-14, 16], [14, 16]]);
    rivets(x, [[-10, -4], [10, -4], [-13, 10], [13, 10], [-8, 20], [8, 20]]);
    canopy(x, 0, -3, 6, 9, c); nozzle(x, -8, 26, 3.6, '#7ab8ff'); nozzle(x, 8, 26, 3.6, '#7ab8ff');
  },
  plasma(x, c) {
    const h = HULL.plasma;
    plate(x, [[0, -33], [8, -12], [26, 10], [33, 27], [17, 19], [6, 23], [0, 17], [-6, 23], [-17, 19], [-33, 27], [-26, 10], [-8, -12]], h);
    for (const s of [-1, 1]) { const f = [[s * 8, -10], [s * 27, 7], [s * 31, 24], [s * 18, 16]]; tr(x, f); const g = x.createLinearGradient(0, -10, 0, 24); g.addColorStop(0, rgba(c, .15)); g.addColorStop(1, rgba(c, .7)); x.fillStyle = g; x.fill(); x.strokeStyle = rgba('#ffffff', .6); x.lineWidth = .7; x.stroke();
      glowAt(x, s * 31, 25, 6, c, .85); x.save(); x.shadowColor = c; x.shadowBlur = 4; x.strokeStyle = c; x.lineWidth = 1.3; x.beginPath(); x.moveTo(0, 3); x.quadraticCurveTo(s * 14, 0, s * 29, 22); x.stroke(); x.restore(); }
    plate(x, [[0, -26], [3.5, -10], [3, 12], [-3, 12], [-3.5, -10]], h, { edge: 1.6 });
    seam(x, [[-6, -6], [-3.5, 14]]); seam(x, [[6, -6], [3.5, 14]]);
    x.fillStyle = '#0c0a18'; x.beginPath(); x.arc(0, 3, 8.2, 0, 7); x.fill(); x.strokeStyle = shade(h, .3); x.lineWidth = 1.2; x.stroke(); glowAt(x, 0, 3, 17, c, 1); x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 3, 3.6, 0, 7); x.fill();
    canopy(x, 0, -15, 2.6, 6.5, c); nozzle(x, 0, 21, 4.8, c);
  },
  titan(x, c) {
    const h = HULL.titan;
    plate(x, [[-12, -30], [12, -30], [20, -18], [30, -8], [32, 16], [24, 29], [-24, 29], [-32, 16], [-30, -8], [-20, -18]], h);
    plate(x, [[-14, -30], [14, -30], [19, -15], [-19, -15]], '#8b8472'); plate(x, [[-21, -13], [21, -13], [28, 2], [-28, 2]], '#6c6656'); plate(x, [[-27, 4], [27, 4], [28, 19], [20, 26], [-20, 26], [-28, 19]], '#7e7765');
    for (const y of [-14, 3]) { plate(x, [[-22, y - 1], [22, y - 1], [22, y + 1.2], [-22, y + 1.2]], c, { edge: .8 }); }
    for (const s of [-1, 1]) { const px = s * 24; x.fillStyle = '#0d0d12'; x.fillRect(px - 4.5, -10, 9, 15); x.strokeStyle = shade(h, .3); x.lineWidth = .7; x.strokeRect(px - 4.5, -10, 9, 15); for (let i = 0; i < 3; i++) { x.fillStyle = '#31111a'; x.beginPath(); x.arc(px, -6 + i * 4.2, 1.4, 0, 7); x.fill(); glowAt(x, px, -6 + i * 4.2, 3, '#ff5a3a', .55); } }
    cyl(x, 0, -34, 6.2, 14, '#4a4a56'); x.fillStyle = shade(c, -.1); x.fillRect(-4.6, -35.4, 9.2, 3.2); x.strokeStyle = 'rgba(0,0,10,.7)'; x.lineWidth = .5; x.strokeRect(-4.6, -35.4, 9.2, 3.2); glowAt(x, 0, -34, 6, c, .9);
    seam(x, [[-12, -20], [12, -20]]); seam(x, [[0, 5], [0, 22]]); rivets(x, [[-16, -8], [16, -8], [-18, 10], [18, 10], [-9, 22], [9, 22], [-8, -26], [8, -26]]);
    canopy(x, 0, -8, 4.4, 5, c); nozzle(x, -14, 28.5, 4.6); nozzle(x, 14, 28.5, 4.6);
  }
};
export function shipSprite(id, color) {
  const k = 's' + id + color; if (cache.has(k)) return cache.get(k);
  const s = sprite(72, 72, 4, x => SHIP_DRAW[id](x, color)); cache.set(k, s); return s;
}

// ---------- Aliens ----------
const EN_DRAW = [
  (x, c, f) => { // dron: medusa
    x.fillStyle = lg(x, -14, 12, shade(c, .35), shade(c, -.4)); x.beginPath(); x.arc(0, -2, 13, Math.PI, 0); x.lineTo(13, 6); for (let i = 0; i < 4; i++) { x.lineTo(9 - i * 6, 6 + (i % 2 ? 4 : 8) * (f ? 1 : .5) + 2); x.lineTo(6 - i * 6, 6); } x.closePath(); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(-5, -3, 3.2, 0, 7); x.arc(5, -3, 3.2, 0, 7); x.fill(); x.fillStyle = '#1a0a2a'; x.beginPath(); x.arc(-5, -3, 1.4, 0, 7); x.arc(5, -3, 1.4, 0, 7); x.fill();
  },
  (x, c, f) => { // veloz: flecha
    poly(x, [[0, 13], [12, -4], [8, -12], [0, -6], [-8, -12], [-12, -4]], lg(x, -12, 13, shade(c, .4), shade(c, -.45)), shade(c, .6));
    x.fillStyle = '#fff'; x.fillRect(-4, -3, 3, 5); x.fillRect(1, -3, 3, 5); x.fillStyle = c; x.fillRect(-14, f ? -8 : -4, 4, 6); x.fillRect(10, f ? -4 : -8, 4, 6);
  },
  (x, c, f) => { // tanque: caparazón
    x.fillStyle = lg(x, -18, 18, shade(c, .3), shade(c, -.55)); x.beginPath(); x.ellipse(0, 0, 22, 17, 0, 0, 7); x.fill(); x.strokeStyle = shade(c, .55); x.lineWidth = 2; x.stroke();
    x.fillStyle = shade(c, -.6); [-12, 0, 12].forEach(px => { x.beginPath(); x.arc(px, 8, 4, 0, 7); x.fill(); });
    x.fillStyle = '#ffe14a'; x.beginPath(); x.ellipse(0, -3, 9, 5, 0, 0, 7); x.fill(); x.fillStyle = '#2a0a00'; x.beginPath(); x.arc(0, -3, 3, 0, 7); x.fill();
    x.fillStyle = shade(c, .3); x.fillRect(-4, f ? 14 : 16, 8, 6);
  },
  (x, c, f) => { // kamikaze: cabeza con pinchos
    x.fillStyle = lg(x, -15, 15, shade(c, .35), shade(c, -.4)); poly(x, [[0, 15], [10, 0], [8, -12], [0, -7], [-8, -12], [-10, 0]], x.fillStyle, shade(c, .6));
    for (let i = -1; i <= 1; i += 2) poly(x, [[i * 10, -2], [i * (f ? 20 : 16), -8], [i * 12, 4]], shade(c, -.2));
    x.fillStyle = '#ffe14a'; x.beginPath(); x.arc(0, -2, 4, 0, 7); x.fill(); x.fillStyle = '#300'; x.beginPath(); x.arc(0, -1, 1.8, 0, 7); x.fill();
  },
  (x, c, f) => { // francotirador: cañón largo
    x.fillStyle = lg(x, -15, 15, shade(c, .3), shade(c, -.5)); x.beginPath(); x.ellipse(0, -2, 15, 11, 0, 0, 7); x.fill(); x.strokeStyle = shade(c, .5); x.lineWidth = 1.5; x.stroke();
    x.fillStyle = shade(c, -.55); x.fillRect(-2.5, 4, 5, 14); x.fillStyle = f ? '#fff' : c; x.fillRect(-1.5, 15, 3, 3);
    x.fillStyle = '#fff'; x.beginPath(); x.arc(0, -3, 5, 0, 7); x.fill(); x.fillStyle = '#052'; x.beginPath(); x.arc(0, -3, 2.4, 0, 7); x.fill(); x.fillStyle = c; x.beginPath(); x.arc(0, -3, 1, 0, 7); x.fill();
  },
  (x, c, f) => { // escudo
    x.fillStyle = lg(x, -14, 14, shade(c, .3), shade(c, -.5)); x.beginPath(); x.arc(0, 0, 12, 0, 7); x.fill(); x.strokeStyle = shade(c, .6); x.lineWidth = 1.5; x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(0, -1, 6, 4, 0, 0, 7); x.fill(); x.fillStyle = '#012'; x.beginPath(); x.arc(0, -1, 2, 0, 7); x.fill();
    for (let i = 0; i < 3; i++) { x.fillStyle = c; x.fillRect(-8 + i * 6, 11 + (f ? i % 2 : (i + 1) % 2) * 2, 3, 6); }
  },
  (x, c) => { // asteroide
    const pts = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = 17 + ((i * 37) % 7) - 3; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    poly(x, pts, lg(x, -20, 20, shade(c, .3), shade(c, -.6)), shade(c, .45));
    x.fillStyle = 'rgba(0,0,0,.3)'; [[-6, -4, 4], [5, 6, 5], [4, -8, 3]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); });
  }
];
export function enemySprite(t, f) {
  const k = 'e' + t + f; if (cache.has(k)) return cache.get(k);
  const s = sprite(60, 60, 2, x => EN_DRAW[t](x, ENEMIES[t].col, f)); cache.set(k, s); return s;
}
// ---------- Jefes (cascos alienígenas con luces e iluminación) ----------
export const BOSS_CORES = { // glows dinámicos que pulsan durante el juego: [x, y, radio, color]
  destroyer: [[0, -6, 34, '#ffd166']], mothership: [[0, 40, 52, '#ff6ad0']], emperor: [[0, -4, 42, '#ff3bd0'], [-72, 2, 26, '#ff3bd0'], [72, 2, 26, '#ff3bd0']]
};
const BOSS_DRAW = {
  destroyer(x, c) {
    const h = '#5a2a3a';
    const claw = [[-18, -8], [-58, -34], [-100, -20], [-117, 6], [-86, 3], [-54, 24], [-22, 20]];
    both(x, claw, h); for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const px = s * (30 + i * 20), py = -22 - i * 3 + (i === 3 ? 10 : 0); plate(x, [[px - 5, py + 8], [px, py - 7], [px + 5, py + 8]].map(([a, b]) => [a, b]), '#3a1a26', { edge: 1.2 }); }
    both(x, [[-20, -6], [-56, -26], [-96, -17], [-100, -12], [-56, -19], [-22, -1]], c, { edge: 1 });
    for (const s of [-1, 1]) { const px = s * 66; plate(x, [[px - 12, -4], [px + 12, -4], [px + 10, 22], [px - 10, 22]], '#4b2634'); cyl(x, px, 20, 9, 26, '#2c1620'); glowAt(x, px, 46, 10, c, .85); rivets(x, [[px - 8, 0], [px + 8, 0], [px - 7, 16], [px + 7, 16]], .9); }
    plate(x, [[0, -54], [26, -36], [41, -8], [35, 26], [17, 46], [0, 54], [-17, 46], [-35, 26], [-41, -8], [-26, -36]], '#6a2c42');
    for (let i = 0; i < 4; i++) seam(x, [[-36 + i * 3, -2 + i * 14], [0, 8 + i * 14], [36 - i * 3, -2 + i * 14]], 1);
    plate(x, [[0, -46], [12, -34], [14, -8], [0, -2], [-14, -8], [-12, -34]], '#7a3350', { edge: 2 });
    rivets(x, [[-20, -24], [20, -24], [-26, 10], [26, 10], [-12, 38], [12, 38]], 1.2);
    for (const s of [-1, 1]) { glowAt(x, s * 14, -50, 8, '#ff7a3a', .8); }
    // ojo central
    x.fillStyle = '#12060c'; x.beginPath(); x.ellipse(0, -6, 19, 15, 0, 0, 7); x.fill(); x.strokeStyle = shade('#6a2c42', .5); x.lineWidth = 2; x.stroke();
    const eg = x.createRadialGradient(0, -6, 1, 0, -6, 15); eg.addColorStop(0, '#fff7c0'); eg.addColorStop(.5, '#ffb020'); eg.addColorStop(1, '#a01800'); x.fillStyle = eg; x.beginPath(); x.ellipse(0, -6, 15, 11, 0, 0, 7); x.fill();
    x.fillStyle = '#120408'; x.beginPath(); x.ellipse(0, -6, 3.2, 10, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(-6, -10, 3.4, 2, -.5, 0, 7); x.fill();
    for (let i = -3; i <= 3; i++) { glowAt(x, i * 8, 44 - Math.abs(i) * 3.4, 4, '#ff3b5a', .85); }
  },
  mothership(x, c) {
    const h = '#6a6490';
    // casco inferior
    x.fillStyle = shade(h, -.6); x.beginPath(); x.ellipse(0, 22, 62, 24, 0, 0, 7); x.fill();
    glowAt(x, 0, 40, 46, '#ff6ad0', .8); const eg = x.createRadialGradient(0, 38, 2, 0, 38, 22); eg.addColorStop(0, '#fff'); eg.addColorStop(.5, '#ff6ad0'); eg.addColorStop(1, 'rgba(120,20,100,0)'); x.fillStyle = eg; x.beginPath(); x.ellipse(0, 38, 22, 9, 0, 0, 7); x.fill();
    // disco principal
    let g = x.createLinearGradient(-110, -20, 110, 40); g.addColorStop(0, shade(h, .55)); g.addColorStop(.45, shade(h, .1)); g.addColorStop(1, shade(h, -.65)); x.fillStyle = g; x.beginPath(); x.ellipse(0, 12, 112, 30, 0, 0, 7); x.fill();
    x.save(); x.beginPath(); x.ellipse(0, 12, 112, 30, 0, 0, 7); x.clip(); g = x.createLinearGradient(0, -18, 0, 42); g.addColorStop(0, 'rgba(255,255,255,.32)'); g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,15,.5)'); x.fillStyle = g; x.fillRect(-112, -18, 224, 60);
    x.strokeStyle = 'rgba(0,0,12,.55)'; x.lineWidth = 1; for (let i = -9; i <= 9; i++) { x.beginPath(); x.moveTo(i * 10, -6); x.lineTo(i * 12.5, 40); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.moveTo(i * 10 + 1, -6); x.lineTo(i * 12.5 + 1, 40); x.stroke(); x.strokeStyle = 'rgba(0,0,12,.55)'; }
    x.restore(); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1; x.beginPath(); x.ellipse(0, 12, 112, 30, 0, Math.PI * 1.02, Math.PI * 1.5); x.stroke();
    // aro de luces (las luces dinámicas se dibujan en juego)
    x.strokeStyle = shade(h, -.45); x.lineWidth = 5; x.beginPath(); x.ellipse(0, 12, 104, 15, 0, 0, Math.PI); x.stroke();
    // cúpula de cristal con el alienígena dentro
    g = x.createLinearGradient(0, -48, 0, 8); g.addColorStop(0, '#d2fbff'); g.addColorStop(.35, '#4fd0e0'); g.addColorStop(1, '#0a4a66'); x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, 46, 42, 0, Math.PI, 0); x.closePath(); x.fill();
    x.save(); x.beginPath(); x.ellipse(0, 0, 46, 42, 0, Math.PI, 0); x.closePath(); x.clip();
    x.fillStyle = 'rgba(8,20,40,.75)'; x.beginPath(); x.ellipse(0, -10, 17, 20, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(0, 4, 24, 9, 0, 0, 7); x.fill();
    glowAt(x, -7, -12, 7, c, 1); glowAt(x, 7, -12, 7, c, 1); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(-7, -12, 3.2, 5, .35, 0, 7); x.ellipse(7, -12, 3.2, 5, -.35, 0, 7); x.fill();
    x.restore(); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(-20, -28, 13, 5, -.5, 0, 7); x.fill();
    x.strokeStyle = shade(h, .45); x.lineWidth = 2; x.beginPath(); x.ellipse(0, 0, 46, 42, 0, Math.PI, 0); x.stroke();
    // torretas laterales
    for (const s of [-1, 1]) { const px = s * 92; plate(x, [[px - 12, 14], [px + 12, 14], [px + 9, 30], [px - 9, 30]], '#4c4870'); cyl(x, px, 28, 6, 18, '#2b2840'); glowAt(x, px, 46, 7, c, .8); rivets(x, [[px - 7, 20], [px + 7, 20]], .9); }
  },
  emperor(x, c) {
    const dark = '#2d1646', gold = '#d9a93a';
    const wing = [[-30, -18], [-72, -58], [-98, -30], [-119, 18], [-88, 10], [-62, 36], [-34, 30]];
    both(x, wing, dark); both(x, [[-34, -8], [-70, -40], [-92, -22], [-62, -14], [-38, 6]], '#4a2470', { edge: 2 }); both(x, [[-34, 12], [-84, 4], [-60, 30], [-36, 26]], '#3a1c5a', { edge: 2 });
    both(x, [[-30, -18], [-72, -58], [-76, -54], [-34, -14]], gold, { edge: 1 }); both(x, [[-119, 18], [-98, -30], [-95, -26], [-114, 18]], gold, { edge: 1 });
    for (const s of [-1, 1]) { seam(x, [[s * 40, -6], [s * 88, 8]], .9); seam(x, [[s * 46, 16], [s * 74, 24]], .9); const px = s * 72; x.fillStyle = '#0c0614'; x.beginPath(); x.arc(px, 2, 15, 0, 7); x.fill(); x.strokeStyle = gold; x.lineWidth = 2; x.stroke(); glowAt(x, px, 2, 24, '#ff3bd0', .9); x.fillStyle = '#ffd9f6'; x.beginPath(); x.arc(px, 2, 5, 0, 7); x.fill(); }
    plate(x, [[0, -60], [22, -42], [31, -10], [25, 30], [11, 56], [0, 66], [-11, 56], [-25, 30], [-31, -10], [-22, -42]], dark);
    plate(x, [[0, -52], [14, -38], [19, -8], [0, 16], [-19, -8], [-14, -38]], '#3d1e60', { edge: 2.4 });
    for (const sgn of [-1, 1]) seam(x, [[sgn * 25, -26], [sgn * 21, 10], [sgn * 12, 44]], 1.2);
    plate(x, [[0, 24], [8, 36], [0, 58], [-8, 36]], gold, { edge: 1.2 });
    for (let i = -3; i <= 3; i++) plate(x, [[i * 8 - 3.6, -49 + Math.abs(i) * 3.5], [i * 8, -66 + Math.abs(i) * 4 - (i === 0 ? 4 : 0)], [i * 8 + 3.6, -49 + Math.abs(i) * 3.5]], gold, { edge: .8 });
    // reactor central
    x.fillStyle = '#0a0410'; x.beginPath(); x.arc(0, -4, 19, 0, 7); x.fill(); x.strokeStyle = gold; x.lineWidth = 2.4; x.stroke(); x.strokeStyle = shade(gold, -.5); x.lineWidth = .8; x.beginPath(); x.arc(0, -4, 22, 0, 7); x.stroke();
    glowAt(x, 0, -4, 30, '#ff3bd0', 1); const rg = x.createRadialGradient(0, -4, 0, 0, -4, 15); rg.addColorStop(0, '#fff'); rg.addColorStop(.4, '#ff7ae6'); rg.addColorStop(1, '#7a0a6a'); x.fillStyle = rg; x.beginPath(); x.arc(0, -4, 15, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = .8; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; x.beginPath(); x.moveTo(Math.cos(a) * 5, -4 + Math.sin(a) * 5); x.lineTo(Math.cos(a) * 14, -4 + Math.sin(a) * 14); x.stroke(); }
    rivets(x, [[-14, -34], [14, -34], [-20, 4], [20, 4], [-14, 30], [14, 30]], 1.1);
  }
};
export function bossSprite(id, color) {
  const k = 'b' + id; if (cache.has(k)) return cache.get(k);
  const s = sprite(240, 140, 2, x => BOSS_DRAW[id](x, color)); cache.set(k, s); return s;
}

// ---------- Fondos ----------
export function makeNebula(level, w, h, num = 1) {
  const c = mk(w, h), x = c.getContext('2d'), L = level;
  let seed = 7 + num * 131; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, L.bg[0]); g.addColorStop(.5, L.bg[1]); g.addColorStop(1, L.bg[0]); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const cx = rnd() * w, cy = rnd() * h, r = (.18 + rnd() * .3) * Math.max(w, h), col = L.neb[i % 2];
    for (const oy of [-h, 0, h]) { // se repite arriba/abajo para que el fondo enlace sin costuras al desplazarse
      const y = cy + oy, rg = x.createRadialGradient(cx, y, 0, cx, y, r); rg.addColorStop(0, col + '55'); rg.addColorStop(.5, col + '22'); rg.addColorStop(1, col + '00');
      x.fillStyle = rg; x.fillRect(cx - r, y - r, r * 2, r * 2);
    }
  }
  return c;
}
