// DermaCand — Service Worker
// Estrategia: network-first para HTML/JSON (siempre la última versión), cache fallback offline.
// Estática (CSS/JS/imágenes): cache-first.
// Versión: bump para forzar actualización de los clientes.

const CACHE = 'dermacand-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL).catch(() => null))
  );
  // NO skipWaiting aquí: dejamos que la versión nueva quede "esperando" para
  // que la app muestre el aviso "Actualizar". Al pulsarlo, la app envía
  // 'skipWaiting' (ver abajo) y la versión vieja se reemplaza automáticamente.
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  // 1. HTML / navegación: network-first con fallback a cache (para que offline siga abriendo la app)
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put('/', clone));
          }
          return resp;
        })
        .catch(() => caches.match('/').then(r => r || caches.match(req)))
    );
    return;
  }

  // 2. Mismo origen (CSS/JS/iconos): cache-first
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // 3. Cross-origin (Gist, PDFs en raw.githubusercontent): solo pasarelaje, ya se cachea en IndexedDB de la app
  // No interferimos para no romper CORS.
});

// Permite refrescar desde la app cuando hay una nueva versión
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
