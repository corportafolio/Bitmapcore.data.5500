const CACHE_NAME = 'bitmapcore-static-v122';

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

var OFFLINE = new Response('Offline', {status: 503, headers: {'Content-Type': 'text/plain'}});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;
  if (e.request.url.includes('chrome-extension')) return;
  if (e.request.url.includes('/api/')) return;
  if (e.request.url.includes('/version.txt')) return;
  if (e.request.url.includes('cdn.tailwindcss.com')) return;

  if (e.request.url.endsWith('.html') || e.request.url === self.location.origin + '/' || e.request.url.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(function(r) {
        if (r && r.ok) {
          var cl = r.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, cl); });
        }
        return r;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || OFFLINE;
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(r) {
        if (r && r.ok) {
          var cl = r.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, cl); });
        }
        return r;
      }).catch(function() {
        return OFFLINE;
      });
    }).catch(function() {
      return OFFLINE;
    })
  );
});
