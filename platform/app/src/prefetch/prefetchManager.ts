/**
 * @author Sanjay Balai
 * @description Browser-side DICOM prefetch manager.
 *
 * Mirrors LifeTrack's "Add to prefetch": download a study's pixel data into the
 * browser ahead of time so the viewer opens it with NO pixel network. The
 * service worker (service-worker.js) caches every `/pacs/dicom-web/.../frames/N`
 * response in the `biedx-dicom-prefetch` Cache Storage; here we simply *fetch*
 * those frame URLs (which pass through the SW and get cached), then the viewer
 * serves them from cache on open.
 *
 * Storage is per-origin (this is why the /prefetch page lives on the OHIF
 * origin — the cache it fills is the exact cache the viewer reads).
 */

const PREFETCH_FLAG_PREFIX = 'biedx-prefetched:';
const DICOM_CACHE_NAME = 'biedx-dicom-prefetch';

// Match what cornerstone's WADO-RS loader sends so Orthanc returns the SAME
// bytes the viewer will decode (`transfer-syntax=*` = "whatever is stored").
const FRAME_ACCEPT = 'multipart/related; type="application/octet-stream"; transfer-syntax=*';
const JSON_ACCEPT = 'application/dicom+json';

export interface PrefetchProgress {
  studyInstanceUid: string;
  done: number;
  total: number;
  state: 'enumerating' | 'warming' | 'ready' | 'error';
  error?: string;
}

/**
 * Resolve the DICOMweb (WADO/QIDO) root, e.g. "/pacs/dicom-web". Reads the OHIF
 * app config when available, falls back to the BIEDX default.
 */
function getDicomWebRoot(): string {
  try {
    const cfg = (window as any).config;
    const sources = cfg?.dataSources || [];
    const ds =
      sources.find((s: any) => s?.sourceName === 'dicomweb') ||
      sources.find((s: any) => s?.configuration?.wadoRoot);
    const root = ds?.configuration?.wadoRoot || ds?.configuration?.qidoRoot;
    if (typeof root === 'string' && root.length) {
      return root.replace(/\/$/, '');
    }
  } catch {
    /* fall through */
  }
  return '/pacs/dicom-web';
}

function dicomJsonValue(obj: any, tag: string): string | undefined {
  const v = obj?.[tag]?.Value?.[0];
  return v === undefined || v === null ? undefined : String(v);
}

/** Mark / read / clear the per-study "prefetched" flag (localStorage). */
export function isStudyPrefetched(studyInstanceUid: string): boolean {
  try {
    return !!localStorage.getItem(PREFETCH_FLAG_PREFIX + studyInstanceUid);
  } catch {
    return false;
  }
}
function markStudyPrefetched(studyInstanceUid: string): void {
  try {
    localStorage.setItem(PREFETCH_FLAG_PREFIX + studyInstanceUid, String(Date.now()));
  } catch {
    /* ignore quota errors on the flag itself */
  }
}
function clearAllPrefetchFlags(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFETCH_FLAG_PREFIX)) {
        keys.push(k);
      }
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/**
 * Enumerate every per-frame WADO-RS URL for a study (series → instances →
 * NumberOfFrames). Multi-frame instances (DBT) expand to one URL per frame.
 */
export async function enumerateStudyFrameUrls(studyInstanceUid: string): Promise<string[]> {
  const root = getDicomWebRoot();
  const urls: string[] = [];

  const seriesRes = await fetch(`${root}/studies/${studyInstanceUid}/series`, {
    headers: { Accept: JSON_ACCEPT },
    credentials: 'same-origin',
  });
  if (!seriesRes.ok) {
    throw new Error(`series query failed (${seriesRes.status})`);
  }
  const seriesList: any[] = await seriesRes.json();

  for (const series of seriesList || []) {
    const seriesUid = dicomJsonValue(series, '0020000E');
    if (!seriesUid) {
      continue;
    }
    const instRes = await fetch(
      `${root}/studies/${studyInstanceUid}/series/${seriesUid}/instances`,
      { headers: { Accept: JSON_ACCEPT }, credentials: 'same-origin' }
    );
    if (!instRes.ok) {
      continue;
    }
    const instances: any[] = await instRes.json();
    for (const inst of instances || []) {
      const sopUid = dicomJsonValue(inst, '00080018');
      if (!sopUid) {
        continue;
      }
      const numFrames = parseInt(dicomJsonValue(inst, '00280008') || '1', 10) || 1;
      const base = `${root}/studies/${studyInstanceUid}/series/${seriesUid}/instances/${sopUid}/frames/`;
      for (let f = 1; f <= numFrames; f++) {
        urls.push(base + f);
      }
    }
  }
  return urls;
}

/**
 * Ensure a service worker is active AND controlling this page before we fetch —
 * otherwise the fetches bypass the SW and nothing lands in the prefetch cache
 * (the exact symptom we hit on first load). Returns true when controlling.
 */
export async function ensureServiceWorkerControlling(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  try {
    await navigator.serviceWorker.ready; // an active SW exists
    if (navigator.serviceWorker.controller) {
      return true;
    }
    // clientsClaim() in the SW claims this page shortly after activation; wait
    // briefly for that to happen.
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, 3000);
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
    });
    return !!navigator.serviceWorker.controller;
  } catch {
    return false;
  }
}

/** Fetch one frame URL (through the SW → cached), retrying transient failures.
 *  Returns true only when a 2xx response was fully received (so the SW's
 *  cache.put has the complete body). */
async function fetchFrameWithRetry(url: string, attempts = 3): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: FRAME_ACCEPT }, credentials: 'same-origin' });
      if (res.ok) {
        // Drain the body so the transfer (and the SW's cache.put) completes.
        await res.arrayBuffer();
        return true;
      }
    } catch {
      /* network blip — retry */
    }
    if (i < attempts - 1) {
      await new Promise(r => setTimeout(r, 300 * (i + 1)));
    }
  }
  return false;
}

/** Run async tasks with a fixed concurrency. */
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

/**
 * Prefetch (warm into the browser) every frame of the given studies. Fetching
 * each frame URL routes through the service worker's CacheFirst, populating the
 * `biedx-dicom-prefetch` cache. Reports progress per study.
 */
export async function prefetchStudies(
  studyInstanceUids: string[],
  opts: { onProgress?: (p: PrefetchProgress) => void; concurrency?: number } = {}
): Promise<void> {
  const { onProgress, concurrency = 6 } = opts;
  const uniqueUids = Array.from(new Set(studyInstanceUids.filter(Boolean)));

  // Without a controlling SW the fetches below go straight to the network and
  // never reach the prefetch cache — warn loudly rather than fake "Ready".
  const controlling = await ensureServiceWorkerControlling();
  if (!controlling) {
    console.warn(
      '[BIEDX prefetch] Service worker is not controlling this page; prefetched data will NOT be cached. ' +
        'Check that sw.js loads (200) and is activated in DevTools > Application > Service Workers.'
    );
  }

  for (const studyUid of uniqueUids) {
    try {
      onProgress?.({ studyInstanceUid: studyUid, done: 0, total: 0, state: 'enumerating' });
      const urls = await enumerateStudyFrameUrls(studyUid);
      const total = urls.length;
      let done = 0;
      let failed = 0;
      onProgress?.({ studyInstanceUid: studyUid, done, total, state: 'warming' });

      await runWithConcurrency(urls, concurrency, async url => {
        const ok = await fetchFrameWithRetry(url);
        if (!ok) {
          failed++;
        }
        done++;
        onProgress?.({ studyInstanceUid: studyUid, done, total, state: 'warming' });
      });

      if (failed === 0) {
        // Only mark "Ready" when EVERY frame is cached — otherwise opening the
        // case would still hit the network for the missing frames.
        markStudyPrefetched(studyUid);
        onProgress?.({ studyInstanceUid: studyUid, done, total, state: 'ready' });
      } else {
        onProgress?.({
          studyInstanceUid: studyUid,
          done,
          total,
          state: 'error',
          error: `${failed}/${total} frame(s) failed — open will be partly online`,
        });
      }
    } catch (err: any) {
      onProgress?.({
        studyInstanceUid: studyUid,
        done: 0,
        total: 0,
        state: 'error',
        error: err?.message || 'prefetch failed',
      });
    }
  }
}

/** Drop ALL prefetched DICOM data (manual "Clear cache"). */
export async function clearDicomCache(): Promise<void> {
  clearAllPrefetchFlags();
  // Ask the SW to clear (authoritative), and also delete directly as a fallback
  // in case the SW isn't controlling this client yet.
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_DICOM_CACHE' });
  } catch {
    /* ignore */
  }
  try {
    await caches.delete(DICOM_CACHE_NAME);
  } catch {
    /* ignore */
  }
}

/** Browser storage usage/quota for the storage meter. */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  try {
    const est = await navigator.storage?.estimate?.();
    return { usage: est?.usage || 0, quota: est?.quota || 0 };
  } catch {
    return { usage: 0, quota: 0 };
  }
}
