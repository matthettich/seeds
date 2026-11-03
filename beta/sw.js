// ...Seeds offline support. The app page is fetched fresh when online (so updates show up)
// and served from the cache when offline.
//
// The live app (/seeds/) and the beta copy (/seeds/beta/) each have their own copy of this file and their own cache.
// The live worker's scope covers /seeds/beta/ too, so it leaves that folder alone, and each worker only ever deletes
// its own old caches (tools/make-channel.sh renames CACHE for the beta copy).
const CACHE = 'seedsbeta-v2';
const OWN = k => k.startsWith('seedsbeta-v') && k !== CACHE;             // this copy's older caches (seeds-v1 was the first)
const CHANNELS = ['beta/', 'stable/'];                                 // sub-folders that run their own copy of the app
const SCOPE = new URL('./', self.location).pathname;
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(OWN).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.startsWith(SCOPE) && CHANNELS.some(c => url.pathname.slice(SCOPE.length).startsWith(c))) return; // another copy's files
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/index.html');
  if (isPage){
    e.respondWith(fetch(req).then(res => {
      if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); } // never keep an error page as the offline copy
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // Everything else (icons, fonts, libraries): cache first, then the network.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok && (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|cdnjs|jsdelivr/.test(url.host))){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
