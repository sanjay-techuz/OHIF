/**
 * @author Sanjay Balai
 * @description BIEDX OHIF service worker — DICOM prefetch cache ONLY.
 *
 * Unlike stock OHIF, this deliberately does NOT cache the app shell (JS/CSS/
 * WASM/fonts). We only cache per-instance DICOMweb resources so a study can be
 * prefetched into the browser (see the /prefetch page) and the viewer opens it
 * with NO pixel network. This matches LifeTrack's behaviour (only instances are
 * stored locally; everything else loads normally).
 *
 * Cache match tolerance is important: cornerstone retrieves frames in several
 * ways (plain XHR, streaming `fetch`, and sometimes with appended query
 * arguments) — so we match with `ignoreSearch` + `ignoreVary`, otherwise a
 * prefetched frame can MISS just because the viewer added `?...` or a different
 * Accept. Per-instance DICOMweb bytes are immutable, so this is safe.
 */

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.0.0-beta.1/workbox-sw.js');

// Activate the newest SW immediately and take control of open clients so the
// /prefetch page and the viewer are intercepted without a manual reload.
workbox.core.skipWaiting();
workbox.core.clientsClaim();

// ---------------------------------------------------------------------------
// DICOM prefetch cache (the ONLY thing we cache)
// Matches per-instance DICOMweb resources:
//   /pacs/dicom-web/studies/{S}/series/{Se}/instances/{I}[/frames/N|/metadata]
// (study/series LISTS are intentionally not matched — they must stay fresh.)
// ---------------------------------------------------------------------------
const DICOM_CACHE = 'biedx-dicom-prefetch';

workbox.routing.registerRoute(
  ({ url }) =>
    /^\/pacs\/dicom-web\/studies\/[^/]+\/series\/[^/]+\/instances\/[^/]+/.test(url.pathname),
  new workbox.strategies.CacheFirst({
    cacheName: DICOM_CACHE,
    // ignoreSearch: a prefetched frame (plain URL) must still HIT when the
    //   viewer requests it with appended `?...` retrieve arguments.
    // ignoreVary:  ignore Accept/transfer-syntax differences between the
    //   prefetch fetch and cornerstone's request.
    matchOptions: { ignoreSearch: true, ignoreVary: true },
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

// Webpack's InjectManifest requires a reference to `self.__WB_MANIFEST`. We
// deliberately DO NOT precache the app shell (we only want DICOM frames cached),
// so the manifest is referenced but intentionally unused.
// eslint-disable-next-line no-unused-expressions
self.__WB_MANIFEST;
