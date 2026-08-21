/**
 * @author Sanjay Balai
 * @description Registers the BIEDX/OHIF service worker (sw.js).
 *
 * IMPORTANT: the previous implementation gated the whole registration behind
 *   `if ('function' === typeof importScripts) { ... }`
 * but `importScripts` only exists inside WORKER scopes — in this page/module
 * context it is always `undefined`, so the service worker was NEVER registered
 * and nothing was ever cached (no DICOM prefetch, no app-shell cache). This
 * uses the standard `navigator.serviceWorker.register()` API instead.
 *
 * The SW (sw.js) does `skipWaiting()` + `clientsClaim()`, so once it activates
 * it takes control of this already-open page without a reload — the /prefetch
 * page's fetches and the viewer's frame requests are then intercepted and
 * served from the `biedx-dicom-prefetch` Cache Storage.
 */
(function registerBiedxServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Skip on local dev: the dev server's HMR and the SW caching dev chunks
  // fight each other. UAT/prod (any non-localhost host) register normally.
  var host = (typeof location !== 'undefined' && location.hostname) || '';
  // var isLocalDev = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  // if (isLocalDev) {
  //   return;
  // }

  var swUrl = ((typeof window !== 'undefined' && window.PUBLIC_URL) || '/') + 'sw.js';

  // Ask the browser to make Cache Storage PERSISTENT (not "best-effort").
  //
  // Without this the prefetched `biedx-dicom-prefetch` cache is evictable: under
  // disk/quota pressure the browser can silently drop a SUBSET of the cached
  // frames, so a fully-prefetched study still refetches "some instances" from the
  // server on the next (normal) reload — exactly the symptom seen on UAT. A
  // persistent bucket is only cleared by the user explicitly, so the study stays
  // fully cached across reopens. Safe/no-op where unsupported or already granted;
  // it never blocks registration.
  function requestPersistentStorage() {
    try {
      if (navigator.storage && typeof navigator.storage.persist === 'function') {
        navigator.storage.persisted().then(function (already) {
          if (already) {
            // eslint-disable-next-line no-console
            console.log('[BIEDX] Storage already persistent');
            return;
          }
          navigator.storage.persist().then(function (granted) {
            // eslint-disable-next-line no-console
            console.log('[BIEDX] Persistent storage', granted ? 'granted' : 'denied');
          });
        });
      }
    } catch (e) {
      /* best-effort — never break registration */
    }
  }

  function doRegister() {
    requestPersistentStorage();
    navigator.serviceWorker
      .register(swUrl)
      .then(function (registration) {
        // eslint-disable-next-line no-console
        console.log('[BIEDX] Service worker registered, scope:', registration.scope);
      })
      .catch(function (err) {
        // eslint-disable-next-line no-console
        console.error('[BIEDX] Service worker registration failed:', err);
      });
  }

  // Module scripts are deferred, so `load` may or may not have fired yet.
  if (typeof document !== 'undefined' && document.readyState === 'complete') {
    doRegister();
  } else {
    window.addEventListener('load', doRegister);
  }
})();
