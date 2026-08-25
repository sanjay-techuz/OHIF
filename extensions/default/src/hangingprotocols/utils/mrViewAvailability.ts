/**
 * @author Sanjay Balai
 *
 * Which breast-MRI view types a study actually contains — used by the hanging-
 * protocol dropdown to DISABLE a stage when NONE of its views are present
 * (e.g. no MIP at all → the "1×2 MIP" stage is greyed out).
 *
 * This reuses the SAME tag-based classifier as the HP matcher
 * (`mrViewClassifier.ts` → also the `MRViewType` custom attribute), so the greyed
 * stages always agree with what the matcher can actually fill.
 */
import { classifyMRDisplaySet, type MRViewKey } from './mrViewClassifier';

export type { MRViewKey };

/** Union of the view keys present across all MR display sets in the study. */
export function getAvailableMRViews(displaySets: Array<Record<string, unknown>>): Set<MRViewKey> {
  const all = new Set<MRViewKey>();
  (displaySets || []).forEach(ds => {
    const key = classifyMRDisplaySet(ds);
    if (key) {
      all.add(key);
    }
  });
  return all;
}

/** A stage is available when at least ONE of its view keys is present. */
export function isStageAvailable(stageViewKeys: MRViewKey[], available: Set<MRViewKey>): boolean {
  return stageViewKeys.some(k => available.has(k));
}
