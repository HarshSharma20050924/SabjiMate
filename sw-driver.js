const CACHE_NAME = 'sabzimate-driver-cache-v2';
const urlsToCache = [
  '/driver.html',
  '/logo.svg',
];
const API_URLS_TO_CACHE = [
    '/api/driver/deliveries/today',
    '/api/vegetables',
    '/api/driver/wishlist/today',
    '/api/driver/wishlist/by-user',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // For API calls, use Network Falling Back to Cache strategy
  if (API_URLS_TO_CACHE.some(path => url.pathname.startsWith(path))) {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // If we get a valid response, cache it and return it
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If fetch fails (e.g., offline), try to get it from the cache
          console.log(`Fetch failed for ${request.url}; attempting to serve from cache.`);
          return caches.match(request);
        })
    );
  } else if (urlsToCache.includes(url.pathname) || url.pathname === '/') {
    // For static assets in our cache list, use Cache First strategy
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        return cachedResponse || fetch(request).then(networkResponse => {
           if (networkResponse && networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone);
              });
           }
          return networkResponse;
        });
      })
    );
  } else {
    // For all other requests, just fetch from the network
    return;
  }
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
    ))
  );
});
