// Service worker: juego 100% offline tras la primera carga.
// Sube VERSION cada vez que publiques cambios para que los jugadores reciban la actualización.
const VERSION = 'nebulosa-roja-v2.1.0';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './src/main.js', './src/config.js', './src/data.js', './src/storage.js', './src/audio.js', './src/sprites.js',
  './src/render.js', './src/game.js', './src/ui.js', './src/online.js',
  './fonts/orbitron-latin-700-normal.woff2', './fonts/orbitron-latin-900-normal.woff2', './fonts/rajdhani-latin-500-normal.woff2', './fonts/rajdhani-latin-600-normal.woff2', './fonts/rajdhani-latin-700-normal.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const url = new URL(r.url); if (url.origin !== location.origin) return; // la API online nunca se cachea
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(r, { ignoreSearch: true });
    const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }               // caché primero (rápido y offline)
    return (await net) || (r.mode === 'navigate' ? c.match('./index.html') : Response.error());
  }));
});
