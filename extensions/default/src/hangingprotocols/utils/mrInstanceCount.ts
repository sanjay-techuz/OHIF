/**
 * @author Sanjay Balai
 * @description Hanging-protocol custom attribute `MRInstanceCount`. Returns how
 * many images a display set contains.
 *
 * Used to break ties between DUPLICATE series of the same view: when a case has
 * two T1s / STIRs / dynamics (a scan repeated after patient motion, vomiting or a
 * failed breath-hold), the one with MORE instances is the complete/accurate
 * acquisition and should load. OHIF's built-in tie-break is the lowest
 * SeriesNumber, which would pick the wrong (earlier, aborted) run — so the MR
 * selectors add graduated weighted rules on this attribute to bias the score
 * toward higher instance counts. The bonus only reorders series that already match
 * the same view (a wrong view is zeroed by its failed `required` rule), so it can
 * never pull an unrelated series into a pane.
 */
export default displaySet => {
  const ds = displaySet || {};
  const count =
    Number(ds.numImageFrames) ||
    (Array.isArray(ds.images) ? ds.images.length : 0) ||
    (Array.isArray(ds.instances) ? ds.instances.length : 0) ||
    0;
  return count;
};
