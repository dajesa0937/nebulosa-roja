// Guardado local versionado, con copia de seguridad. Nunca se borra el progreso al fallar una lectura.
const KEY = 'nebulosa_save_v2', BAK = 'nebulosa_save_v2_bak';
const defaults = () => ({
  v: 2, coins: 0, crystals: 0, xp: 0, best: 0, maxLevel: 1,
  ships: { interceptor: true }, ship: 'interceptor', skin: 0, skins: { 0: true },
  up: { dmg: 0, spd: 0, shield: 0, magnet: 0, echo: 0 },
  ach: {}, stars: {}, mis: { eco: 0, claimed: {} },
  stats: { runs: 0, kills: 0, bosses: 0, time: 0, flawless: 0, bestCombo: 0, emperor: 0, coinsTotal: 0 },
  scores: [], pending: [], player: { name: '', id: '', token: '' },
  settings: { master: .8, music: .55, sfx: .8, control: 'drag', autofire: true, quality: 'auto', vibration: true, tutorialDone: false }
});
function merge(base, src) {
  if (!src || typeof src !== 'object') return base;
  for (const k of Object.keys(base)) {
    if (!(k in src)) continue;
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = merge(base[k], src[k]);
    else base[k] = src[k];
  }
  // claves dinámicas (ships, skins, ach, claimed) se conservan completas
  for (const k of ['ships', 'skins', 'ach', 'stars']) if (src[k] && typeof src[k] === 'object') base[k] = { ...base[k], ...src[k] };
  if (src.mis && src.mis.claimed) base.mis.claimed = { ...src.mis.claimed };
  return base;
}
function read(key) { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
export function load() {
  let data = read(KEY) || read(BAK);
  const s = merge(defaults(), data);
  if (!data) { // migración del récord de la versión 1
    try { s.best = +localStorage.getItem('nebulosa_best') || 0; } catch (e) {}
  }
  return s;
}
let timer = 0;
export function save(s) {
  clearTimeout(timer);
  timer = setTimeout(() => flush(s), 250);
}
export function flush(s) {
  try {
    const prev = localStorage.getItem(KEY);
    if (prev) { try { JSON.parse(prev); localStorage.setItem(BAK, prev); } catch (e) {} }
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) { /* almacenamiento lleno o bloqueado: el juego sigue funcionando */ }
}
export async function requestPersist() {
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
}
// Valida e integra una copia de seguridad importada por el usuario.
export function normalize(obj) { return merge(defaults(), obj); }
