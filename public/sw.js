// Simple service worker: makes the app installable and loads faster on repeat visits.
// Videos and music are left to the browser (they use range requests, which caches handle badly).
const CACHE = 'tree-v2';
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png'];
const SKIP_EXT = /\.(mp4|mov|webm|mp3|m4a|wav)$/i;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // only our own files
  if (req.headers.has('range')) return;                      // never touch range requests
  if (SKIP_EXT.test(url.pathname)) return;                   // videos / music
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_vercel/')) return;

  // Pages: network first, fall back to the cached app
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  // Everything else: serve the cached copy right away, refresh it in the background
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const refresh = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});
