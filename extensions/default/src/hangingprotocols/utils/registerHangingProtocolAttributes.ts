import viewCode from './viewCode';
import laterality from './laterality';
import viewModifier from './viewModifier';
import tomoType from './tomoType';
import mammoView from './mammoView';

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
}
