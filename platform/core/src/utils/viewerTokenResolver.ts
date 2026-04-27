/**
 * Viewer-token resolver.
 *
 * The OHIF viewer used to receive its credentials in a single encrypted `data`
 * URL param. That blob was hitting the nginx 414 (Request-URI Too Large) limit
 * on UAT once the embedded JWT grew long enough.
 *
 * The producer side (admin/student) now POSTs the same JSON to
 * /common/viewer-token and embeds only the returned short id (`?t=vt_xxx`).
 * This module fetches that id back into a process-local cache so the existing
 * synchronous `getCustomParams()` consumers keep working unchanged.
 */

let cachedTokenPayload: Record<string, unknown> | null = null;
let inflightResolve: Promise<boolean> | null = null;

export function getTokenPayloadCache(): Record<string, unknown> | null {
  return cachedTokenPayload;
}

export function setTokenPayloadCache(payload: Record<string, unknown> | null): void {
  cachedTokenPayload = payload;
}

function getApiBaseUrl(): string {
  // OHIF webpack DefinePlugin replaces this expression with the build-time
  // literal — must be plain member access (no optional chaining) for the
  // replacement to match.
  return process.env.REACT_APP_API_BASE_URL || '';
}

export function getViewerTokenFromSearch(search: string): string | null {
  try {
    const params = new URLSearchParams(search);
    const t = params.get('t');
    return t && t.startsWith('vt_') ? t : null;
  } catch {
    return null;
  }
}

/**
 * Redeem `?t=...` against the backend and stash the payload.
 * Resolves to true on success, false otherwise (caller falls back to legacy `data=` path).
 * Concurrent callers share the same in-flight promise.
 */
export async function resolveViewerTokenIfPresent(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }
  if (cachedTokenPayload) {
    return true;
  }
  if (inflightResolve) {
    return inflightResolve;
  }

  const token = getViewerTokenFromSearch(window.location.search);
  if (!token) {
    return false;
  }

  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const url = `${baseUrl}/common/viewer-token/${encodeURIComponent(token)}`;

  inflightResolve = (async () => {
    try {
      // No custom headers — keeps this as a "simple" CORS request (no preflight).
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        return false;
      }
      const body = await res.json();
      const payload = body?.data?.payload || body?.payload;
      if (!payload || typeof payload !== 'object') {
        return false;
      }
      cachedTokenPayload = payload as Record<string, unknown>;
      return true;
    } catch {
      return false;
    } finally {
      inflightResolve = null;
    }
  })();

  return inflightResolve;
}
