# Publicar en GitHub y probar en el celular

## 1. Subir los archivos
Desde la carpeta del proyecto (donde está `index.html`):
```bash
git add -A
git commit -m "Nebulosa Roja 2.0: sectores, jefes, Eco Temporal, hangar, PWA offline"
git push origin main
```
Si `git push` pide credenciales: GitHub ya no acepta la contraseña de la cuenta; usa **GitHub Desktop**, o crea un *Personal Access Token* (Settings → Developer settings → Tokens) y úsalo como contraseña.

## 2. Activar GitHub Pages
Repositorio → **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
En 1–2 minutos queda en `https://dajesa0937.github.io/nebulosa-roja/`.

## 3. Instalarlo en el celular (Android)
1. Abre esa dirección en **Chrome**.
2. Menú ⋮ → **Instalar aplicación** (o el botón *Instalar app* del menú del juego).
3. Aparece el icono *Nebulosa Roja* en el teléfono. Ábrelo una vez con internet; desde ahí funciona en **modo avión**.

## 4. Lista de comprobación antes de compartirlo
- [ ] Abre el juego con internet, juega un sector, cierra.
- [ ] Activa modo avión → abre la app → juega: debe funcionar igual.
- [ ] Sube y baja el volumen en Ajustes; prueba "Joystick virtual".
- [ ] Gana monedas, cierra la app, ábrela: el progreso sigue.
- [ ] Tras cada cambio, sube `VERSION` en `sw.js` y vuelve a publicar.

## 5. Más adelante: Google Play
La PWA se puede empaquetar como app de Android sin reescribirla (Trusted Web Activity con *Bubblewrap* o Capacitor). Google Play exige una cuenta de desarrollador (pago único; verifica el valor vigente) y una política de privacidad.
