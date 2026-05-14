import { EVENTS, eventTarget } from '@cornerstonejs/core';
import { Enums } from '@cornerstonejs/tools';
import { CommandsManager, CustomizationService } from '@ohif/core';
import { findNearbyToolData } from './utils/findNearbyToolData';

const cs3DToolsEvents = Enums.Events;

/**
 * Generates a double click event name, consisting of:
 *    * alt when the alt key is down
 *    * ctrl when the cctrl key is down
 *    * shift when the shift key is down
 *    * 'doubleClick'
 */
function getDoubleClickEventName(evt: CustomEvent) {
  const nameArr = [];
  if (evt.detail.event.altKey) {
    nameArr.push('alt');
  }
  if (evt.detail.event.ctrlKey) {
    nameArr.push('ctrl');
  }
  if (evt.detail.event.shiftKey) {
    nameArr.push('shift');
  }
  nameArr.push('doubleClick');
  return nameArr.join('');
}

export type initDoubleClickArgs = {
  customizationService: CustomizationService;
  commandsManager: CommandsManager;
};

function initDoubleClick({ customizationService, commandsManager }: initDoubleClickArgs): void {
  const cornerstoneViewportHandleDoubleClick = (evt: CustomEvent) => {
    const nearbyToolData = findNearbyToolData(commandsManager, evt);
    if (nearbyToolData) {
      // BIEDX: a double-click on an existing CircleROI re-opens the same
      // question modal that auto-opens right after drawing. Mirrors the
      // right-click "Show Question Modal" menu item in
      // `defaultContextMenuCustomization.ts` (diagnostic mode only — the
      // recall flow doesn't have a right-click reopener today, so we keep
      // double-click symmetric with that).
      try {
        const toolName = nearbyToolData?.metadata?.toolName;
        if (toolName === 'CircleROI') {
          const viewType =
            (localStorage.getItem('ohif-viewType') as 'diagnostic' | 'screening') || 'diagnostic';
          if (viewType === 'diagnostic') {
            const uid = nearbyToolData?.annotationUID;
            if (uid) {
              commandsManager.runCommand('showCircleROIQuestionModal', { uid }, 'CORNERSTONE');
            }
          }
        }
      } catch {
        /* fall through — never let a UI hook break the viewport */
      }
      // Either way, do not run the viewport-level double-click commands
      // (1-up zoom etc.) when the cursor was on an annotation.
      return;
    }

    const eventName = getDoubleClickEventName(evt);

    // Allows for the customization of the double click on a viewport.
    const customizations = customizationService.getCustomization(
      'cornerstoneViewportClickCommands'
    );

    const toRun = customizations[eventName];

    if (!toRun) {
      return;
    }

    commandsManager.run(toRun);
  };

  function elementEnabledHandler(evt: CustomEvent) {
    const { element } = evt.detail;

    element.addEventListener(
      cs3DToolsEvents.MOUSE_DOUBLE_CLICK,
      cornerstoneViewportHandleDoubleClick
    );
  }

  function elementDisabledHandler(evt: CustomEvent) {
    const { element } = evt.detail;

    element.removeEventListener(
      cs3DToolsEvents.MOUSE_DOUBLE_CLICK,
      cornerstoneViewportHandleDoubleClick
    );
  }

  eventTarget.addEventListener(EVENTS.ELEMENT_ENABLED, elementEnabledHandler.bind(null));

  eventTarget.addEventListener(EVENTS.ELEMENT_DISABLED, elementDisabledHandler.bind(null));
}

export default initDoubleClick;
