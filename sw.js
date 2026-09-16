// Offline cache - na podiu nemusi byt sit.
//
// index.html a diag.html jedou network-first: kdyz je sit, vezme se nova verze,
// bez site se sahne do cache. Diky tomu se aktualizace projevi sama a nemusim
// pri kazde zmene zvedat verzi cache. Ikony a manifest jsou cache-first.
const CACHE = 'kemper-hud-v15';
const FILES = ['.', 'index.html', 'diag.html', 'manifest.webmanifest',
               'icon-192.png', 'icon-512.png', 'icon-512-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.allSettled(FILES.map(f => c.add(f))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const isPage = req =>
  req.mode === 'navigate' ||
  (req.headers.get('accept') || '').includes('text/html');

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  if (isPage(e.request)) {                      // network-first
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request, { ignoreSearch: true })
                      .then(hit => hit || caches.match('index.html')))
    );
    return;
  }

  e.respondWith(                                // cache-first
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
    )
  );
});
