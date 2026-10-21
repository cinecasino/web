# Cambios

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones, [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

### Cambiado
- **La web pasa a GitHub Pages** (`pages.yml`): es 100 % estática, sin registro, con el navegador llamando a TMDB directamente. Se retira Vercel.
- Cuentas, partida en la nube y panel de administración quedan como **modo server** opcional (`npm run dev:server` / `build:server`), apagado en la versión publicada.
- La landing, la política de privacidad y la de cookies se adaptan a cada modo.
- Todas las rutas internas llevan el prefijo del sitio (`u()`), así que la web funciona en `<org>.github.io/` y en `<org>.github.io/<repo>/`.

### Añadido
- Página 404 propia.
- El CI prueba los dos modos y comprueba que ningún enlace se sale del prefijo.
- Modo server: `GET /api/health` y detección de las variables de la integración Turso (`*TURSO_DATABASE_URL` / `*TURSO_AUTH_TOKEN`).

### Corregido
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
