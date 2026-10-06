// Menús y HUD (DOM). Todo el texto dinámico procede de datos propios o se escapa.
import { SHIPS, SKINS, LEVELS, BOSSES, UPGRADES, upgradeCost, MISSIONS, ACHIEVEMENTS, xpForLevel, POWER } from './data.js';
import { shipSprite } from './sprites.js';
import { save as persist, flush, normalize } from './storage.js';
import * as online from './online.js';
import { CONFIG } from './config.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('es-CO');
const $ = id => document.getElementById(id);
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const PW_NAMES = { tripleT: ['Triple', '#ffd166'], plasmaT: ['Plasma', '#c58bff'], missileT: ['Misiles', '#ff9a3c'], speedT: ['Turbo', '#fff36a'], multT: ['Puntos x2', '#ff6ad0'], shield: ['Escudo', '#5aa8ff'] };

export class UI {
  constructor({ game, save, audio }) {
    Object.assign(this, { game, sv: save, audio }); this.root = $('screens'); this.cur = null; this.hi = Math.max(0, SHIPS.findIndex(s => s.id === save.ship)); this.rankTab = 'local'; this.last = {};
    this.root.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b) return; this.audio.init(); this.act(b.dataset.act, b.dataset, b); });
    this.root.addEventListener('input', e => { const t = e.target; if (t.dataset.set) { const v = +t.value / 100; this.sv.settings[t.dataset.set] = v; this.audio.setVolumes(this.sv.settings); this.commit(); } });
    this.root.addEventListener('change', e => { const t = e.target; if (t.dataset.sel) { this.sv.settings[t.dataset.sel] = t.value; if (t.dataset.sel === 'quality') this.applyQuality(); this.commit(); } if (t.dataset.name) { this.sv.player.name = t.value.slice(0, 16); this.commit(); } if (t.id === 'imp' && t.files[0]) this.importFile(t.files[0]); });
    $('pauseBtn').addEventListener('click', () => this.game.togglePause());
    const press = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
    press('ecoBtn', () => this.game.useEcho()); press('bombBtn', () => this.game.useBomb());
    game.onHud = (h, f) => this.hud(h, f); game.onEnd = r => this.end(r); game.onBanner = (a, b) => this.banner(a, b);
    game.onTip = t => this.tip(t); game.onPause = p => p ? this.show('pause') : this.clear();
    this.applyQuality(); this.audio.setVolumes(this.sv.settings);
  }
  commit() { persist(this.sv); }
  applyQuality() { const q = this.sv.settings.quality; if (q !== 'auto') this.game.setQuality({ baja: 0, media: 1, alta: 2 }[q]); }
  // ---------- HUD ----------
  showHud(b) { for (const id of ['hud', 'btns', 'ecoBar', 'pw']) $(id).classList.toggle('hidden', !b); if (!b) { this.tip(null); } this.last = {}; }
  hud(h, force) {
    const L = this.last, set = (k, v, fn) => { if (L[k] !== v || force) { L[k] = v; fn(v); } };
    set('s', h.score, v => $('score').textContent = fmt(v));
    set('l', h.lives + '/' + h.maxLives, () => { let s = ''; for (let i = 0; i < h.maxLives; i++) s += `<i class="${i < h.lives ? '' : 'off'}"></i>`; $('lives').innerHTML = s; });
    set('c', h.coins, v => $('coins').textContent = fmt(v));
    set('w', h.level + '-' + h.wave, () => $('lvl').textContent = `Sector ${h.level} · Oleada ${h.wave}/${h.waves}`);
    set('cb', h.combo + '|' + h.mult, () => $('combo').textContent = h.combo >= 3 || h.mult > 1 ? `COMBO ${h.combo} · ×${h.mult.toFixed(1).replace('.0', '')}` : '');
    set('b', h.bombs, v => { $('bombN').textContent = v; $('bombBtn').classList.toggle('empty', v <= 0); });
    set('e', h.echo, v => { $('ecoFill').style.width = v + '%'; $('ecoBtn').classList.toggle('ready', v >= 100); });
    const pk = h.powers.map(p => p.k + Math.ceil(p.t)).join(',');
    set('p', pk, () => { $('pw').innerHTML = h.powers.map(p => { const d = PW_NAMES[p.k]; return `<div class="chip" style="color:${d[1]}">${d[0]} <b>${Math.ceil(p.t)}s</b></div>`; }).join(''); });
  }
  banner(a, b) { const el = $('banner'); el.querySelector('b').textContent = a; el.querySelector('span').textContent = b || ''; el.classList.add('show'); clearTimeout(this.bt); this.bt = setTimeout(() => el.classList.remove('show'), 1700); }
  tip(t) { const el = $('tip'); if (!t) { el.classList.add('hidden'); return; } el.textContent = t; el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
  toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; $('wrap').appendChild(d); setTimeout(() => d.remove(), 3200); }

  // ---------- navegación ----------
  clear() { this.root.innerHTML = ''; this.cur = null; }
  show(name, data) {
    this.cur = name; const t = this['s_' + name](data); this.root.innerHTML = t;
    if (name === 'hangar') this.drawShip();
    const f = this.root.querySelector('[autofocus]'); if (f) try { f.focus({ preventScroll: true }); } catch (_) {}
  }
  act(a, d, el) {
    const sv = this.sv, g = this.game;
    if (!['tog', 'skin'].includes(a)) this.audio.sfx('click');
    switch (a) {
      case 'menu': g.quit(); this.showHud(false); this.show('menu'); break;
      case 'play': this.show('levels'); break;
      case 'level': this.start(+d.n); break;
      case 'hangar': case 'upgrades': case 'missions': case 'settings': this.show(a); break;
      case 'ranking': this.rankTab = 'local'; this.show('ranking'); break;
      case 'rtab': this.rankTab = d.t; this.show('ranking'); if (d.t === 'world') this.loadWorld(); break;
      case 'prev': this.hi = (this.hi + SHIPS.length - 1) % SHIPS.length; this.show('hangar'); break;
      case 'next': this.hi = (this.hi + 1) % SHIPS.length; this.show('hangar'); break;
      case 'shipUse': sv.ship = SHIPS[this.hi].id; this.commit(); this.show('hangar'); break;
      case 'shipBuy': { const s = SHIPS[this.hi]; if (sv.coins >= s.cost) { sv.coins -= s.cost; sv.ships[s.id] = true; sv.ship = s.id; this.audio.sfx('buy'); this.checkAch(); flush(sv); this.show('hangar'); } else this.audio.sfx('deny'); break; }
      case 'skin': { const i = +d.i, k = SKINS[i]; if (sv.skins[i]) { sv.skin = i; } else if (sv.crystals >= k.cost) { sv.crystals -= k.cost; sv.skins[i] = true; sv.skin = i; this.audio.sfx('buy'); } else { this.audio.sfx('deny'); break; } flush(sv); this.show('hangar'); break; }
      case 'buy': { const u = UPGRADES.find(x => x.id === d.id), lv = sv.up[u.id], c = upgradeCost(u, lv); if (lv < u.max && sv.coins >= c) { sv.coins -= c; sv.up[u.id]++; this.audio.sfx('buy'); flush(sv); this.show('upgrades'); } else this.audio.sfx('deny'); break; }
      case 'claim': { const m = MISSIONS.find(x => x.id === d.id); if (!sv.mis.claimed[m.id] && this.mprog(m) >= m.target) { sv.mis.claimed[m.id] = true; sv.coins += m.coins; sv.crystals += m.crystals; this.audio.sfx('buy'); flush(sv); this.show('missions'); } break; }
      case 'tog': { const k = d.key; sv.settings[k] = !sv.settings[k]; this.commit(); this.show('settings'); break; }
      case 'resume': g.togglePause(); break;
      case 'restart': g.togglePause(); this.start(g.run.level); break;
      case 'again': this.start(+d.n); break;
      case 'install': if (window.__installPrompt) { window.__installPrompt.prompt(); window.__installPrompt = null; this.show('menu'); } break;
      case 'export': this.exportSave(); break;
      case 'import': $('imp').click(); break;
    }
  }
  start(n) {
    this.audio.init(); this.clear(); this.showHud(true); this.audio.music('game');
    this.game.startLevel(n, !this.sv.settings.tutorialDone && n === 1);
  }
  end(r) {
    this.showHud(false); const sv = this.sv;
    if (r.win) sv.stars[r.level] = Math.max(sv.stars[r.level] || 0, r.stars);
    this.checkAch(); flush(sv); online.syncPending(sv, () => flush(sv));
    this.show('result', r);
  }
  checkAch() { for (const a of ACHIEVEMENTS) if (!this.sv.ach[a.id] && a.test(this.sv)) { this.sv.ach[a.id] = Date.now(); this.toast('🏆 Logro: ' + a.name); this.audio.sfx('power'); } }
  mprog(m) { const s = this.sv; return m.stat === 'kills' ? s.stats.kills : m.stat === 'eco' ? s.mis.eco : m.stat === 'bosses' ? s.stats.bosses : s.maxLevel; }
  playerLevel() { let xp = this.sv.xp, l = 1; while (xp >= xpForLevel(l)) { xp -= xpForLevel(l); l++; } return { l, cur: xp, need: xpForLevel(l) }; }
  exportSave() { const b = new Blob([JSON.stringify(this.sv)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'nebulosa-roja-progreso.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  importFile(f) {
    f.text().then(t => { const o = JSON.parse(t); if (typeof o !== 'object' || o.v !== 2) throw 0; if (!confirm('Esto reemplaza el progreso actual de este dispositivo. ¿Continuar?')) return; Object.assign(this.sv, normalize(o)); flush(this.sv); this.audio.setVolumes(this.sv.settings); this.toast('Progreso importado'); this.show('settings'); }).catch(() => this.toast('Archivo no válido'));
  }
  async loadWorld() {
    const box = () => this.root.querySelector('#wl'); if (!box()) return;
    if (!online.enabled()) { box().innerHTML = '<p class="dim" style="text-align:center;padding:1rem">El ranking mundial aún no está activado. Tu progreso se guarda en este dispositivo y se sincronizará cuando se conecte un servidor.</p>'; return; }
    box().innerHTML = '<p class="dim" style="text-align:center;padding:1rem">Cargando…</p>';
    try { const r = await online.leaderboard(); if (!box()) return; box().innerHTML = r.length ? r.map((x, i) => `<div class="rank"><span class="n">${i + 1}</span><span>${esc(x.name)}</span><b class="gold">${fmt(x.score)}</b></div>`).join('') : '<p class="dim" style="text-align:center;padding:1rem">Aún no hay puntajes.</p>'; }
    catch (e) { if (box()) box().innerHTML = '<p class="dim" style="text-align:center;padding:1rem">Sin conexión con el servidor.</p>'; }
  }
  drawShip() {
    const c = this.root.querySelector('#hp'); if (!c) return; const s = SHIPS[this.hi], sk = SKINS[this.sv.skin] || SKINS[0], x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height); x.drawImage(shipSprite(s.id, sk.color && this.sv.ships[s.id] ? sk.color : s.color), 0, 0, c.width, c.height);
  }

  // ---------- pantallas ----------
  head(title, back = 'menu') { const s = this.sv; return `<div class="top"><button class="back" data-act="${back}" aria-label="Volver" autofocus>←</button><h2>${title}</h2><div class="wallet"><span class="gold">● ${fmt(s.coins)}</span><span class="cy">◆ ${s.crystals}</span></div></div>`; }
  s_menu() {
    const s = this.sv, pl = this.playerLevel(), ship = SHIPS.find(x => x.id === s.ship), inst = window.__installPrompt ? '<button class="btn gold sm" data-act="install">⬇ INSTALAR APP</button>' : '';
    return `<div class="screen" style="justify-content:center"><h1 class="logo">NEBULOSA<br>ROJA</h1><div class="tag">NAVES VS ALIENS · ECO TEMPORAL</div>
    <div class="menu"><button class="btn primary" data-act="play" autofocus>JUGAR</button><button class="btn" data-act="hangar">HANGAR</button><button class="btn" data-act="upgrades">MEJORAS</button><button class="btn" data-act="missions">MISIONES Y LOGROS</button><button class="btn" data-act="ranking">RANKING</button><button class="btn" data-act="settings">AJUSTES</button>${inst}</div>
    <div class="stats"><div class="stat">Piloto nivel<b>${pl.l}</b><div class="xp"><i style="width:${Math.round(pl.cur / pl.need * 100)}%"></i></div></div><div class="stat">Nave<b style="color:${ship.color}">${ship.name}</b></div><div class="stat">Monedas<b class="gold">● ${fmt(s.coins)}</b></div><div class="stat">Cristales<b class="cy">◆ ${s.crystals}</b></div></div>
    <p class="dim" style="text-align:center;font-size:.75rem;margin-top:.3rem">Récord ${fmt(s.best)} · v${CONFIG.VERSION}</p></div>`;
  }
  s_levels() {
    const s = this.sv, max = Math.min(s.maxLevel, LEVELS.length);
    return `<div class="screen">${this.head('ELIGE SECTOR')}<div class="grid">${LEVELS.map((l, i) => { const n = i + 1, st = s.stars[n] || 0, lock = n > max; return `<button class="lv ${lock ? 'lock' : ''} ${BOSSES[n] ? 'boss' : ''}" data-act="level" data-n="${n}"><b>${n}</b><small>${esc(l.name)}</small><span class="st">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>${BOSSES[n] ? '<span class="bt">JEFE</span>' : ''}${lock ? '<span class="bt dim">🔒</span>' : ''}</button>`; }).join('')}</div></div>`;
  }
  s_hangar() {
    const s = this.sv, sh = SHIPS[this.hi], own = !!s.ships[sh.id], use = s.ship === sh.id, bar = (n, v) => `<div class="bar"><span>${n}</span><i style="--v:${v * 20}%"></i></div>`;
    const act = use ? '<button class="btn" disabled>✔ EN USO</button>' : own ? '<button class="btn primary" data-act="shipUse">SELECCIONAR</button>' : `<button class="btn gold" data-act="shipBuy" ${s.coins < sh.cost ? 'disabled' : ''}>COMPRAR · ● ${fmt(sh.cost)}</button>`;
    return `<div class="screen">${this.head('HANGAR')}<div class="ships"><button class="back" data-act="prev" aria-label="Anterior">‹</button><canvas id="hp" width="288" height="288"></canvas><button class="back" data-act="next" aria-label="Siguiente">›</button></div>
    <h2 style="color:${sh.color};margin-bottom:.1rem">${sh.name}</h2><p class="dim" style="text-align:center;font-size:.85rem;margin-bottom:.6rem">${sh.desc}</p>
    <div class="panel">${bar('Velocidad', sh.stats[0])}${bar('Ataque', sh.stats[1])}${bar('Defensa', sh.stats[2])}<div class="bar"><span>Vidas</span><b style="color:var(--text)">${sh.lives}</b></div></div>
    ${act}<h2 style="margin-top:.9rem;font-size:1.05rem">PERSONALIZAR · COLOR</h2>
    <div class="skins">${SKINS.map((k, i) => `<button class="skin ${s.skin === i ? 'sel' : ''} ${s.skins[i] ? '' : 'lock'}" data-act="skin" data-i="${i}" data-c="${k.cost}" style="background:${k.color || sh.color}" aria-label="${k.name}"></button>`).join('')}</div>
    <p class="dim" style="text-align:center;font-size:.75rem">Los colores se compran con cristales ◆ que dan los jefes.</p></div>`;
  }
  s_upgrades() {
    const s = this.sv;
    return `<div class="screen">${this.head('MEJORAS')}${UPGRADES.map(u => { const lv = s.up[u.id], max = lv >= u.max, c = upgradeCost(u, lv); return `<div class="panel"><div class="row"><div><b>${u.name}</b><div class="dim" style="font-size:.8rem">${u.desc}</div><div class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div><button class="btn gold sm" data-act="buy" data-id="${u.id}" ${max || s.coins < c ? 'disabled' : ''}>${max ? 'MÁX' : '● ' + fmt(c)}</button></div></div>`; }).join('')}</div>`;
  }
  s_missions() {
    const s = this.sv;
    return `<div class="screen">${this.head('MISIONES')}${MISSIONS.map(m => { const p = Math.min(this.mprog(m), m.target), done = p >= m.target, cl = s.mis.claimed[m.id]; return `<div class="panel"><div class="row"><div style="flex:1"><b>${m.text}</b><div class="dim" style="font-size:.78rem">${p}/${m.target} · Premio ● ${m.coins}${m.crystals ? ' ◆ ' + m.crystals : ''}</div><div class="prog"><i style="width:${p / m.target * 100}%"></i></div></div><button class="btn gold sm" data-act="claim" data-id="${m.id}" ${!done || cl ? 'disabled' : ''}>${cl ? '✔' : 'RECLAMAR'}</button></div></div>`; }).join('')}
    <h2 style="margin-top:.8rem">LOGROS</h2>${ACHIEVEMENTS.map(a => { const ok = !!s.ach[a.id]; return `<div class="panel row" style="opacity:${ok ? 1 : .5}"><div><b>${ok ? '🏆' : '🔒'} ${a.name}</b><div class="dim" style="font-size:.78rem">${a.text}</div></div></div>`; }).join('')}</div>`;
  }
  s_ranking() {
    const s = this.sv, loc = s.scores.length ? s.scores.map((x, i) => `<div class="rank"><span class="n">${i + 1}</span><span>Sector ${x.l}${x.w ? ' ✔' : ''} <span class="dim" style="font-size:.75rem">${new Date(x.d).toLocaleDateString('es-CO')}</span></span><b class="gold">${fmt(x.s)}</b></div>`).join('') : '<p class="dim" style="text-align:center;padding:1rem">Aún no hay partidas. ¡A volar!</p>';
    return `<div class="screen">${this.head('RANKING')}<div class="tabs"><button class="btn ${this.rankTab === 'local' ? 'on' : ''}" data-act="rtab" data-t="local">MIS MEJORES</button><button class="btn ${this.rankTab === 'world' ? 'on' : ''}" data-act="rtab" data-t="world">MUNDIAL</button></div><div class="panel" id="wl">${this.rankTab === 'local' ? loc : ''}</div></div>`;
  }
  s_settings() {
    const st = this.sv.settings, tg = (k, l) => `<label class="set"><span>${l}</span><button class="tog ${st[k] ? 'on' : ''}" data-act="tog" data-key="${k}" role="switch" aria-checked="${!!st[k]}" aria-label="${l}"></button></label>`;
    const sl = (k, l) => `<label class="set"><span>${l}</span><input type="range" min="0" max="100" value="${Math.round(st[k] * 100)}" data-set="${k}" aria-label="${l}"></label>`;
    const sel = (k, l, o) => `<label class="set"><span>${l}</span><select data-sel="${k}">${o.map(([v, t]) => `<option value="${v}" ${st[k] === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
    return `<div class="screen">${this.head('AJUSTES')}<div class="panel">${sl('master', 'Volumen general')}${sl('music', 'Música')}${sl('sfx', 'Efectos')}</div>
    <div class="panel">${sel('control', 'Control', [['drag', 'Arrastrar el dedo'], ['joystick', 'Joystick virtual']])}${tg('autofire', 'Disparo automático')}${tg('vibration', 'Vibración')}${sel('quality', 'Calidad gráfica', [['auto', 'Automática'], ['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta']])}</div>
    <div class="panel"><label class="set"><span>Apodo (ranking)</span><input type="text" data-name="1" maxlength="16" value="${esc(this.sv.player.name)}" placeholder="Piloto"></label>
    <div class="row" style="margin-top:.6rem"><button class="btn sm" data-act="export">⬇ Copia de seguridad</button><button class="btn sm" data-act="import">⬆ Restaurar</button></div><input id="imp" type="file" accept="application/json" class="hidden">
    <p class="dim" style="font-size:.74rem;margin-top:.6rem">Tu progreso se guarda automáticamente en este dispositivo y funciona sin internet.</p></div></div>`;
  }
  s_pause() { return `<div class="screen center clear"><h2 style="font-size:2rem">PAUSA</h2><div class="menu"><button class="btn primary" data-act="resume" autofocus>CONTINUAR</button><button class="btn" data-act="restart">REINICIAR SECTOR</button><button class="btn danger" data-act="menu">SALIR AL MENÚ</button></div></div>`; }
  s_result(r) {
    const next = r.win && r.level < LEVELS.length;
    return `<div class="screen res" style="justify-content:center"><h2 style="font-size:1.7rem;color:${r.win ? 'var(--ok)' : 'var(--alien)'}">${r.win ? 'SECTOR COMPLETADO' : 'NAVE DESTRUIDA'}</h2>
    ${r.win ? `<div class="stars">${[1, 2, 3].map(i => i <= r.stars ? '<b>★</b>' : '★').join('')}</div>` : ''}<div class="big">${fmt(r.score)}</div>${r.isBest ? '<p class="gold" style="text-align:center;font-weight:700">¡NUEVO RÉCORD!</p>' : ''}
    <div class="panel" style="margin-top:.7rem"><div class="line"><span>Aliens destruidos</span><b>${r.kills}</b></div><div class="line"><span>Monedas</span><b class="gold">● ${r.coins}${r.bonusCoins ? ' + ' + r.bonusCoins : ''}</b></div>${r.crystals ? `<div class="line"><span>Cristales</span><b class="cy">◆ ${r.crystals}</b></div>` : ''}<div class="line"><span>Experiencia</span><b>+${fmt(r.xp)}</b></div><div class="line"><span>Mejor combo</span><b>${r.bestCombo}</b></div><div class="line"><span>Usos de Eco</span><b>${r.eco}</b></div><div class="line"><span>Tiempo</span><b>${mmss(r.time)}</b></div>${r.win && r.hits === 0 ? '<div class="line"><span>Bonus sin daño</span><b class="gold">+120</b></div>' : ''}</div>
    <div class="menu">${next ? `<button class="btn primary" data-act="again" data-n="${r.level + 1}" autofocus>SIGUIENTE SECTOR</button>` : ''}${r.win && !next ? '<p class="gold" style="text-align:center;font-weight:800">¡DERROTASTE AL IMPERIO ALIEN!</p>' : ''}<button class="btn ${next ? '' : 'primary'}" data-act="again" data-n="${r.level}" ${next ? '' : 'autofocus'}>${r.win ? 'REPETIR' : 'REINTENTAR'}</button><button class="btn" data-act="hangar">HANGAR Y MEJORAS</button><button class="btn" data-act="menu">MENÚ</button></div></div>`;
  }
}
