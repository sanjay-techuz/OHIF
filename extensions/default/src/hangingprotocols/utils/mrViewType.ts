/**
 * @author Sanjay Balai
 * @description Hanging-protocol custom attribute `MRViewType`. Returns the breast-
 * MRI faculty view a display set represents (T1/STIR/MIP_SI/MIP_RL/VIBRANT2/
 * VIBRANT5/CORONAL/SAG_R/SAG_L/DWI/ADC), or '' when it is not one of the panes.
 *
 * The classification is tag-based (ImageType / ScanningSequence / InversionTime /
 * DiffusionBValue / TemporalPositionIdentifier / ImageOrientationPatient /
 * ImagePositionPatient) — see `mrViewClassifier.ts`, the single source of truth
 * shared with the dropdown availability check. Selectors match on this attribute
 * (`constraint: { equals: 'T1' }`) so pane matching can never disagree with labels.
 */
import { classifyMRDisplaySet } from './mrViewClassifier';

export default displaySet => classifyMRDisplaySet(displaySet) ?? '';
