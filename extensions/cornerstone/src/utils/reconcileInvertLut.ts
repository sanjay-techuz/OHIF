import { utilities as csUtils } from '@cornerstonejs/core';

/**
 * Make a stack viewport's actual color LUT match its `invert` FLAG.
 *
 * Cornerstone's `setInvertColor` (see `StackViewport.setInvertColorGPU`) flips
 * the RGB transfer function ONLY when the flag value *changes*. Any operation
 * that rebuilds the LUT while the flag stays the same leaves the LUT and the
 * flag DESYNCED:
 *   - `setStack` on a REUSED viewport (hanging-protocol change, layout swap):
 *     `_setImageData` rebuilds the LUT non-inverted and calls
 *     `setInvertColor(this.invert || this.initialInvert)`; if the flag was
 *     already `true` (MONOCHROME1, e.g. mammography) nothing flips.
 *   - `resetProperties()`: rebuilds the LUT non-inverted, flag stays `true`.
 * The result is a MONOCHROME1 image that renders WHITE while
 * `getProperties().invert` still reports `true` — which is why *setting*
 * `invert: true` never fixes it (it is already `true`, so no flip happens).
 *
 * This reads the LUT's REAL polarity (sample the transfer function at its low vs
 * high input) and flips it to match the flag when they disagree. It does NOT
 * change the flag, so it fixes the desync without altering the intended invert
 * value: a default MONOCHROME1 stays black, and a manual user invert is
 * preserved. No-op when the LUT and flag already agree, and for any
 * viewport/LUT that doesn't expose the expected actor API.
 */
export default function reconcileInvertLut(viewport: any): void {
  try {
    const defaultActor = viewport?.getDefaultActor?.();
    const tfunc = defaultActor?.actor?.getProperty?.()?.getRGBTransferFunction?.(0);
    if (!tfunc || typeof tfunc.getColor !== 'function') {
      return;
    }
    const [lo, hi] = tfunc.getRange?.() ?? [0, 1];
    const cLow = [0, 0, 0];
    const cHigh = [0, 0, 0];
    tfunc.getColor(lo, cLow);
    tfunc.getColor(hi, cHigh);
    // An inverted ramp maps the low input brighter than the high input.
    const lutInverted = cLow[0] > cHigh[0];
    if (lutInverted !== !!viewport.invert) {
      csUtils.invertRgbTransferFunction(tfunc);
      viewport.render?.();
    }
  } catch {
    /* actor / LUT API mismatch — leave the viewport untouched */
  }
}
