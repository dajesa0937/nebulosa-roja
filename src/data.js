// Datos del juego: naves, enemigos, jefes, niveles, mejoras, misiones y logros.
export const SHIPS = [
  { id:'interceptor', name:'Interceptor', desc:'Veloz y ágil. Ideal para esquivar.', speed:1.15, dmg:1.0, lives:3, cost:0,    color:'#5ef2ff', stats:[3,2,1] },
  { id:'destroyer',   name:'Destroyer',   desc:'Cañones potentes, velocidad media.', speed:1.0,  dmg:1.4, lives:3, cost:600,  color:'#ff9a3c', stats:[2,4,2] },
  { id:'guardian',    name:'Guardian',    desc:'Blindaje enorme, algo lenta.',       speed:.85,  dmg:1.0, lives:5, cost:1200, color:'#7dff9a', stats:[1,2,5] },
  { id:'plasma',      name:'Plasma',      desc:'Disparo perforante de energía.',     speed:1.1,  dmg:1.2, lives:3, cost:2200, color:'#c58bff', stats:[3,3,2], pierce:true },
  { id:'titan',       name:'Titan',       desc:'Pesada: daño extremo, defensa alta.',speed:.8,   dmg:1.8, lives:4, cost:3500, color:'#ffd166', stats:[1,5,4] }
];
export const SKINS = [
  { name:'Original', color:null,      cost:0 },
  { name:'Brasa',    color:'#ff7a3c', cost:2 },
  { name:'Esmeralda',color:'#5dffa0', cost:2 },
  { name:'Amatista', color:'#b98bff', cost:3 },
  { name:'Oro',      color:'#ffd166', cost:3 },
  { name:'Rubí',     color:'#ff4f6e', cost:5 }
];

// Tipos de enemigo
export const ENEMIES = [
  { id:'dron',  name:'Dron',           hp:1, w:30, h:26, score:100, col:'#ff4f8b', fire:.10 },
  { id:'veloz', name:'Veloz',          hp:1, w:28, h:24, score:150, col:'#ff9a3c', fire:.08 },
  { id:'tanque',name:'Tanque',         hp:7, w:44, h:36, score:350, col:'#b26bff', fire:.28 },
  { id:'kami',  name:'Kamikaze',       hp:2, w:26, h:30, score:200, col:'#ff3b3b', fire:0 },
  { id:'sniper',name:'Francotirador',  hp:3, w:32, h:30, score:300, col:'#3ce0b0', fire:.22 },
  { id:'escudo',name:'Alien Escudo',   hp:3, w:34, h:30, score:300, col:'#5aa8ff', fire:.14 },
  { id:'roca',  name:'Asteroide',      hp:4, w:40, h:40, score:50,  col:'#8a7aa8', fire:0 }
];

// Jefes
export const BOSSES = {
  3:  { id:'destroyer', name:'ALIEN DESTROYER',   hp:140, w:150, h:80,  col:'#ff4f8b', reward:6 },
  6:  { id:'mothership',name:'NAVE NODRIZA',      hp:260, w:190, h:90,  col:'#b26bff', reward:10 },
  10: { id:'emperor',   name:'EMPERADOR GALÁCTICO',hp:480, w:210, h:110, col:'#ffd166', reward:25 }
};

// 10 sectores. 'types' = enemigos que pueden aparecer (índices de ENEMIES)
export const LEVELS = [
  { name:'Espacio profundo',      bg:['#0b0620','#1e0f45'], neb:['#5a2bd0','#c23a8f'], types:[0],            rocks:false },
  { name:'Campo de asteroides',   bg:['#0c0a1c','#23183a'], neb:['#6b5aa8','#2b6fa8'], types:[0,1],          rocks:true  },
  { name:'Nebulosa Roja',         bg:['#1a0612','#46102a'], neb:['#ff3b6a','#ff8a3c'], types:[0,1,2],        rocks:false },
  { name:'Planeta rojo',          bg:['#1f0a08','#4a1a12'], neb:['#ff5a2a','#a82b1a'], types:[0,1,2,3],      rocks:true  },
  { name:'Luna alienígena',       bg:['#06161c','#0e3a40'], neb:['#2affc0','#2a8aff'], types:[0,1,3,4],      rocks:false },
  { name:'Estación abandonada',   bg:['#0a0d1c','#1a2245'], neb:['#4a6aff','#7a3aff'], types:[0,2,3,4,5],    rocks:false },
  { name:'Campo de meteoritos',   bg:['#12100a','#2f2812'], neb:['#d8a02a','#a8502a'], types:[0,1,3,5],      rocks:true  },
  { name:'Planeta helado',        bg:['#06141f','#123a5a'], neb:['#6adfff','#8a9aff'], types:[1,2,4,5],      rocks:false },
  { name:'Zona volcánica',        bg:['#1c0604','#4a1208'], neb:['#ff6a1a','#ffcf3a'], types:[1,2,3,4,5],    rocks:true  },
  { name:'Base del Emperador',    bg:['#10041c','#34104f'], neb:['#ff2ad0','#8a2aff'], types:[2,3,4,5,1],    rocks:false }
];
export const WAVES_PER_LEVEL = 3;

// Mejoras permanentes (se compran con monedas)
export const UPGRADES = [
  { id:'dmg',    name:'Cañones',      desc:'+15% de daño por nivel',            max:5, base:150 },
  { id:'spd',    name:'Propulsores',  desc:'+6% de velocidad por nivel',        max:5, base:120 },
  { id:'shield', name:'Escudo inicial',desc:'+2 s de escudo al empezar cada nivel',max:5, base:140 },
  { id:'magnet', name:'Imán de monedas',desc:'Atrae monedas desde más lejos',    max:5, base:100 },
  { id:'echo',   name:'Carga de Eco', desc:'El Eco Temporal se carga +15% más rápido', max:5, base:200 }
];
export const upgradeCost = (u, lvl) => Math.round(u.base * Math.pow(lvl + 1, 1.55));

export const MISSIONS = [
  { id:'k50',   text:'Destruye 50 aliens',       stat:'kills',  target:50,  coins:150, crystals:0 },
  { id:'k300',  text:'Destruye 300 aliens',      stat:'kills',  target:300, coins:500, crystals:2 },
  { id:'eco5',  text:'Usa el Eco Temporal 5 veces', stat:'eco', target:5,   coins:200, crystals:1 },
  { id:'lv3',   text:'Completa el sector 3',     stat:'maxLevel', target:4, coins:300, crystals:1 },
  { id:'lv6',   text:'Completa el sector 6',     stat:'maxLevel', target:7, coins:600, crystals:2 },
  { id:'boss3', text:'Derrota 3 jefes',          stat:'bosses', target:3,   coins:800, crystals:3 }
];
export const ACHIEVEMENTS = [
  { id:'first',  name:'Primer contacto',   text:'Destruye tu primer alien',          test:s=>s.stats.kills>=1 },
  { id:'hunter', name:'Cazador',           text:'Destruye 200 aliens',               test:s=>s.stats.kills>=200 },
  { id:'boss',   name:'Matajefes',         text:'Derrota a un jefe',                 test:s=>s.stats.bosses>=1 },
  { id:'echo',   name:'Maestro del tiempo',text:'Usa el Eco Temporal 10 veces',      test:s=>s.mis.eco>=10 },
  { id:'clean',  name:'Intocable',         text:'Completa un sector sin recibir daño',test:s=>s.stats.flawless>=1 },
  { id:'combo',  name:'Combo x20',         text:'Encadena 20 bajas seguidas',        test:s=>s.stats.bestCombo>=20 },
  { id:'half',   name:'A mitad de camino', text:'Llega al sector 5',                 test:s=>s.maxLevel>=5 },
  { id:'fleet',  name:'Flota completa',    text:'Desbloquea las 5 naves',            test:s=>Object.keys(s.ships).length>=5 },
  { id:'emperor',name:'Fin del Imperio',   text:'Derrota al Emperador Galáctico',    test:s=>s.stats.emperor>=1 }
];
export const xpForLevel = n => Math.round(120 * Math.pow(n, 1.5));

// Potenciadores: tecla -> [duración s, color, etiqueta]
export const POWER = {
  T: [12, '#ffd166', 'Triple'], P: [10, '#c58bff', 'Plasma'], M: [12, '#ff9a3c', 'Misiles'], E: [12, '#5aa8ff', 'Escudo'],
  V: [9, '#fff36a', 'Turbo'], X: [10, '#ff6ad0', 'x2'], '+': [0, '#5dff8a', 'Vida'], B: [0, '#ff4f4f', 'Bomba']
};
