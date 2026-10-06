// Servidor OPCIONAL de ranking para Nebulosa Roja. Sin dependencias: solo Node 18+.
// Guarda en un archivo JSON (suficiente para empezar). Para crecer, migra a PostgreSQL con database/schema.sql.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PORT = +process.env.PORT || 8787;
const ORIGIN = process.env.ALLOWED_ORIGIN || '*';          // en producción: 'https://dajesa0937.github.io'
const FILE = process.env.DATA_FILE || path.join(process.cwd(), 'data.json');
let db = { players: {}, scores: [] };
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { /* primera ejecución */ }
let dirty = false;
setInterval(() => { if (!dirty) return; dirty = false; fs.writeFileSync(FILE + '.tmp', JSON.stringify(db)); fs.renameSync(FILE + '.tmp', FILE); }, 2000).unref();

const hash = (id, token) => crypto.createHash('sha256').update(id + ':' + token).digest('hex'); // nunca se guarda el token
const clean = s => String(s || 'Piloto').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 16) || 'Piloto';
const hits = new Map(); // límite de peticiones por IP
function limited(ip) { const n = Date.now(), a = (hits.get(ip) || []).filter(t => n - t < 60000); a.push(n); hits.set(ip, a); return a.length > 60; }
function send(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Headers': 'Content-Type,X-Player-Id,X-Player-Token', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); res.end(JSON.stringify(obj)); }
const body = req => new Promise((ok, no) => { let d = ''; req.on('data', c => { d += c; if (d.length > 4096) { req.destroy(); no(new Error('big')); } }); req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch (e) { no(e); } }); });

// Validación de plausibilidad. NOTA: no sustituye una verificación completa (repeticiones/simulación en servidor),
// pero descarta puntajes imposibles y envíos masivos.
function plausible(s) {
  const n = x => Number.isFinite(x) && x >= 0;
  if (![s.score, s.level, s.kills, s.time].every(n)) return 'campos inválidos';
  if (s.level < 1 || s.level > 10) return 'nivel inválido';
  if (s.time < 8) return 'partida demasiado corta';
  if (s.kills > s.time * 4 + 10) return 'bajas imposibles';
  if (s.score > s.kills * 1500 + 15000 + s.level * 4000) return 'puntaje imposible';
  return null;
}
http.createServer(async (req, res) => {
  const ip = req.socket.remoteAddress; if (req.method === 'OPTIONS') return send(res, 204, {});
  if (limited(ip)) return send(res, 429, { error: 'demasiadas peticiones' });
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true });
    if (req.method === 'GET' && url.pathname === '/api/leaderboard') {
      const best = {}; for (const s of db.scores) if (!best[s.id] || s.score > best[s.id].score) best[s.id] = s;
      return send(res, 200, Object.values(best).sort((a, b) => b.score - a.score).slice(0, 50).map(s => ({ name: db.players[s.id]?.name || 'Piloto', score: s.score, level: s.level })));
    }
    if (req.method === 'POST' && url.pathname === '/api/register') {
      const b = await body(req); if (!/^[0-9a-f]{16}$/.test(b.id) || !/^[0-9a-f]{48}$/.test(b.token)) return send(res, 400, { error: 'datos inválidos' });
      const cur = db.players[b.id];
      if (cur && cur.h !== hash(b.id, b.token)) return send(res, 403, { error: 'jugador ya registrado' });
      db.players[b.id] = { h: hash(b.id, b.token), name: clean(b.name), seen: Date.now() }; dirty = true; return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/score') {
      const id = req.headers['x-player-id'], tok = req.headers['x-player-token'], p = db.players[id];
      if (!p || p.h !== hash(id, tok)) return send(res, 401, { error: 'no autorizado' });
      const b = await body(req), why = plausible(b); if (why) return send(res, 422, { error: why });
      if (db.scores.some(s => s.id === id && s.ts === b.ts)) return send(res, 200, { ok: true, dup: true }); // idempotente
      const last = db.scores.filter(s => s.id === id).pop(); if (last && Date.now() - last.at < 5000) return send(res, 429, { error: 'muy rápido' });
      db.scores.push({ id, score: Math.floor(b.score), level: b.level | 0, kills: b.kills | 0, time: b.time | 0, ts: b.ts, at: Date.now() });
      if (db.scores.length > 20000) db.scores = db.scores.sort((a, b) => b.score - a.score).slice(0, 10000);
      dirty = true; return send(res, 200, { ok: true });
    }
    send(res, 404, { error: 'no existe' });
  } catch (e) { send(res, 400, { error: 'petición inválida' }); }
}).listen(PORT, () => console.log('Nebulosa Roja API en :' + PORT));
