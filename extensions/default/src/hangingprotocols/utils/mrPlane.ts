/**
 * @author Sanjay Balai
 * @description Hanging-protocol custom attribute that classifies an MR display
 * set's acquisition plane (AXIAL | SAGITTAL | CORONAL | OBLIQUE) from
 * ImageOrientationPatient (0020,0037).
 *
 * The plane is derived from the SLICE NORMAL — the cross product of the row and
 * column direction cosines — and then by which patient axis (X/Y/Z) that normal
 * is closest to:
 *   normal ~ Z  -> AXIAL
 *   normal ~ X  -> SAGITTAL
 *   normal ~ Y  -> CORONAL
 *
 * Why this exists: the Breast-MRI selectors used to disambiguate Sagittal /
 * Coronal with `constraint: { range: { value: [0,1,0,0,0,-1], tolerance } }`.
 * OHIF's `range` validator only accepts a 2-element [min,max] scalar range, so a
 * 6-element orientation vector fails validation EVERY time — those rules never
 * contributed any score, leaving plane matching to fragile "SAG"/"COR"
 * SeriesDescription substrings. This attribute reads the geometry directly, so a
 * viewport can require an exact plane and never grab a wrong-plane series.
 *
 * @returns 'AXIAL' | 'SAGITTAL' | 'CORONAL' | 'OBLIQUE' | 'UNKNOWN'
 */
export default displaySet => {
  const image = displaySet?.images?.[0];
  const raw = image?.ImageOrientationPatient ?? displaySet?.ImageOrientationPatient;

  // ImageOrientationPatient can arrive as a 6-number array or a backslash-joined
  // string ("1\\0\\0\\0\\1\\0"). Normalise to an array of numbers.
  const iop = (Array.isArray(raw) ? raw : (raw ?? '').toString().split('\\')).map(Number);

  let plane = 'UNKNOWN';
  if (iop.length >= 6 && !iop.some(n => Number.isNaN(n))) {
    const row = iop.slice(0, 3);
    const col = iop.slice(3, 6);

    // Slice normal = row × col
    const normal = [
      row[1] * col[2] - row[2] * col[1],
      row[2] * col[0] - row[0] * col[2],
      row[0] * col[1] - row[1] * col[0],
    ];
    const abs = normal.map(Math.abs);
    const max = Math.max(abs[0], abs[1], abs[2]);

    // If no axis clearly dominates, it's an oblique acquisition (don't force it
    // into an orthogonal plane). ~0.75 ≈ within ~40° of a principal axis.
    if (max < 0.75) {
      plane = 'OBLIQUE';
    } else if (max === abs[2]) {
      plane = 'AXIAL';
    } else if (max === abs[0]) {
      plane = 'SAGITTAL';
    } else if (max === abs[1]) {
      plane = 'CORONAL';
    }
  }

  return plane;
};
