/* Офлайн-кэш: сначала сеть (чтобы обновления приходили сразу), если сети нет — из кэша.
 * CACHE — имя версии кэша. При релизе меняй его вместе с ?v= в index.html:
 * старые кэши удаляются в activate, поэтому в кэше не копятся устаревшие файлы. */
const CACHE = 'mathgame-v227';

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          e.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
        }
        return res;
      })
      /* офлайн: отдаём ровно тот файл, что просили (с тем же ?v=), иначе смешаются версии модулей */
      .catch(() => caches.match(req)),
  );
});
