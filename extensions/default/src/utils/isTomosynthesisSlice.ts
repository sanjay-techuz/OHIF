/**
 * @author Sanjay Balai
 * @description Detects a reconstructed Digital Breast Tomosynthesis (DBT) slice
 * that a vendor has exported as **Secondary Capture** instead of the proper
 * Breast Tomosynthesis SOP Class (1.2.840.10008.5.1.4.1.1.13.1.3).
 *
 * Some sources (e.g. LifeTrack teaching exports) ship the tomo reconstruction as
 * a stack of single-frame Secondary-Capture RGB images — one instance per slice,
 * 80+ per view, all sharing one SeriesInstanceUID — with ImageType
 * `DERIVED\PRIMARY\VOLUME\NONE` and NO ImageLaterality / ViewPosition. Because
 * their SOP Class is Secondary Capture (…1.1.7), the AI-overlay guards
 * (getViewLabel's "AI Image" rule, getSopClassHandlerModule's
 * isUserAttachmentInstance) mistake them for a Lunit-style overlay: the stack is
 * shattered into one 1-image display set per slice, mislabelled "AI Image", and
 * excluded from every hanging protocol — so the tomo can't be scrolled and the
 * DBT protocol never fills.
 *
 * This narrow test carves the real tomo volume out of that path. It stays keyed
 * on the ImageType VOLUME / TOMOSYNTHESIS token (which genuine AI overlays never
 * carry) so a real AI overlay still labels as "AI Image". Single 2D projection
 * images (ImageType `DERIVED\PRIMARY`, no VOLUME token) are intentionally NOT
 * matched — only the reconstructed volume slices are.
 */
const SECONDARY_CAPTURE_SOP_CLASS = '1.2.840.10008.5.1.4.1.1.7';

export function isTomosynthesisSlice(instance: any): boolean {
  if (!instance || instance.SOPClassUID !== SECONDARY_CAPTURE_SOP_CLASS) {
    return false;
  }
  const raw = instance.ImageType;
  const imageType = (
    Array.isArray(raw) ? raw.join('\\') : String(raw || '')
  ).toUpperCase();
  return /\bVOLUME\b/.test(imageType) || imageType.includes('TOMOSYNTHESIS');
}

export default isTomosynthesisSlice;
