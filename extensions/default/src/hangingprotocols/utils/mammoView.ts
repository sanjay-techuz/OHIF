import { getViewLabel, getDisplaySetInstance } from '../../utils/getViewLabel';

/**
 * Hanging-protocol custom attribute: the clinical mammography view label
 * (e.g. 'RCC', 'LCC', 'RMLO', 'LMLO') derived by the SAME logic the per-viewport
 * overlay uses — see extensions/default/src/utils/getViewLabel.ts.
 *
 * Why this exists: the standard view selectors (mammoDisplaySetSelector.ts) told
 * CC from MLO only via the `ViewCode` attribute, which reads ViewCodeSequence
 * (SCT codes). Anonymized / teaching cases frequently ship WITHOUT
 * ViewCodeSequence, so `ViewCode` is undefined and the matcher had no reliable
 * CC-vs-MLO signal — it could drop e.g. RMLO into the RCC pane. Those same cases
 * DO carry ViewPosition (0018,5101), which `getMammoViewLabel` uses, which is
 * exactly why the overlay showed the correct view while the panes were shuffled.
 *
 * getViewLabel() dispatches on `instance.Modality`. In the hanging-protocol
 * matcher the instance we get from the display set may not carry Modality at the
 * instance level (it lives on the display set), in which case getViewLabel would
 * bail to its generic SeriesDescription branch and return the SAME case-name
 * string for every series — no view discrimination at all. So we borrow Modality
 * from the display set when the instance lacks it, keeping getViewLabel as the
 * single source of truth for the label itself.
 *
 * Returns the FULL label (incl. any ' Spot'/' DBT' suffix) so an `equals: 'RCC'`
 * rule matches ONLY the standard screening RCC — modified/DBT acquisitions keep
 * their existing (bonus/SOP-class) handling.
 */
export default (displaySet: any): string | undefined => {
  const instance = getDisplaySetInstance(displaySet);
  if (!instance) {
    return undefined;
  }
  const source =
    instance.Modality || !displaySet?.Modality
      ? instance
      : { ...instance, Modality: displaySet.Modality };
  const label = getViewLabel(source);
  return label || undefined;
};
