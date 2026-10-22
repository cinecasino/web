# Cambios

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones, [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

### Cambiado
- **La web pasa a GitHub Pages** (`pages.yml`): es 100 % estática, sin registro, con el navegador llamando a TMDB directamente. Se retira Vercel.
- Cuentas, partida en la nube y panel de administración quedan como **modo server** opcional (`npm run dev:server` / `build:server`), apagado en la versión publicada.
- La landing, la política de privacidad y la de cookies se adaptan a cada modo.
- Todas las rutas internas llevan el prefijo del sitio (`u()`), así que la web funciona en `<org>.github.io/` y en `<org>.github.io/<repo>/`.
- **Rendimiento:** solo se cargan las fuentes del alfabeto latino (de 24 `@font-face` a 5) y se precargan las dos principales; conexión anticipada con TMDB; el fondo ya no usa `filter: blur` animado ni los pósters `backdrop-filter`; menos efectos en móvil.
- El bote de la tragaperras ya no guarda la partida cada 2 segundos (hacía repintarse a las demás pestañas abiertas).
- La caché de datos de TMDB del service worker tiene tope (250 respuestas).
- La ruleta "¿Qué veo hoy?" precarga solo los ~20 carteles que va a enseñar, no el botín entero.
- La ficha y las cajas esperan a tener el cartel descargado antes de destaparlo.

### Añadido
- Página 404 propia.
- El CI prueba los dos modos y comprueba que ningún enlace se sale del prefijo.
- Modo server: `GET /api/health` y detección de las variables de la integración Turso (`*TURSO_DATABASE_URL` / `*TURSO_AUTH_TOKEN`).
- **Accesibilidad:** respeta "reducir movimiento" del sistema (sin confeti, temblores ni bucles decorativos), anillo de foco con teclado, enlace "Saltar al contenido", pósters que se abren también con Espacio, avisos y resultados leídos por lectores de pantalla.
- **SEO y compartir:** URL canónica, Open Graph completo con captura grande, `robots.txt`, `sitemap.xml` y `noindex` en 404, sin conexión, cuenta y admin.

### Corregido
- Rasca y gana: en móvil, al ocultarse la barra de direcciones se volvía a tapar lo ya rascado.
- ¿Más o Menos?: si TMDB fallaba a mitad de racha la partida se quedaba bloqueada; ahora te planta con el bote. Las flechas ya no desplazan la página mientras juegas.
- Mensajes de error de TMDB pensados para el público (ya no hablan de `.env` ni de `TMDB_TOKEN`).
- `npm audit` ya no avisa de nada: el aviso venía del adaptador de Vercel.
- Dependabot no propone TypeScript 7 hasta que `@astrojs/check` lo soporte.

## [0.9.0-beta.1] — 2026-10-20

Primera beta pública.

### Juegos
- Tragaperras de géneros con jackpot progresivo, apuestas de 50/100/250, modo AUTO y "casi-casi" en el tercer rodillo.
- Ruleta de géneros con casillas x2, JACKPOT y QUIEBRA.
- Cajas de botín (Bronce, Plata, Oro y Diamante) con probabilidades por rareza a la vista.
- Rasca y gana: el boleto premiado da fichas y además su título va al botín.
- ¿Más o Menos?: adivina qué título tiene más nota, con bote creciente y opción de plantarse.
- "Me siento con suerte" y la ruleta "¿Qué veo hoy?" entre tus pendientes.

### Progreso
- Fichas, XP, niveles, 22 logros, bonus diario con racha y rescate si te arruinas.
- Al botín solo entra lo que ganas jugando. Abrir un póster cualquiera (tendencias, ticker, landing) es solo mirar, y "Ya la vi" solo da fichas por títulos de tu botín.
- Botín con rarezas (Común → Mítica). Los títulos sin estrenar se marcan 🔮 Próximamente y los que tienen menos de 20 votos ❔ Sin valorar.

### Cuentas y administración
- Cuentas opcionales con la partida sincronizada entre dispositivos. Al registrarte puedes conservar la partida de invitado.
- Cambiar contraseña, descargar tus datos y borrar la cuenta.
- Panel de administración: estadísticas, usuarios, regalos, mensajes, suspensiones, contraseñas temporales, anuncio global y registro de auditoría.

### Plataforma
- Proxy de TMDB en el servidor: el token ya no llega al navegador.
- App instalable (PWA) que funciona sin conexión.
- Landing con mini-demos jugables y créditos.
- Políticas de privacidad y cookies, y aviso de consentimiento para los tráileres de YouTube.
- Fuentes servidas desde la propia web, sin Google Fonts.
