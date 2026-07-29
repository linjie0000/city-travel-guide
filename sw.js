// Service Worker for 城市文旅查询助手
const CACHE_NAME = 'city-travel-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// Install: cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', event => {
    // Skip non-GET and chrome-extension requests
    if (event.request.method !== 'GET') return;
    if (event.request.url.startsWith('chrome-extension://')) return;

    // For API calls (weather, overpass, etc): network only, no cache
    const url = new URL(event.request.url);
    const isApi = url.hostname.includes('open-meteo') ||
                  url.hostname.includes('overpass') ||
                  url.hostname.includes('nominatim') ||
                  url.hostname.includes('allorigins') ||
                  url.hostname.includes('corsproxy') ||
                  url.hostname.includes('codetabs') ||
                  url.hostname.includes('wikipedia') ||
                  url.hostname.includes('bing') ||
                  url.hostname.includes('duckduckgo');

    if (isApi) {
        event.respondWith(
            fetch(event.request).catch(() => new Response('', { status: 503 }))
        );
        return;
    }

    // For static assets: network first, fallback to cache
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache a copy of successful responses
                if (response.ok) {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, cloned);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then(cached => {
                    return cached || new Response('离线不可用', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
                });
            })
    );
});
