# 🎰 Cine Casino

> **Beta pública · v0.9.0-beta.1.** Puede haber fallos y las partidas podrían reiniciarse antes de la versión final. [Reporta lo que encuentres](../../issues/new/choose).

Juegos de casino **sin dinero real** para decidir qué película o serie ver esta noche.
Tiras de la palanca, giras la ruleta o rascas un boleto, y el premio es un título real de [TMDB](https://www.themoviedb.org) con su sinopsis, su tráiler y dónde verlo en España.

| | |
|---|---|
| 🎰 **Juegos** | Tragaperras, ruleta, cajas de botín, rasca y gana, ¿Más o Menos? y "Me siento con suerte" |
| 💎 **Progreso** | Fichas, XP, niveles, 22 logros, bonus diario y un botín con rarezas de Común a Mítica |
| 💾 **Sin registro** | La partida vive en tu navegador; puedes exportarla e importarla en otro dispositivo |
| 📲 **App** | Instalable en Android y en escritorio, y funciona sin conexión |
| 🛡️ **Privacidad** | Sin cuentas, sin analítica, sin publicidad y sin cookies propias |

**Las fichas no se compran, no se venden y no se canjean por nada.** Es un juego simulado.

---

## Índice

- [Dos modos: pages y server](#dos-modos-pages-y-server)
- [Puesta en marcha](#puesta-en-marcha)
- [Publicar en GitHub Pages](#publicar-en-github-pages)
- [Integración continua y versiones](#integración-continua-y-versiones)
- [Configuración](#configuración)
- [Cómo funciona](#cómo-funciona)
- [Estructura](#estructura)
- [Modo server (opcional)](#modo-server-opcional)
- [Lanzar tu propia instancia](#lanzar-tu-propia-instancia)
- [Créditos y licencias](#créditos-y-licencias)

## Dos modos: pages y server

| | **pages** (el que está publicado) | **server** (opcional, apagado) |
|---|---|---|
| Dónde corre | GitHub Pages: solo archivos estáticos | Cualquier servidor Node (VPS, Render, Railway…) |
| Juegos, botín, logros, PWA | ✅ | ✅ |
| Cuentas y partida en la nube | ❌ (exportar/importar a mano en *Mi Botín*) | ✅ |
| Panel `/admin` y anuncios | ❌ | ✅ |
| TMDB | El navegador llama directo; **el token es público** | Proxy en el servidor; el token queda oculto |
| Compilar | `npm run build` | `npm run build:server` |

El código de servidor está en `src/server-pages/` y `src/server/`. En modo pages no se compila: [`astro.config.mjs`](astro.config.mjs) solo añade esas rutas en modo server.

## Puesta en marcha

Requisitos: **Node 22.9 o superior** y un token de lectura de la API de TMDB (gratis en <https://www.themoviedb.org/settings/api>).

```bash
npm install
cp .env.example .env      # rellena PUBLIC_TMDB_TOKEN
npm run dev               # http://localhost:4321
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Desarrollo en modo pages (como en GitHub Pages) |
| `npm run dev:server` | Desarrollo en modo server (cuentas y admin; ver más abajo) |
| `npm run check` | Comprobación de tipos |
| `npm run build` | Web estática en `dist/` |
| `npm run preview` | Sirve `dist/` en local para probar la compilación |

## Publicar en GitHub Pages

Cuando el CI de un push a `main` pasa en verde, [`pages.yml`](.github/workflows/pages.yml) compila la web y la publica en GitHub Pages. Después comprueba que responde.

**Una sola vez:**

1. **Activar Pages:** en el repo, *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
2. **Token de TMDB:** *Settings → Secrets and variables → Actions → New repository secret* → `PUBLIC_TMDB_TOKEN` con tu token de lectura (v4).
   > ⚠️ En modo pages este token **acaba en el JavaScript público**: cualquiera puede verlo. Es de solo lectura, pero alguien podría gastar tu cuota. Si ves abusos, regenéralo en TMDB y actualiza el secreto.
3. **Primer despliegue:** *Actions → Pages → Run workflow*, o haz cualquier push a `main`. La URL aparece en el resumen del job y en *Settings → Pages*.

**¿En qué URL sale?**

| Nombre del repo | URL |
|---|---|
| `cinecasino.github.io` | `https://cinecasino.github.io/` |
| cualquier otro, p. ej. `web` | `https://cinecasino.github.io/web/` |

El workflow detecta el prefijo (`BASE_PATH`) solo, así que la web funciona igual en los dos casos. Para tener la URL corta, renombra el repo a `cinecasino.github.io` en *Settings → General*; GitHub redirige el nombre antiguo. También puedes usar un dominio propio en *Settings → Pages → Custom domain*.

## Integración continua y versiones

| Workflow | Cuándo | Qué hace |
|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | Push a `main`, PRs y a mano | **Web estática:** tipos, compilación bajo un subdirectorio, comprueba que ningún enlace se sale del prefijo y hace una prueba de humo de las páginas. **Servidor:** compila el modo server y prueba registro, sesión, admin, proxy y CSRF. No necesita secretos. |
| [`pages.yml`](.github/workflows/pages.yml) | Cuando el CI de un push a `main` pasa, o a mano | Compila en modo pages, publica en GitHub Pages y comprueba que la web responde |
| [`release.yml`](.github/workflows/release.yml) | Al subir una etiqueta `v*` | Comprueba que la etiqueta coincide con `package.json`, compila y crea la Release con las notas de `CHANGELOG.md`. Si la versión lleva guion (`-beta.1`), la marca como pre-release. |
| [`dependabot.yml`](.github/dependabot.yml) | Semanal / mensual | PRs con actualizaciones de npm (Astro agrupado) y de las Actions |

**Publicar una versión nueva:**

```bash
# 1. Añade la sección "## [0.9.0-beta.2] — fecha" a CHANGELOG.md
npm version 0.9.0-beta.2 -m "v%s"   # actualiza package.json, hace commit y crea la etiqueta
git push --follow-tags               # CI → Pages, y Release por la etiqueta
```

La versión que se ve en el pie de la web sale de `package.json`.

> **Consejo:** en *Settings → Branches* protege `main` y marca como obligatorios los checks **"Web estática (GitHub Pages)"** y **"Servidor con cuentas (modo server)"**. Así nada roto llega a producción.

## Configuración

| Dónde | Qué |
|---|---|
| `.env` (local) / secreto del repo | `PUBLIC_TMDB_TOKEN` para el modo pages. Las variables del modo server se describen en [`.env.example`](.env.example). |
| [`src/site.ts`](src/site.ts) | Identidad: nombre, palabras del logo, eslogan, fase (`Beta`), responsable, email de contacto y repo. Lo usan los títulos, el logo, el manifest de la app, la landing y los textos legales. Aquí está también `u()`, que añade el prefijo a las rutas internas: **nunca escribas `"/ruleta"` a pelo, usa `u('ruleta')`**. |
| `public/icons/` | Iconos de la app (192, 512, *maskable*, Apple y favicon) |
| `public/brand/tmdb.svg` | Logo oficial de TMDB (ver más abajo) |
| [`public/sw.js`](public/sw.js) | Service worker. **Sube `VERSION` cuando cambies este archivo** para que se invaliden las cachés. |

## Cómo funciona

```
Navegador ──► GitHub Pages (HTML, CSS y JS estáticos)
   │
   ├─► api.themoviedb.org   títulos, géneros, fichas   (con PUBLIC_TMDB_TOKEN)
   ├─► image.tmdb.org       carteles
   └─► localStorage         partida: fichas, nivel, botín, logros
```

- **Toda la partida se calcula y se guarda en el navegador.** Para pasarla a otro dispositivo: *Mi Botín → Copia de seguridad → Exportar / Importar*.
- **El service worker** guarda la web, las respuestas de TMDB y los carteles, así que la app instalada abre sin conexión.
- **Cualquiera con conocimientos puede trucar sus fichas.** En un juego individual no importa, pero antes de añadir rankings o algo competitivo habría que validar las jugadas en un servidor (modo server).

## Estructura

```
src/
├─ site.ts               identidad del sitio y u() para rutas con prefijo
├─ layouts/Casino.astro  layout común (variantes "game" y "page")
├─ pages/                juegos, landing, legales, 404 y manifest (los dos modos)
├─ server-pages/         solo modo server: /cuenta, /admin y /api/*
├─ server/               solo modo server: base de datos, autenticación, HTTP
├─ middleware.ts         solo modo server: sesión, protección de /admin y CSRF
├─ lib/                  código del navegador: store, juegos, efectos, sonido, PWA, cookies
└─ styles/global.css
public/                  iconos, capturas para el instalador y service worker
```

## Modo server (opcional)

Añade cuentas, partida en la nube, panel de administración (estadísticas, usuarios, regalos, mensajes, suspensiones, anuncio global, auditoría) y un proxy de TMDB que mantiene el token en secreto. GitHub Pages no puede ejecutarlo: necesita un servidor Node.

```bash
# .env: TMDB_TOKEN, DATABASE_URL (archivo local o Turso) y ADMIN_EMAILS (ver .env.example)
npm run dev:server          # desarrollo
npm run build:server        # compilación
npm start                   # producción (lee .env; puerto 4321 o PORT)
```

- La base de datos local se crea sola en `data/casino.db`. En producción, usa [Turso](https://turso.tech) con `DATABASE_URL` + `DATABASE_AUTH_TOKEN`. También se detectan las variables `*TURSO_DATABASE_URL` / `*TURSO_AUTH_TOKEN` de su integración.
- Regístrate en `/cuenta` con un email de `ADMIN_EMAILS` y serás admin; el panel está en `/admin`.
- `GET /api/health` dice si la base de datos y TMDB están bien configurados.
- **Seguridad:** contraseñas con scrypt, cookie de sesión `httpOnly` y `SameSite=Lax` con solo el hash del token en la base de datos, protección CSRF, límite de intentos y lista blanca de rutas en el proxy de TMDB.

## Lanzar tu propia instancia

- [ ] Rellena [`src/site.ts`](src/site.ts): nombre, responsable, email de contacto y `repo`.
- [ ] **Logo de TMDB:** sus [condiciones](https://www.themoviedb.org/api-terms-of-use) lo exigen. Descárgalo de <https://www.themoviedb.org/about/logos-attribution> y guárdalo como `public/brand/tmdb.svg`; aparecerá solo en el pie y en los créditos.
- [ ] Si cambias el nombre, regenera también los iconos de `public/icons/` y las capturas de `public/screenshots/`.
- [ ] Haz que alguien de confianza revise la política de privacidad: es una base razonable, no asesoría legal.
- [ ] Si algún día hay anuncios o suscripciones, necesitas un acuerdo comercial con TMDB.
- [ ] **No vendas nunca fichas ni cajas por dinero:** pasaría a estar regulado como juego de azar.

## Créditos y licencias

- **Datos e imágenes:** [TMDB](https://www.themoviedb.org). *Este producto usa la API de TMDB, pero TMDB no lo respalda ni lo certifica.*
- **Plataformas de streaming:** [JustWatch](https://www.justwatch.com), a través de TMDB.
- **Tipografías:** Bungee y Bungee Shade (David Jonathan Ross) y Rubik (Hubert & Fischer), con licencia SIL OFL.
- **Código de terceros:** [canvas-confetti](https://github.com/catdad/canvas-confetti) (ISC), [Astro](https://astro.build) (MIT) y [libSQL](https://github.com/tursodatabase/libsql) (MIT).
- **Icono:** emoji 🎰 de [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) de Microsoft (MIT).

¿Encontraste un fallo de seguridad? Lee [SECURITY.md](SECURITY.md). Historial de versiones: [CHANGELOG.md](CHANGELOG.md).
