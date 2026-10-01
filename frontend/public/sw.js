// Only public application assets are cached. API responses, sessions and uploads bypass this worker.
const CACHE = 'ceoai-public-v1';
const ASSETS = ['/brand/compass.svg', '/manifest.webmanifest'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ceoai-public-') && key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => { const url = new URL(event.request.url); if (event.request.method !== 'GET' || url.origin !== self.location.origin || !ASSETS.includes(url.pathname)) return; event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))); });
