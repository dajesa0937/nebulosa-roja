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

// ---------- Naves del jugador ----------
const SHIP_DRAW = {
  interceptor(x, c) {
    poly(x, [[0, -28], [7, -8], [26, 16], [22, 22], [8, 14], [0, 18], [-8, 14], [-22, 22], [-26, 16], [-7, -8]], lg(x, -28, 22, shade(c, .35), shade(c, -.45)), shade(c, .6));
    poly(x, [[0, -22], [4, -6], [0, 8], [-4, -6]], '#0c1a3a');
    poly(x, [[0, -18], [2.5, -7], [0, 0], [-2.5, -7]], '#bff6ff');
  },
  destroyer(x, c) {
    poly(x, [[-30, 6], [-22, -10], [-16, 20], [-24, 24]], shade(c, -.35), shade(c, .4)); poly(x, [[30, 6], [22, -10], [16, 20], [24, 24]], shade(c, -.35), shade(c, .4));
    poly(x, [[0, -26], [10, -4], [16, 18], [6, 22], [-6, 22], [-16, 18], [-10, -4]], lg(x, -26, 22, shade(c, .3), shade(c, -.5)), shade(c, .6));
    x.fillStyle = '#fff'; x.fillRect(-26, -14, 3, 12); x.fillRect(23, -14, 3, 12);
    poly(x, [[0, -16], [4, -2], [-4, -2]], '#1a0c08');
  },
  guardian(x, c) {
    x.fillStyle = lg(x, -24, 24, shade(c, .3), shade(c, -.55)); x.beginPath(); x.ellipse(0, 2, 22, 24, 0, 0, 7); x.fill(); x.strokeStyle = shade(c, .6); x.lineWidth = 1.5; x.stroke();
    poly(x, [[-28, 8], [-20, -6], [-18, 18]], shade(c, -.4), shade(c, .4)); poly(x, [[28, 8], [20, -6], [18, 18]], shade(c, -.4), shade(c, .4));
    x.fillStyle = '#06200f'; x.beginPath(); x.ellipse(0, -4, 8, 12, 0, 0, 7); x.fill(); x.fillStyle = '#d8ffe4'; x.beginPath(); x.ellipse(0, -7, 4, 6, 0, 0, 7); x.fill();
  },
  plasma(x, c) {
    x.beginPath(); x.moveTo(0, -28); x.quadraticCurveTo(30, -6, 24, 22); x.quadraticCurveTo(8, 8, 0, 16); x.quadraticCurveTo(-8, 8, -24, 22); x.quadraticCurveTo(-30, -6, 0, -28); x.closePath();
    x.fillStyle = lg(x, -28, 22, shade(c, .4), shade(c, -.55)); x.fill(); x.strokeStyle = shade(c, .7); x.lineWidth = 1.3; x.stroke();
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 10); g.addColorStop(0, '#fff'); g.addColorStop(.4, c); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 10, 0, 7); x.fill();
  },
  titan(x, c) {
    poly(x, [[-14, -26], [14, -26], [30, -6], [30, 20], [18, 26], [-18, 26], [-30, 20], [-30, -6]], lg(x, -26, 26, shade(c, .25), shade(c, -.55)), shade(c, .6));
    poly(x, [[-8, -18], [8, -18], [12, 4], [-12, 4]], '#2a1f08'); poly(x, [[-5, -15], [5, -15], [7, -3], [-7, -3]], '#fff2c0');
    x.fillStyle = shade(c, -.6); x.fillRect(-26, 8, 8, 14); x.fillRect(18, 8, 8, 14); x.fillStyle = '#fff'; x.fillRect(-24, -2, 4, 8); x.fillRect(20, -2, 4, 8);
  }
};
export function shipSprite(id, color) {
  const k = 's' + id + color; if (cache.has(k)) return cache.get(k);
  const s = sprite(72, 72, 2, x => SHIP_DRAW[id](x, color)); cache.set(k, s); return s;
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
// ---------- Jefes ----------
const BOSS_DRAW = {
  destroyer(x, c) {
    poly(x, [[0, 40], [50, 10], [75, -22], [60, -34], [30, -20], [0, -38], [-30, -20], [-60, -34], [-75, -22], [-50, 10]], lg(x, -38, 40, shade(c, .3), shade(c, -.6)), shade(c, .55));
    x.fillStyle = shade(c, -.5); [-50, 50].forEach(px => { x.beginPath(); x.arc(px, -8, 11, 0, 7); x.fill(); });
    x.fillStyle = '#ffe14a'; x.beginPath(); x.ellipse(0, -4, 18, 11, 0, 0, 7); x.fill(); x.fillStyle = '#300'; x.beginPath(); x.ellipse(0, -4, 6, 9, 0, 0, 7); x.fill();
    x.fillStyle = shade(c, .4); [-24, -12, 12, 24].forEach(px => x.fillRect(px - 2, 24, 4, 12));
  },
  mothership(x, c) {
    x.fillStyle = lg(x, -30, 30, shade(c, .3), shade(c, -.6)); x.beginPath(); x.ellipse(0, 6, 95, 30, 0, 0, 7); x.fill(); x.strokeStyle = shade(c, .5); x.lineWidth = 2; x.stroke();
    x.fillStyle = lg(x, -45, 0, shade('#5ef2ff', .2), shade('#5ef2ff', -.5)); x.beginPath(); x.arc(0, -4, 42, Math.PI, 0); x.fill(); x.strokeStyle = shade(c, .6); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.ellipse(-12, -26, 14, 6, -.4, 0, 7); x.fill();
    for (let i = -4; i <= 4; i++) { x.fillStyle = '#ffd166'; x.beginPath(); x.arc(i * 20, 14 + Math.abs(i) * -1.2, 3.5, 0, 7); x.fill(); }
    x.fillStyle = shade(c, -.4); x.beginPath(); x.ellipse(0, 28, 24, 10, 0, 0, 7); x.fill();
  },
  emperor(x, c) {
    poly(x, [[0, 52], [40, 30], [105, 10], [85, -28], [52, -18], [38, -48], [0, -34], [-38, -48], [-52, -18], [-85, -28], [-105, 10], [-40, 30]], lg(x, -48, 52, shade(c, .25), shade('#6a0f3a', -.2)), shade(c, .7));
    poly(x, [[0, -30], [20, -8], [0, 30], [-20, -8]], '#1a0820', shade(c, .6));
    const g = x.createRadialGradient(0, -4, 0, 0, -4, 20); g.addColorStop(0, '#fff'); g.addColorStop(.35, '#ff3bd0'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, -4, 20, 0, 7); x.fill();
    x.fillStyle = shade(c, .2); for (let i = -3; i <= 3; i++) poly(x, [[i * 10 - 4, -44], [i * 10, -58], [i * 10 + 4, -44]], x.fillStyle);
    x.fillStyle = shade(c, -.5); [-70, 70].forEach(px => { x.beginPath(); x.arc(px, -2, 12, 0, 7); x.fill(); x.fillStyle = '#ff3bd0'; x.beginPath(); x.arc(px, -2, 5, 0, 7); x.fill(); x.fillStyle = shade(c, -.5); });
  }
};
export function bossSprite(id, color) {
  const k = 'b' + id; if (cache.has(k)) return cache.get(k);
  const s = sprite(240, 140, 1.5, x => BOSS_DRAW[id](x, color)); cache.set(k, s); return s;
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
