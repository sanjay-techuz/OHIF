import viewCode from './viewCode';
import laterality from './laterality';
import viewModifier from './viewModifier';
import tomoType from './tomoType';

export default function registerHangingProtocolAttributes({ servicesManager }) {
  const { hangingProtocolService } = servicesManager.services;
  hangingProtocolService.addCustomAttribute('ViewCode', 'View Code Designator:Value', viewCode);
  hangingProtocolService.addCustomAttribute('Laterality', 'Laterality of object', laterality);
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
