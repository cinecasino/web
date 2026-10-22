# Cambios

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones, [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

### Añadido (en curso: fase 1)
- **Proxy de TMDB en Cloudflare Workers** (`worker/`, desplegado por la integración de Git de Cloudflare; `worker.yml` lo comprueba): la web pide los datos al Worker, que guarda el token en secreto, solo deja pasar las rutas de la lista blanca (compartida con el modo server en `src/lib/tmdb-routes.ts`), solo responde a los orígenes permitidos y cachea en Cloudflare. Se activa con la variable `PUBLIC_TMDB_PROXY`; con ella el token ya no entra en la web y Pages comprueba que no aparece en `dist/`.
- **Ajustes ⚙️:** "solo mis plataformas" (Netflix, Prime…, solo lo incluido en la suscripción), país de "dónde verla" e idioma de títulos y sinopsis (español o inglés).
- **Halloween** (24 de octubre – 2 de noviembre): tema naranja y morado, Ruleta del Terror, Caja Maldita y dos logros de temporada. Se puede forzar con `?evento=halloween`.
- **Tests con Vitest** (`npm test`, también en el CI): rarezas, partida, tragaperras (incluido su retorno exacto al jugador), eventos y Worker.
- **9 rarezas:** se añaden 💩 Bodrio, 🟢 Poco común, 👁️ Reliquia (obra maestra anterior a 1970) y ✨ Divina. Las cartas que ya tenías se recalculan al cargar la partida.
- **Sellos:** pegatinas que salen de los datos de TMDB: Clásico, Cine mudo, Joya oculta, Taquillazo, Recién salida, Internacional y, en la ficha, Maratón y Exprés.
- **Artes:** cada premio sale con un acabado sorteado: Brillante, Holográfico, Noir, VHS, Pop-art, Píxel, Dorado, Glitch, Lenticular, Firmada, Billete dorado (+5.000 fichas) y, en Halloween, Embrujada. Las apuestas altas y las cajas caras suben la probabilidad.
- **Copias y Taller:** un título repetido ya no se pierde, se guarda como copia; con 3 copias o con fichas se sube el arte de una carta un escalón.
- **Álbum de artes** y filtros por sello y por arte en Mi Botín; 13 logros nuevos.

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
