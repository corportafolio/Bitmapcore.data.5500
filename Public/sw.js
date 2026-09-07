const CACHE_NAME = 'bitmapcore-static-v121';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(ks) {
      return Promise.all(ks.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;
  if (e.request.url.includes('chrome-extension')) return;
  if (e.request.url.includes('/api/')) return;
  if (e.request.url.includes('/version.txt')) return;
  if (e.request.url.includes('cdn.tailwindcss.com')) return;

  if (e.request.url.endsWith('.html') || e.request.url.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(function(r) {
        var cl = r.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(e.request, cl); });
        return r;
      }).catch(function() { return caches.match(e.request); })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(r) {
      if (r) return r;
      return fetch(e.request).then(function(resp) {
        var cl = resp.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(e.request, cl); });
        return resp;
      });
    })
  );
});
