# Nebulosa Roja — Naves vs Aliens

Arcade espacial vertical para celular y navegador, **instalable como app (PWA)** y **jugable sin internet**.
Todo el arte y el sonido se generan por código: no hay imágenes ni audios con copyright, ni dependencias externas que puedan desaparecer.

**Mecánica propia — Eco Temporal.** Cada baja carga la barra ECO. Al activarla, una copia fantasma de tu nave *repite los últimos 4 segundos de tu recorrido y de tus disparos*, absorbe balas enemigas y explota al terminar. Planeas dónde estar *ahora* para que tu pasado te cubra.

## Qué incluye
- 10 sectores con fondos distintos, 6 tipos de alien + asteroides, 3 jefes con fases (Alien Destroyer, Nave Nodriza, Emperador Galáctico).
- 5 naves desbloqueables, 6 colores, 5 mejoras permanentes, misiones, logros, ranking local y tutorial de ~35 s.
- Armas y poderes: láser, triple, plasma perforante, misiles teledirigidos, escudo, turbo, puntos x2, bombas.
- Controles: arrastrar el dedo o joystick virtual (Ajustes); teclado: flechas/WASD, `B` bomba, `E` o `Shift` Eco, `P` pausa.
- Calidad gráfica automática (baja/media/alta) según los FPS del teléfono.
- Guardado automático versionado con copia de seguridad, exportable/importable desde Ajustes.
- Modo online **opcional** (ranking mundial) con servidor propio en `/server` — el juego funciona igual sin él.

## Ejecutar en tu computador
Los módulos ES necesitan un servidor local (no abrir con doble clic):
```bash
python -m http.server 8000      # o: npx serve
# abrir http://localhost:8000
```

## Publicar gratis en GitHub Pages
Ver [`docs/PUBLICAR.md`](docs/PUBLICAR.md). Después, para saber cómo pasar a un servidor propio y cómo monetizar:
[`docs/SERVIDOR.md`](docs/SERVIDOR.md) · [`docs/MONETIZACION.md`](docs/MONETIZACION.md).

## Estructura
```
index.html  manifest.webmanifest  sw.js  icons/  css/
src/  config.js  data.js  storage.js  audio.js  sprites.js  render.js  game.js  ui.js  online.js  main.js
server/   API de ranking (Node, sin dependencias)      database/  esquema PostgreSQL
docs/     guías de publicación, servidor y monetización
```

**Al publicar cambios:** sube el número `VERSION` en `sw.js`; así los jugadores reciben la actualización.
