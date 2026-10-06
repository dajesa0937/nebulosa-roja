import { CONFIG } from './config.js';
import { load, flush, requestPersist } from './storage.js';
import { AudioEngine } from './audio.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import * as online from './online.js';

const sv = load(), audio = new AudioEngine(), wrap = document.getElementById('wrap');
audio.vol = { master: sv.settings.master, music: sv.settings.music, sfx: sv.settings.sfx };
const game = new Game({ canvas: document.getElementById('c'), save: sv, audio, onHud() {}, onEnd() {}, onBanner() {}, onTip() {} });
const ui = new UI({ game, save: sv, audio });

function layout() {
  const aw = innerWidth, ah = innerHeight, bw = Math.min(aw, ah * .75), bh = Math.min(ah, bw / .42);
  wrap.style.width = bw + 'px'; wrap.style.height = bh + 'px';
  document.documentElement.style.fontSize = Math.max(12, Math.min(21, bw / 30)) + 'px';
  game.resize(bw, bh);
}
addEventListener('resize', layout); addEventListener('orientationchange', () => setTimeout(layout, 200)); layout();

function loop(t) { game.frame(t); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

// Primer gesto del usuario: activa audio y música de menú
const unlock = () => { audio.init(); if (game.state === 'menu') audio.music('menu'); requestPersist(); };
addEventListener('pointerdown', unlock, { once: true }); addEventListener('keydown', unlock, { once: true });

ui.show('menu');
addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; if (ui.cur === 'menu') ui.show('menu'); });
addEventListener('pagehide', () => flush(sv));
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(sv); });
addEventListener('online', () => online.syncPending(sv, () => flush(sv)));
online.syncPending(sv, () => flush(sv));

if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && game.state !== 'play' && game.state !== 'pause') location.reload(); });
}
if (/[?&]debug/.test(location.search)) window.__nr = { game, sv, ui, audio, CONFIG };
