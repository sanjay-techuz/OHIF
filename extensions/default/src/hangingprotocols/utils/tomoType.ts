/**
 * @author Sanjay Balai
 * @description Hanging-protocol custom attribute that classifies a Digital
 * Breast Tomosynthesis (DBT) display set by its ImageType (0008,0008).
 *
 * A single DBT acquisition produces several display sets that ALL share the
 * Breast Tomosynthesis SOP Class (1.2.840.10008.5.1.4.1.1.13.1.3), so SOP class
 * alone cannot tell them apart. ImageType is the discriminator:
 *
 *   ORIGINAL\PRIMARY\TOMOSYNTHESIS\NONE        -> the real reconstructed volume
 *                                                 (multi-frame, scrollable) = 'RECON'
 *   DERIVED\PRIMARY\TOMOSYNTHESIS\MAXIMUM      -> MIP / slab                 = 'MIP'
 *   DERIVED\PRIMARY\TOMOSYNTHESIS\GENERATED_2D -> synthetic "C-View" 2D      = 'SYNTHETIC_2D'
 *   (anything without TOMOSYNTHESIS)           -> 2D FFDM / not tomo         = 'NONE'
 *
 * Without this, the RECON volume and the GENERATED_2D synthetic 2D tie on every
 * scored attribute, so the synthetic flat image can win the DBT viewport and the
 * user sees a "duplicate 2D" instead of the tomosynthesis. The DBT display-set
 * selectors give a strong bonus to 'RECON' (and a small one to 'MIP') keyed on
 * this attribute so the real volume always wins its pane.
 *
 * @returns 'RECON' | 'MIP' | 'SYNTHETIC_2D' | 'NONE'
 */
export default displaySet => {
  const image = displaySet?.images?.[0];
  // ImageType can arrive as an array (['ORIGINAL','PRIMARY','TOMOSYNTHESIS','NONE'])
  // or a backslash-joined string. Normalise to an upper-cased string for matching.
  const rawImageType = image?.ImageType ?? displaySet?.ImageType;
  const imageType = (Array.isArray(rawImageType) ? rawImageType.join('\\') : rawImageType || '').toString().toUpperCase();

  if (!imageType.includes('TOMOSYNTHESIS')) {
    return 'NONE';
  }
  if (imageType.includes('GENERATED_2D')) {
    return 'SYNTHETIC_2D';
  }
  if (imageType.includes('MAXIMUM')) {
    return 'MIP';
  }
  // TOMOSYNTHESIS present, not synthetic 2D, not a MIP slab -> the reconstructed
  // volume (ImageType ...\NONE, ORIGINAL). This is the canonical DBT view.
  return 'RECON';
};
