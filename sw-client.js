const CACHE_NAME = 'sabzimate-client-cache-v2'; // Cache version incremented
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.svg',
  '/client-manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache and caching static assets.');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests and non-http/https requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // API calls: Stale-While-Revalidate strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          const fetchPromise = fetch(request).then(networkResponse => {
            // If the network response is successful, update the cache.
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(err => {
            console.warn(`API fetch failed for ${request.url}.`, err);
          });
          // Return the cached response immediately if available, otherwise wait for the network.
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Static assets and other navigation: Cache First, falling back to Network
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      // Return from cache if found
      if (cachedResponse) {
        return cachedResponse;
      }
      // Otherwise, fetch from network, cache it, and then return the response.
      return fetch(request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        if (!cacheWhitelist.includes(cacheName)) {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        }
      })
    )).then(() => self.clients.claim()) // Take control of all open clients immediately
  );
});