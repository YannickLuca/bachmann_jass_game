const CACHE_NAME = 'bachmann-jass-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './game-engine.js',
  './manifest.webmanifest',
  './app-icon.svg',
];
const SUITS = ['eicheln', 'rosen', 'schellen', 'schilten'];
const RANKS = ['6', '7', '8', '9', '10', 'under', 'ober', 'koenig', 'ass'];
const CARD_ASSETS = SUITS.flatMap((suit) =>
  RANKS.map((rank) => `./assets/jasskarten_deck_png_sharper/${suit}_${rank}.png`)
);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([...CORE_ASSETS, ...CARD_ASSETS]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
