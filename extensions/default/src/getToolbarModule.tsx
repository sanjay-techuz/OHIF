import { utils } from '@ohif/ui-next';

import ToolbarLayoutSelectorWithServices from './Toolbar/ToolbarLayoutSelector';

// legacy
import { ProgressDropdownWithService } from './Components/ProgressDropdownWithService';

// new
import HangingProtocolDropdown from './Toolbar/HangingProtocolDropdown';
import ImageSliceSyncButton from './Toolbar/ImageSliceSyncButton';
import ReferenceLinesButton from './Toolbar/ReferenceLinesButton';
import CrossReferencePointButton from './Toolbar/CrossReferencePointButton'; // [CROSS-REF-POINT]
import { ToolBoxButtonGroupWrapper, ToolBoxButtonWrapper } from './Toolbar/ToolBoxWrapper';
import ToolButtonListWrapper from './Toolbar/ToolButtonListWrapper';
import { ToolButtonWrapper } from './Toolbar/ToolButtonWrapper';
import ToolRowWrapper from './Toolbar/ToolRowWrapper';

export default function getToolbarModule({ commandsManager, servicesManager }: withAppTypes) {
  const { cineService } = servicesManager.services;
  return [
    // new
    {
      name: 'ohif.hangingProtocolDropdown',
      defaultComponent: props =>
        HangingProtocolDropdown({ ...props, commandsManager, servicesManager }),
    },
    {
      // MRI-only Image Slice Sync toggle (renders null on non-MR studies).
      name: 'ohif.imageSliceSyncButton',
      defaultComponent: props =>
        ImageSliceSyncButton({ ...props, commandsManager, servicesManager }),
    },
    {
      // MRI-only Reference Lines toggle (renders null on non-MR studies).
      name: 'ohif.referenceLinesButton',
      defaultComponent: props =>
        ReferenceLinesButton({ ...props, commandsManager, servicesManager }),
    },
    {
      // [CROSS-REF-POINT] MRI-only Cross Reference Point toggle (null on non-MR).
      name: 'ohif.crossReferencePointButton',
      defaultComponent: props =>
        CrossReferencePointButton({ ...props, commandsManager, servicesManager }),
    },
    {
      name: 'ohif.toolButton',
      defaultComponent: ToolButtonWrapper,
    },
    {
      name: 'ohif.toolButtonList',
      defaultComponent: ToolButtonListWrapper,
    },
    {
      name: 'ohif.row',
      defaultComponent: ToolRowWrapper,
    },
    {
      name: 'ohif.toolBoxButtonGroup',
      defaultComponent: ToolBoxButtonGroupWrapper,
    },
    {
      name: 'ohif.toolBoxButton',
      defaultComponent: ToolBoxButtonWrapper,
    },
    // others
    {
      name: 'ohif.layoutSelector',
      defaultComponent: props =>
        ToolbarLayoutSelectorWithServices({ ...props, commandsManager, servicesManager }),
    },
    {
      name: 'ohif.progressDropdown',
      defaultComponent: ProgressDropdownWithService,
    },
    {
      name: 'evaluate.cine',
      evaluate: () => {
        const isToggled = cineService.getState().isCineEnabled;
        return {
          className: utils.getToggledClassName(isToggled),
        };
      },
    },
  ];
}
