import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Precache and route all static assets
precacheAndRoute(self.__WB_MANIFEST);

// Clean up outdated caches
cleanupOutdatedCaches();

// Take control of all clients as soon as the service worker is activated
self.skipWaiting();
clientsClaim();

// Handle install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

// Handle activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches that don't match current version
          if (cacheName.startsWith('workbox-') && !cacheName.includes('workbox-precache')) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Basic fetch handler for network-first strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If we got a valid response, clone and cache it
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open('runtime-cache-v1').then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not in cache and it's a navigation request, serve the main page
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('オフラインです', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});