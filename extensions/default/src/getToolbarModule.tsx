import { utils } from '@ohif/ui-next';

import ToolbarLayoutSelectorWithServices from './Toolbar/ToolbarLayoutSelector';

// legacy
import { ProgressDropdownWithService } from './Components/ProgressDropdownWithService';

// new
import HangingProtocolDropdown from './Toolbar/HangingProtocolDropdown';
import MrHangingProtocolDropdown from './Toolbar/MrHangingProtocolDropdown';
import { ToolBoxButtonGroupWrapper, ToolBoxButtonWrapper } from './Toolbar/ToolBoxWrapper';
import ToolButtonListWrapper from './Toolbar/ToolButtonListWrapper';
import { ToolButtonWrapper } from './Toolbar/ToolButtonWrapper';
import ToolRowWrapper from './Toolbar/ToolRowWrapper';

export default function getToolbarModule({ commandsManager, servicesManager }: withAppTypes) {
  const { cineService } = servicesManager.services;

  console.log('getToolbarModule: Module is being loaded');
  console.log('getToolbarModule: MrHangingProtocolDropdown component:', MrHangingProtocolDropdown);

  const mrHangingProtocolComponent = (props: Record<string, unknown>) => {
    console.log('getToolbarModule: ohif.mrHangingProtocolDropdown defaultComponent called', props);
    return MrHangingProtocolDropdown({
      id: (props.id as string) || 'mr-hanging-protocol-dropdown',
      options: (props.options as { icon: string; label: string; stageIndex: number }[]) || [],
      commandsManager,
      servicesManager,
      ...props,
    });
  };

  return [
    // new
    {
      name: 'ohif.hangingProtocolDropdown',
      defaultComponent: props =>
        HangingProtocolDropdown({ ...props, commandsManager, servicesManager }),
    },
    {
      name: 'ohif.mrHangingProtocolDropdown',
      defaultComponent: mrHangingProtocolComponent,
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
