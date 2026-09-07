const CACHE_NAME = 'bitmapcore-v120';
const PRECACHE = [
  '/',
  '/app.html',
  '/index.html',
  '/components.js',
  '/core.js',
  '/pages-home.js',
  '/pages-local.js',
  '/pages-bittick-agents.js',
  '/pages-add-collection.js',
  '/pages-collections-list.js',
  '/pages-collections-market.js',
  '/pages-wallet.js',
  '/utils.js',
  '/api.js',
  '/i18n.js'
];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(function(c) { return c.addAll(PRECACHE); }));
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(ks) {
      return Promise.all(ks.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      return self.clients.matchAll();
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({type: 'SW_UPDATE'});
      });
    })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;
  if (e.request.url.includes('chrome-extension')) return;

  if (e.request.url.includes('/version.txt') || e.request.url.endsWith('/') || e.request.url.endsWith('.html')) {
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
