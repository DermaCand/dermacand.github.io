// DermaCand — Service Worker
// Estrategia: network-first para HTML/JSON (siempre la última versión), cache fallback offline.
// Estática (CSS/JS/imágenes/fuentes de PDF.js/PDFs locales): cache-first.
// Versión: bump para forzar actualización de los clientes. DEBE coincidir con DC_BUILD en la app.

const CACHE = 'dermacand-v8';
// El recurso crítico es DermaCand_app.html (app autocontenida). El resto son auxiliares.
// pdf.min.js + worker se auto-alojan y se precachean para que el visor de PDF funcione sin conexión.
const APP_SHELL = ['/DermaCand_app.html', '/manifest.json', '/', '/index.html', '/pdf.min.js', '/pdf.worker.min.js'];

// Caché DURABLE: NO se borra al subir de versión. Conserva offline los assets que conviene
// mantener aunque cambie la versión de la app: PDFs vistos, iconos y las fuentes de PDF.js.
// El 'app shell' (HTML, pdf.min.js, worker, …) sigue en CACHE, que se refresca en cada versión.
const ASSET = 'dermacand-assets';
function isShell(pathname) { return APP_SHELL.indexOf(pathname) !== -1; }

// Guarda una respuesta en caché de forma segura. Si venía de una redirección
// (típico en Vercel/Pages para "/" e "/index.html"), la reconstruimos: servir una
// respuesta "redirected" a una navegación falla y rompe el offline.
async function safePut(cache, req, resp) {
  try {
    if (!resp || !resp.ok || resp.type === 'opaque') return;
    if (resp.redirected) {
      const body = await resp.blob();
      await cache.put(req, new Response(body, { status: 200, statusText: 'OK', headers: resp.headers }));
    } else {
      await cache.put(req, resp);
    }
  } catch (e) { /* nunca dejamos que un fallo de caché rompa la respuesta */ }
}

self.addEventListener('install', e => {
  // Cacheo INDIVIDUAL (no addAll atómico): que el fallo de una URL no impida cachear el resto.
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(APP_SHELL.map(u =>
        fetch(u, { cache: 'reload' }).then(r => safePut(c, u, r)).catch(() => null)
      ))
    )
  );
  // skipWaiting AQUÍ: la versión nueva se activa de inmediato, sin esperar a que se cierren
  // todas las ventanas. Imprescindible para PWA de escritorio que el usuario mantiene abiertas.
  // La página recarga al recibir 'controllerchange'.
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE && k !== ASSET).map(k => caches.delete(k)))
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

  // 1. HTML / navegación: network-first con fallback a cache.
  if (isHTML) {
    e.respondWith(
      // cache:'no-store' evita que la caché HTTP del navegador devuelva un HTML viejo:
      // forzamos siempre la última versión de la red cuando hay conexión.
      fetch(req, { cache: 'no-store' })
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => safePut(c, req, copy));
          return resp;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true })
            .then(r => r || caches.match('/DermaCand_app.html'))
            .then(r => r || caches.match('/'))
            .then(r => r || new Response(
              `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DermaCand — Sin conexión</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;background:#eef1f5;color:#333;padding:24px">
<div style="max-width:380px;text-align:center">
<div style="font-size:1.6rem;font-weight:700;margin-bottom:8px"><span style="color:#1a3a6c;font-weight:500">DERMA</span><span style="color:#0d7d8c">CAND</span></div>
<h1 style="font-size:1.15rem;margin:.4rem 0;color:#0d7d8c">Sin conexión</h1>
<p style="font-size:.95rem;line-height:1.6">Parece que es la primera vez que abres DermaCand en este dispositivo y ahora no hay conexión.</p>
<p style="font-size:.95rem;line-height:1.6"><strong>Ábrela una vez con Internet</strong> y deja pasar unos segundos: se guardará en el dispositivo y, a partir de entonces, <strong>funcionará sin conexión</strong>.</p>
<button onclick="location.reload()" style="margin-top:12px;background:#0d7d8c;color:#fff;border:none;border-radius:8px;padding:.6rem 1.3rem;font-size:.95rem;cursor:pointer">Reintentar</button>
</div></body></html>`,
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            ))
        )
    );
    return;
  }

  // 1b. dermacand.json (estructura de guías/sync): network-first, fallback a caché.
  // Así el sync siempre ve la última versión en vez de una copia cacheada.
  if (sameOrigin && url.pathname.endsWith('dermacand.json')) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => safePut(c, req, copy));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 1c. SDK de Firebase (gstatic.com/firebasejs/...): cache-first CROSS-ORIGIN, en caché durable.
  //     Imprescindible para offline: Firebase se importa desde Google; si no lo guardamos, sin
  //     conexión el módulo de login no carga. gstatic envía CORS (respuesta 'cors', cacheable).
  if (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') !== -1) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          const copy = resp.clone();
          caches.open(ASSET).then(c => safePut(c, req, copy));
          return resp;
        });
      })
    );
    return;
  }

  // 2. Mismo origen (CSS/JS/iconos/fuentes de PDF.js/PDFs locales): cache-first.
  //    El app shell va a CACHE (versionada, se refresca al actualizar); el resto (PDFs de guías,
  //    iconos, fuentes de PDF.js…) va a la caché DURABLE, para que no se pierda offline al subir de versión.
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          const copy = resp.clone();
          caches.open(isShell(url.pathname) ? CACHE : ASSET).then(c => safePut(c, req, copy));
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // 3. Cross-origin: no interferimos (CORS).
});

// Permite refrescar desde la app cuando hay una nueva versión
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
