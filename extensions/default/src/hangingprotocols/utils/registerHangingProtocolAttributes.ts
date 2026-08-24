import viewCode from './viewCode';
import laterality from './laterality';
import viewModifier from './viewModifier';
import tomoType from './tomoType';
import mammoView from './mammoView';
import cemEnergy from './cemEnergy';
import mrPlane from './mrPlane';
import mrViewType from './mrViewType';
import mrInstanceCount from './mrInstanceCount';

export default function registerHangingProtocolAttributes({ servicesManager }) {
  const { hangingProtocolService } = servicesManager.services;
  hangingProtocolService.addCustomAttribute('ViewCode', 'View Code Designator:Value', viewCode);
  hangingProtocolService.addCustomAttribute('Laterality', 'Laterality of object', laterality);
  // Reliable clinical view (RCC/LCC/RMLO/LMLO) from ViewPosition + laterality —
  // the same source as the overlay, so pane matching can't diverge from labels.
  hangingProtocolService.addCustomAttribute(
    'MammoView',
    'Clinical mammography view (RCC/LCC/RMLO/LMLO)',
    mammoView
  );
  hangingProtocolService.addCustomAttribute(
    'ViewModifier',
    'Standard vs modified (spot/mag) view',
    viewModifier
  );
  hangingProtocolService.addCustomAttribute(
    'TomoType',
    'DBT volume vs synthetic-2D vs MIP (from ImageType)',
    tomoType
  );
  // CEM energy (LE vs Recombined) from ImageType, read via images[0] — a raw
  // `ImageType` rule does NOT resolve on a display set at match time, which is
  // why the CEM LE/Recombined panes used to collapse to the same image.
  hangingProtocolService.addCustomAttribute(
    'CemEnergy',
    'CEM Low-Energy vs Recombined (from ImageType)',
    cemEnergy
   );
  // Reliable MR acquisition plane (AXIAL/SAGITTAL/CORONAL) from
  // ImageOrientationPatient — lets the Breast-MRI selectors require an exact
  // plane instead of guessing from "SAG"/"COR" description substrings.
  hangingProtocolService.addCustomAttribute(
    'MRPlane',
    'MR acquisition plane (AXIAL/SAGITTAL/CORONAL) from ImageOrientationPatient',
    mrPlane
  );
  // Breast-MRI faculty view (T1/STIR/MIP_SI/…) classified from DICOM acquisition
  // tags — the single source of truth shared with the dropdown availability check.
  hangingProtocolService.addCustomAttribute(
    'MRViewType',
    'Breast-MRI view (T1/STIR/MIP/VIBRANT/COR/SAG/DWI/ADC) from acquisition tags',
    mrViewType
  );
  // Instance count — breaks ties between duplicate same-view series toward the
  // most-complete acquisition (repeat scans after motion/breath-hold).
  hangingProtocolService.addCustomAttribute(
    'MRInstanceCount',
    'Number of images in the display set (duplicate-series tie-break)',
    mrInstanceCount
  );
}
