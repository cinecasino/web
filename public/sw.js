// Service worker de Cine Casino: app instalable y uso sin conexión.
// Sube VERSION al cambiar este archivo para invalidar las cachés antiguas.
const VERSION = 'v3';
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const IMAGES = 'tmdb-img-v1';
const DATA = `tmdb-data-${VERSION}`;
const MAX_IMAGES = 400;
// Cada tirada pide una página aleatoria de TMDB, así que sin tope esta caché crecía sin parar
const MAX_DATA = 250;
const LIMITS = { [IMAGES]: MAX_IMAGES, [DATA]: MAX_DATA };

// Prefijo del sitio ("/" o "/<repo>/" en GitHub Pages), sacado del scope con el que se registró
const BASE = new URL(self.registration.scope).pathname;
const at = (path) => BASE + path;
const PRECACHE = ['', 'offline/', 'landing/', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'].map(at);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  const keep = new Set([SHELL, ASSETS, IMAGES, DATA]);
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

async function cacheFirst(req, cacheName) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') {
    store(cacheName, req, res.clone());
  }
  return res;
}

// Guarda y, si la caché tiene tope, borra las entradas más antiguas
async function store(cacheName, req, res) {
  await (await caches.open(cacheName)).put(req, res);
  if (LIMITS[cacheName]) await trim(cacheName, LIMITS[cacheName]);
}

async function networkFirst(req, cacheName, fallbackUrl) {
  try {
    const res = await fetch(req);
    if (res.ok) store(cacheName, req, res.clone());
    return res;
  } catch {
    const hit = await caches.match(req);
    if (hit) return hit;
    if (fallbackUrl) return caches.match(fallbackUrl);
    return new Response(JSON.stringify({ error: 'Sin conexión' }), { status: 503, headers: { 'content-type': 'application/json' } });
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Carteles de TMDB: caché primero (no cambian)
  if (url.hostname === 'image.tmdb.org') return e.respondWith(cacheFirst(req, IMAGES));
  // Datos de TMDB (directo en GitHub Pages, o vía nuestro proxy): red primero, caché si no hay conexión
  if (url.hostname === 'api.themoviedb.org') return e.respondWith(networkFirst(req, DATA));
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(at('api/tmdb/'))) return e.respondWith(networkFirst(req, DATA));
  // Resto de la API (cuenta, partidas, admin): nunca desde caché
  if (url.pathname.startsWith(at('api/')) || url.pathname.startsWith(at('admin'))) return;

  // Recursos con hash (JS, CSS, fuentes) e iconos: caché primero
  if (['_astro/', 'icons/', 'brand/'].some((p) => url.pathname.startsWith(at(p)))) return e.respondWith(cacheFirst(req, ASSETS));
  // Páginas: red primero, copia guardada o página offline si falla
  if (req.mode === 'navigate') return e.respondWith(networkFirst(req, SHELL, at('offline/')));
});
