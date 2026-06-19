/**
 * @author Sanjay Balai
 * @description Hanging-protocol custom attribute that reports whether a display
 * set is a STANDARD screening view or a MODIFIED (special) view.
 *
 * A plain screening CC/MLO acquisition carries an empty — or absent —
 * ViewModifierCodeSequence (0054,0222) nested inside ViewCodeSequence
 * (0054,0220). Special diagnostic acquisitions populate it with one or more
 * modifier codes, e.g. SRT `R-102D6` = Magnification, `R-102D7` = Spot
 * Compression (a GE "RMSMLO" spot-mag view, for instance).
 *
 * The mammo / CEM / DBT display-set selectors give standard views a small
 * scoring bonus keyed on this attribute, so that when a case contains BOTH a
 * standard and a spot/mag acquisition of the same (laterality, view) the
 * standard one wins the viewport and the modified one never auto-loads in its
 * place. It stays available as a draggable thumbnail.
 *
 * Vendor-neutral: relies only on the DICOM-standard sequence, not the
 * GE-private ClinicalView (0045,101b) tag.
 *
 * @returns 'NONE' for a standard view, 'MODIFIED' when any view modifier exists.
 */
export default displaySet => {
  const image = displaySet?.images?.[0];
  const viewCode = Array.isArray(image?.ViewCodeSequence)
    ? image.ViewCodeSequence[0]
    : image?.ViewCodeSequence;
  const modifiers = viewCode?.ViewModifierCodeSequence;
  const hasModifier = Array.isArray(modifiers) ? modifiers.length > 0 : !!modifiers;
  return hasModifier ? 'MODIFIED' : 'NONE';
};
