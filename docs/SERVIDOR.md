# Servidor propio (cuando quieras ranking mundial)

El juego **no necesita servidor**. El servidor solo agrega ranking mundial y copia de estadísticas. Está en `/server` (Node 18+, sin dependencias).

## Probarlo en tu computador
```bash
cd server
PORT=8787 node server.js          # Windows PowerShell: $env:PORT=8787; node server.js
```
Luego, en `src/config.js`, pon `API_URL: 'http://localhost:8787'`.

## Qué protege
- Nadie guarda contraseñas: cada dispositivo genera un identificador y un token aleatorios; el servidor guarda solo el *hash* del token.
- El servidor **valida** cada puntaje (rangos, relación bajas/tiempo, partida mínima, límite de peticiones, envíos duplicados). Monedas, cristales y nivel **no** se aceptan del cliente: el ranking solo recibe puntajes.
- Límite honesto: esta validación frena trampas burdas, no a alguien decidido. Si el ranking llega a tener premios, hay que verificar las partidas en el servidor (repeticiones o simulación).

## Pagar un servidor
Basta un VPS pequeño (1 vCPU / 1 GB) con Node o Docker; hay opciones de bajo costo en varios proveedores (verifica precios y región vigentes).
Pasos típicos:
1. Crea el VPS (Ubuntu), instala Node 22 o Docker.
2. Copia la carpeta `server/` y arranca con `docker build -t nebulosa-api . && docker run -d -p 8787:8787 -v nebulosa:/data -e ALLOWED_ORIGIN=https://dajesa0937.github.io --restart always nebulosa-api`.
3. Pon un dominio y HTTPS delante (Caddy o Nginx con Let's Encrypt). **Sin HTTPS los navegadores bloquean la API desde el juego.**
4. En `src/config.js` pon `API_URL: 'https://api.tudominio.com'`, sube `VERSION` en `sw.js` y vuelve a publicar.
5. Haz copias periódicas del volumen `/data`.

Cuando haya miles de jugadores, migra a PostgreSQL con `database/schema.sql` (ya está el esquema).
