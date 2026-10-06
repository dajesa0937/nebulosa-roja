// Modo online OPCIONAL. Si CONFIG.API_URL está vacío, todo esto es inerte y el juego sigue 100% offline.
import { CONFIG } from './config.js';
const rnd = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');
export const enabled = () => !!CONFIG.API_URL;
async function call(path, method, body, save) {
  const h = { 'Content-Type': 'application/json' };
  if (save && save.player.id) { h['X-Player-Id'] = save.player.id; h['X-Player-Token'] = save.player.token || ''; }
  const r = await fetch(CONFIG.API_URL + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}
export async function register(save) {
  if (!enabled()) return false;
  if (!save.player.id) { save.player.id = rnd(8); save.player.token = rnd(24); }
  const name = (save.player.name || 'Piloto').slice(0, 16);
  await call('/api/register', 'POST', { id: save.player.id, token: save.player.token, name }, save); return true;
}
// Envía las partidas pendientes; si no hay conexión, se quedan guardadas y se reintenta al volver Internet.
export async function syncPending(save, done) {
  if (!enabled() || !navigator.onLine || !save.pending.length) return;
  try {
    await register(save);
    while (save.pending.length) { await call('/api/score', 'POST', save.pending[0], save); save.pending.shift(); }
  } catch (e) { /* se reintenta luego */ }
  done && done();
}
export async function leaderboard() { return enabled() ? call('/api/leaderboard', 'GET') : null; }
