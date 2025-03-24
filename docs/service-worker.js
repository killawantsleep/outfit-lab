const CACHE_NAME = 'outfitlab-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&family=Playfair+Display:wght@700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Кэширование основных ресурсов');
        return cache.addAll(ASSETS);
      })
      .catch(err => {
        console.error('[SW] Ошибка кэширования:', err);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Не кэшируем запросы к Google Script
  if (event.request.url.includes('google.com/macros')) {
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        return cachedResponse || fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Удаление старого кэша:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});