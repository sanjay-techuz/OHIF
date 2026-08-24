import viewCode from './viewCode';
import laterality from './laterality';
import viewModifier from './viewModifier';
import tomoType from './tomoType';
import mammoView from './mammoView';
import cemEnergy from './cemEnergy';

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
}
