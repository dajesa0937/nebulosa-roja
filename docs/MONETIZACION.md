# Monetización: opciones realistas

El juego es **gratis y completo**; no hay pagos obligatorios. La arquitectura ya tiene la base: *cristales* (moneda blanda que dan los jefes), *colores/skins* y un menú de Hangar.

## Opciones, de menor a mayor esfuerzo
1. **Cosméticos de pago** (skins, estelas, efectos de explosión): no alteran la dificultad, lo que mejor se recibe en juegos arcade. Requiere vender cristales o skins: en Android, mediante *Google Play Billing* al empaquetar la app; en web, una pasarela (Wompi, PayU, Mercado Pago, Stripe).
2. **Anuncios con recompensa opcionales** ("mira un video y duplica tus monedas"): se integran al empaquetar con Capacitor + AdMob. Nunca interrumpir el juego en mitad de un sector.
3. **Pase de temporada / "Sin anuncios"**: pago único o suscripción, cuando ya haya jugadores recurrentes.

## Antes de cobrar
- **Nombre y marca:** comprueba que "Nebulosa Roja" esté libre y regístralo en la SIC (Superintendencia de Industria y Comercio). Que el juego sea de diseño propio no garantiza que nadie haya usado algo parecido: investiga antes de afirmarlo en publicidad.
- **Compras seguras:** al vender, el servidor debe verificar el recibo y entregar los cristales; nunca confiar en el cliente (por eso `server/` no acepta monedas ni cristales).
- **Privacidad y términos:** política de privacidad obligatoria en Google Play y para anuncios; si recolectas datos, cumplir la Ley 1581 de 2012 (habeas data) en Colombia.
- **Impuestos:** consulta con un contador cómo facturar ingresos de la tienda de apps y pasarelas.

## Orden sugerido
Publicar gratis → medir si la gente vuelve (¿cuántos completan el sector 3?) → añadir 10–15 skins → recién entonces tienda de pago y anuncios con recompensa.
