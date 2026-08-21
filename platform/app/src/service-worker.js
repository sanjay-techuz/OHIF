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
// Prefetched instances auto-expire 2 days after they were cached (per-entry age).
const CACHE_MAX_AGE_SECONDS = 2 * 24 * 60 * 60; // 2 days
// Keep at most this many DISTINCT studies in the cache (count cap, independent
// of the age cap above). Enforced HERE in the SW — not just in the curriculum's
// prefetch bridge — because every cache write (prefetch AND opening a case in
// the viewer) flows through this route, so the cap holds no matter how a study
// got cached.
const MAX_STUDIES = 10;

// ---------------------------------------------------------------------------
// Study-count cap
// ---------------------------------------------------------------------------
function studyUidFromUrl(pathname) {
  const m = /\/studies\/([^/?#]+)/.exec(pathname || '');
  return m ? m[1] : null;
}

// studyUid -> last-write time (ms). In-memory; rebuilt lazily from the cache
// after a SW restart (present-but-unknown studies are stamped 'now' on sight).
const studyLastWrite = new Map();
let capRunning = false; // simple guard so concurrent writes don't double-evict

async function enforceStudyCap() {
  if (capRunning) {
    return;
  }
  capRunning = true;
  try {
    const cache = await caches.open(DICOM_CACHE);
    const reqs = await cache.keys();
    const present = new Set();
    for (const r of reqs) {
      const u = studyUidFromUrl(new URL(r.url).pathname);
      if (u) {
        present.add(u);
      }
    }
    // Stamp any present-but-unknown study; forget ones no longer cached.
    present.forEach(u => {
      if (!studyLastWrite.has(u)) {
        studyLastWrite.set(u, Date.now());
      }
    });
    for (const u of Array.from(studyLastWrite.keys())) {
      if (!present.has(u)) {
        studyLastWrite.delete(u);
      }
    }
    if (present.size <= MAX_STUDIES) {
      return;
    }
    // Evict the oldest-written studies (all their frames) until within the cap.
    const oldestFirst = Array.from(present).sort(
      (a, b) => (studyLastWrite.get(a) || 0) - (studyLastWrite.get(b) || 0)
    );
    const toEvict = present.size - MAX_STUDIES;
    for (let i = 0; i < toEvict; i++) {
      const uid = oldestFirst[i];
      for (const r of reqs) {
        if (studyUidFromUrl(new URL(r.url).pathname) === uid) {
          await cache.delete(r);
        }
      }
      studyLastWrite.delete(uid);
    }
  } catch (e) {
    /* best-effort — never break caching */
  } finally {
    capRunning = false;
  }
}

// Workbox plugin: after each frame is cached, refresh its study's timestamp;
// when a NEW study first appears, enforce the count cap. The full scan only runs
// on a new study (not on every frame), so it's cheap.
const studyCapPlugin = {
  cacheDidUpdate: async ({ request }) => {
    let uid = null;
    try {
      uid = studyUidFromUrl(new URL(request.url).pathname);
    } catch (e) {
      /* ignore */
    }
    if (!uid) {
      return;
    }
    const isNewStudy = !studyLastWrite.has(uid);
    studyLastWrite.set(uid, Date.now());
    if (isNewStudy) {
      await enforceStudyCap();
    }
  },
};

// Shared plugins — one instance set, used by BOTH routes below so a single
// ExpirationPlugin manages the cache (Workbox tracks by cacheName) and both the
// count-cap and age-cap apply uniformly to frames AND metadata/series entries.
const cacheableResponsePlugin = new workbox.cacheableResponse.CacheableResponsePlugin({
  statuses: [0, 200],
});
// Remove a cached entry 2 days after it was written.
//
// purgeOnQuotaError is deliberately DISABLED: with it enabled a single write
// that trips the storage quota wipes the ENTIRE prefetch cache, so a fully-cached
// study would suddenly refetch on the next reload. Growth is already bounded by
// the 2-day age cap and the MAX_STUDIES count cap, and requesting persistent
// storage (see init-service-worker.js) makes quota errors unlikely — so a stray
// quota error should fail just that one write, not destroy every cached study.
const expirationPlugin = new workbox.expiration.ExpirationPlugin({
  maxAgeSeconds: CACHE_MAX_AGE_SECONDS,
  purgeOnQuotaError: false,
});
const dicomPlugins = [cacheableResponsePlugin, expirationPlugin, studyCapPlugin];

// Route 1 — per-instance bytes (frames + per-instance metadata + bulkdata).
// Matches `/studies/{S}/series/{Se}/instances/{I}/...`. Registered FIRST so it
// claims every instance-level request; ignoreSearch is needed because the viewer
// appends `?...` retrieve arguments a prefetched (plain-URL) frame lacks.
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
    plugins: dicomPlugins,
  })
);

// Route 2 — study/series metadata + series/instance LISTS (QIDO). These are the
// slow `/series/{Se}/metadata` call and friends. Immutable after upload (same as
// the pixel data), so we serve them from cache too and skip the network wait.
// Matches ONLY study-scoped list/metadata endpoints:
//   /studies/{S}/metadata
//   /studies/{S}/series            (series list)
//   /studies/{S}/series/{Se}/metadata
//   /studies/{S}/series/{Se}/instances   (instance list)
// The top-level worklist SEARCH `/studies?...` is NOT matched (needs a UID after
// `/studies/`), so the study list stays live and new uploads still appear.
// Instance-level requests are already claimed by Route 1 above (first match wins).
//
// ignoreSearch is FALSE here (unlike frames): a QIDO query string is meaningful,
// so responses are keyed by exact URL+query and different queries never collide.
// NOTE ON STALENESS: if a study is modified AFTER it was cached (re-upload,
// transcode, merge-on-upload, change-PatientID, add/remove series), this serves
// the old lists until the 2-day age cap / study-cap evicts them or the user hits
// "Clear cache". Metadata shares this cache with the frames, so both evict in
// lockstep and never drift into a frames-new/metadata-old mismatch.
workbox.routing.registerRoute(
  ({ url }) =>
    /^\/pacs\/dicom-web\/studies\/[^/?#]+\/(metadata|series)(\/|\?|$)/.test(url.pathname + url.search),
  new workbox.strategies.CacheFirst({
    cacheName: DICOM_CACHE,
    matchOptions: { ignoreSearch: false, ignoreVary: true },
    plugins: dicomPlugins,
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

// Webpack's InjectManifest requires the injection point (the __WB_MANIFEST
// global, on the line below) to appear EXACTLY ONCE in this file — comments
// included, because in dev builds comments are NOT stripped before injection.
// We deliberately DO NOT precache the app shell (only DICOM frames), so it is
// referenced here but intentionally unused.
// eslint-disable-next-line no-unused-expressions
self.__WB_MANIFEST;
