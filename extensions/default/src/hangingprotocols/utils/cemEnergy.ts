/**
 * @author Sanjay Balai
 * @description Hanging-protocol custom attribute that classifies a CEM
 * (Contrast-Enhanced Mammography) display set by its energy: Low-Energy (LE,
 * the conventional 2D-equivalent image) vs Recombined (the iodine/contrast
 * subtraction image).
 *
 * WHY THIS EXISTS (the CEM LE/RE "same image in both panes" bug):
 * The CEM selectors originally discriminated LE vs Recombined with RAW
 * `attribute: 'ImageType'` rules. But at hanging-protocol match time the matcher
 * reads a raw attribute as `displaySet.ImageType ?? displaySet.instances[0].ImageType`,
 * and `makeDisplaySet` (getSopClassHandlerModule) does NOT copy ImageType onto the
 * display set. So those raw reads returned undefined and the LE/Recombined rules
 * scored ZERO — the LE and Recombined selectors for a view then TIED and the sort
 * order decided, so both the LE and the Recombined viewport showed the SAME image
 * (seen as e.g. "LCC CEM" filling the LE pane, and RMLO-LE filling the recombined
 * pane). View/laterality still looked right because those ride on the `MammoView`
 * CUSTOM attribute, which reads `images[0]` — the reliable path.
 *
 * This attribute uses that SAME reliable `images[0]` path (identical to TomoType /
 * ViewCode / Laterality), so energy discrimination works regardless of whether the
 * display set exposes a top-level ImageType.
 *
 * Vendor-agnostic, matching cemDisplaySetSelector's CEM_CONTRAST_IMAGETYPE:
 *   LE           -> ImageType contains 'LOW_ENERGY'
 *   Recombined   -> ImageType contains RECOMBINED (Hologic) / SUBTRACTION (GE "DES")
 *                   / IODINE / CESM
 *   HIGH_ENERGY (the raw high-kVp acquisition, not normally displayed) and anything
 *   else -> undefined, so those never win an LE or a Recombined pane.
 *
 * LE is checked FIRST because a GE low-energy image tags ImageType
 * 'DERIVED\PRIMARY\POST_CONTRAST\\LOW_ENERGY' — the 'POST_CONTRAST' component must
 * NOT make it read as a contrast image (mirrors the recombined rule's
 * doesNotContain 'LOW_ENERGY' guard).
 *
 * @returns 'LE' | 'RECOMBINED' | undefined
 */
export default (displaySet: any): 'LE' | 'RECOMBINED' | undefined => {
  const image = displaySet?.images?.[0];
  const raw = image?.ImageType ?? displaySet?.ImageType;
  const imageType = (Array.isArray(raw) ? raw.join('\\') : raw || '').toString().toUpperCase();
  if (!imageType) {
    return undefined;
  }
  // LE first: GE low-energy carries POST_CONTRAST in ImageType, so a bare
  // "contains contrast" test would misread it as recombined.
  if (imageType.includes('LOW_ENERGY')) {
    return 'LE';
  }
  if (/RECOMBINED|SUBTRACTION|SUBTRACTED|IODINE|CESM/.test(imageType)) {
    return 'RECOMBINED';
  }
  return undefined;
};
