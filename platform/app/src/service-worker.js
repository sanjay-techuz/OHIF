/**
 * @author Sanjay Balai
 * @description BIEDX OHIF service worker.
 *
 * In addition to the stock OHIF app-shell caching, this adds a DICOM frame
 * cache so a study's pixel data can be prefetched into the browser (see the
 * /prefetch page) and the viewer can then open it with NO pixel network at all
 * (Cache Storage HIT). Per-instance DICOMweb resources are immutable once the
 * file lands in Orthanc, so CacheFirst is safe; `ignoreVary` makes the viewer's
 * Accept/transfer-syntax variations still hit the cached entry.
 *
 * NOTE: the previous `navigator.serviceWorker.getRegistrations()...` block was
 * removed — that API does not exist in ServiceWorkerGlobalScope and threw on SW
 * startup. (Registration/cleanup belongs in init-service-worker.js, in the page.)
 */

// https://developers.google.com/web/tools/workbox/guides/troubleshoot-and-debug
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.0.0-beta.1/workbox-sw.js');

// Install newest immediately and take control of open clients so the viewer
// (and the /prefetch page) are intercepted without a manual reload.
workbox.core.skipWaiting();
workbox.core.clientsClaim();

// ---------------------------------------------------------------------------
// App shell (unchanged from stock OHIF)
// ---------------------------------------------------------------------------
workbox.routing.registerRoute(
  /\.(?:js|css|json5)$/,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);

workbox.routing.registerRoute(
  /^https:\/\/fonts\.googleapis\.com/,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

workbox.routing.registerRoute(
  /^https:\/\/fonts\.gstatic\.com/,
  new workbox.strategies.CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new workbox.expiration.ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 Year
        maxEntries: 30,
      }),
    ],
  })
);

// ---------------------------------------------------------------------------
// BIEDX: DICOM prefetch cache
// Matches per-instance DICOMweb resources only:
//   /pacs/dicom-web/studies/{S}/series/{Se}/instances/{I}[/frames/N|/metadata]
// (study/series LISTS are intentionally not matched — they must stay fresh.)
// The /prefetch page warms this by fetching frame URLs (those requests pass
// through this SW and get cached here); the viewer later serves them from cache.
// ---------------------------------------------------------------------------
const DICOM_CACHE = 'biedx-dicom-prefetch';

workbox.routing.registerRoute(
  ({ url }) =>
    /^\/pacs\/dicom-web\/studies\/[^/]+\/series\/[^/]+\/instances\/[^/]+/.test(url.pathname),
  new workbox.strategies.CacheFirst({
    cacheName: DICOM_CACHE,
    matchOptions: { ignoreVary: true },
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// ---------------------------------------------------------------------------
// Message API (page <-> SW)
//   CLEAR_DICOM_CACHE  -> drop all prefetched DICOM data (manual "Clear cache")
//   SKIP_WAITING       -> activate a freshly installed SW
// Prefetching itself needs no message: the /prefetch page simply fetches the
// frame URLs, which this SW caches via the route above.
// ---------------------------------------------------------------------------
self.addEventListener('message', event => {
  const data = event.data || {};
  switch (data.type) {
    case 'CLEAR_DICOM_CACHE':
      event.waitUntil(
        caches.delete(DICOM_CACHE).then(ok => {
          if (event.source) {
            event.source.postMessage({ type: 'DICOM_CACHE_CLEARED', ok });
          }
        })
      );
      break;
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    default:
      break;
  }
});

workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);
