# 🎰 Cine Casino

> **Beta pública · v0.9.0-beta.1.** Puede haber fallos y las partidas podrían reiniciarse antes de la versión final. [Reporta lo que encuentres](../../issues/new/choose).

Juegos de casino **sin dinero real** para decidir qué película o serie ver esta noche.
Tiras de la palanca, giras la ruleta o rascas un boleto, y el premio es un título real de [TMDB](https://www.themoviedb.org) con su sinopsis, su tráiler y dónde verlo en España.

| | |
|---|---|
| 🎰 **Juegos** | Tragaperras, ruleta, cajas de botín, rasca y gana, ¿Más o Menos? y "Me siento con suerte" |
| 💎 **Progreso** | Fichas, XP, niveles, 22 logros, bonus diario y un botín con rarezas de Común a Mítica |
| ☁️ **Cuentas** | Opcionales: la partida se sincroniza entre dispositivos y se puede exportar o borrar |
| 🛠️ **Administración** | Estadísticas, gestión de usuarios, regalos, mensajes, anuncio global y auditoría |
| 📲 **App** | Instalable en Android y en escritorio, y funciona sin conexión |
| 🛡️ **Privacidad** | Sin analítica, sin publicidad y sin rastreo |

**Las fichas no se compran, no se venden y no se canjean por nada.** Es un juego simulado.

---

## Índice

- [Puesta en marcha](#puesta-en-marcha)
- [Publicar](#publicar-github--vercel--turso)
- [Configuración](#configuración)
- [Cómo funciona](#cómo-funciona)
- [Estructura](#estructura)
- [Lanzar tu propia instancia](#lanzar-tu-propia-instancia)
- [Créditos y licencias](#créditos-y-licencias)

## Puesta en marcha

Requisitos: **Node 22.9 o superior** y una clave de la API de TMDB (gratis en <https://www.themoviedb.org/settings/api>).

```bash
npm install
cp .env.example .env      # rellena TMDB_TOKEN y pon tu email en ADMIN_EMAILS
npm run dev               # http://localhost:4321
```

- La base de datos local se crea sola en `data/casino.db`.
- Regístrate en `/cuenta` con un email de `ADMIN_EMAILS` y serás admin (panel en `/admin`).

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run check` | Comprobación de tipos |
| `npm run build` | Compilación de producción en `dist/` |
| `npm start` | Arranca la compilación de producción (lee `.env`, puerto 4321 o `PORT`) |

## Publicar (GitHub → Vercel + Turso)

1. **GitHub:** sube el repo. `.env` y `data/` están en `.gitignore`, así que ni el token ni la base de datos se suben. La GitHub Action de [`ci.yml`](.github/workflows/ci.yml) comprueba los tipos y compila en cada push y en cada PR.
2. **Turso** (base de datos, plan gratuito): crea una base en [turso.tech](https://turso.tech) y copia su URL `libsql://…` y un token.
3. **Vercel:** *Add New → Project →* importa el repo (detecta Astro solo) y añade estas variables en *Environment Variables*:

   | Variable | Valor |
   |---|---|
   | `TMDB_TOKEN` | Token de lectura v4 de TMDB |
   | `DATABASE_URL` | `libsql://tu-base.turso.io` |
   | `DATABASE_AUTH_TOKEN` | Token de Turso |
   | `ADMIN_EMAILS` | Tu email (varios, separados por comas) |

4. **Deploy.** Las tablas se crean solas en la primera petición. Regístrate con tu email de admin.
5. A partir de ahí, **cada `git push` a `main` vuelve a desplegar** y cada PR tiene su propia URL de vista previa.

> **Vistas previas y base de datos:** si no defines otro `DATABASE_URL` para el entorno *Preview*, las vistas previas comparten base de datos con producción. Para una beta lo recomendable es crear una segunda base en Turso y asignarla solo a *Preview*.

Vercel pone HTTPS automáticamente, y la app instalable lo necesita. El adaptador se elige solo: `@astrojs/vercel` en Vercel y `@astrojs/node` en cualquier otro sitio. En un VPS, Render o Railway basta con `npm run build && npm start`. Si usas `DATABASE_URL=file:…` necesitarás además un disco persistente.

## Integración continua y versiones

| Workflow | Cuándo | Qué hace |
|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | Push a `main`, PRs y a mano | `npm ci` → tipos → compilación → arranca el servidor y hace una prueba de humo: páginas, manifest, protección de `/admin`, proxy, CSRF, registro y sesión. No necesita secretos. |
| [`release.yml`](.github/workflows/release.yml) | Al subir una etiqueta `v*` | Comprueba que la etiqueta coincide con `package.json`, compila y crea la Release con las notas de `CHANGELOG.md`. Si la versión lleva guion (`-beta.1`), la marca como pre-release. |
| [`dependabot.yml`](.github/dependabot.yml) | Semanal / mensual | PRs con actualizaciones de npm (Astro y sus adaptadores agrupados) y de las Actions |

**Publicar una versión nueva:**

```bash
# 1. Añade la sección "## [0.9.0-beta.2] — fecha" a CHANGELOG.md
npm version 0.9.0-beta.2 -m "v%s"   # actualiza package.json, hace commit y crea la etiqueta
git push --follow-tags               # CI + Release; Vercel despliega main
```

La versión que se ve en el pie de la web sale de `package.json`.

> **Consejo:** en *Settings → Branches* protege `main` y marca el check **"Tipos, compilación y prueba de humo"** como obligatorio. Así nada roto llega a producción.

## Configuración

| Dónde | Qué |
|---|---|
| `.env` / variables del hosting | Secretos: `TMDB_TOKEN` (o `TMDB_API_KEY`), `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `ADMIN_EMAILS` |
| [`src/site.ts`](src/site.ts) | Identidad: nombre, palabras del logo, eslogan, fase (`Beta`), versión, responsable, email de contacto y repo. Lo usan los títulos, el logo, el manifest de la app, la landing y los textos legales. |
| `public/icons/` | Iconos de la app (192, 512, *maskable*, Apple y favicon) |
| `public/brand/tmdb.svg` | Logo oficial de TMDB (ver más abajo) |
| [`public/sw.js`](public/sw.js) | Service worker. **Sube `VERSION` cuando cambies este archivo** para que se invaliden las cachés. |

## Cómo funciona

```
Navegador ──► Astro (páginas estáticas: juegos, landing, legales)
   │
   ├─► /api/tmdb/*    proxy con lista blanca y caché  ──►  TMDB   (el token vive solo en el servidor)
   ├─► /api/auth/*    registro, login, logout, me
   ├─► /api/save      partida en la nube (gana la más reciente)
   ├─► /api/account/* cambiar contraseña, exportar datos, borrar cuenta
   └─► /api/admin/*   solo para admins
                          │
                          ▼
                  libSQL (SQLite local · Turso en producción)
```

- **Sin cuenta**, la partida vive en el `localStorage` del navegador.
- **Con cuenta**, la partida se sube sola unos segundos después de cada cambio y también al cerrar la pestaña. Entre dispositivos gana la versión más reciente. Si tienes progreso de invitado y la cuenta ya tiene partida, la web te pregunta cuál conservar.
- **Regalos y mensajes del admin** van a un buzón y se aplican la próxima vez que el jugador abre la web, así que nunca pisan una partida en curso.
- **Seguridad:**
  - Contraseñas con scrypt.
  - Cookie de sesión `httpOnly` y `SameSite=Lax`; en la base de datos solo se guarda un hash del token.
  - Protección CSRF (`Sec-Fetch-Site` / `Origin`).
  - Límite de intentos de registro y login.
  - El proxy de TMDB solo acepta una lista blanca de rutas.
- **La partida se calcula en el navegador.** Para una beta individual vale, pero cualquiera con conocimientos puede trucar sus fichas. Antes de añadir rankings o cualquier cosa competitiva habrá que validar las jugadas en el servidor.

## Estructura

```
src/
├─ site.ts               identidad del sitio (nombre, versión, responsable…)
├─ middleware.ts         sesión, protección de /admin y CSRF
├─ layouts/Casino.astro  layout común (variantes "game" y "page")
├─ pages/                juegos, landing, cuenta, admin, legales y api/
├─ lib/                  código del navegador: store, juegos, efectos, sonido, cuenta, PWA, cookies
├─ server/               código del servidor: base de datos, autenticación, utilidades HTTP
└─ styles/global.css
public/                  iconos, capturas para el instalador y service worker
```

## Lanzar tu propia instancia

- [ ] Rellena [`src/site.ts`](src/site.ts): nombre, responsable, email de contacto y `repo` (activa el enlace "Reportar un problema").
- [ ] **Logo de TMDB:** sus [condiciones](https://www.themoviedb.org/api-terms-of-use) lo exigen. Descárgalo de <https://www.themoviedb.org/about/logos-attribution> y guárdalo como `public/brand/tmdb.svg`; aparecerá solo en el pie y en los créditos.
- [ ] Si cambias el nombre, regenera también los iconos de `public/icons/` y las capturas de `public/screenshots/`.
- [ ] Haz que alguien de confianza revise la política de privacidad: es una base razonable, no asesoría legal.
- [ ] Si algún día hay anuncios o suscripciones, necesitas un acuerdo comercial con TMDB.
- [ ] **No vendas nunca fichas ni cajas por dinero:** pasaría a estar regulado como juego de azar.

> `npm audit` avisa de `path-to-regexp` dentro de `@astrojs/vercel`. Es código que solo se usa al compilar, no en la web publicada. El "arreglo" que propone `npm audit fix --force` baja a una versión incompatible con Astro 7.

## Créditos y licencias

- **Datos e imágenes:** [TMDB](https://www.themoviedb.org). *Este producto usa la API de TMDB, pero TMDB no lo respalda ni lo certifica.*
- **Plataformas de streaming:** [JustWatch](https://www.justwatch.com), a través de TMDB.
- **Tipografías:** Bungee y Bungee Shade (David Jonathan Ross) y Rubik (Hubert & Fischer), con licencia SIL OFL.
- **Código de terceros:** [canvas-confetti](https://github.com/catdad/canvas-confetti) (ISC), [Astro](https://astro.build) (MIT) y [libSQL](https://github.com/tursodatabase/libsql) (MIT).
- **Icono:** emoji 🎰 de [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) de Microsoft (MIT).

¿Encontraste un fallo de seguridad? Lee [SECURITY.md](SECURITY.md). Historial de versiones: [CHANGELOG.md](CHANGELOG.md).
