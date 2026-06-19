export default {
  measurementsContextMenu: {
    inheritsFrom: 'ohif.contextMenu',
    menus: [
      // Get the items from the UI Customization for the menu name (and have a custom name)
      {
        id: 'forExistingMeasurement',
        selector: ({ nearbyToolData }) => !!nearbyToolData,
        items: [
          {
            label: 'Delete measurement',
            commands: 'removeMeasurement',
          },
          {
            label: 'Add labels',
            commands: 'setMeasurementLabel',
          },
          // "Change Color" — opens the existing `colorPickerDialog` and
          // applies the chosen color to this annotation via cornerstone3D's
          // per-annotation style API. Color rides inside annotation.data.color
          // so it survives re-renders and round-trips through the existing
          // annotation load/save flow (see initMeasurementService.ts:458-463
          // for the load-side application). Same selector as Delete/Add Label
          // — only visible when right-clicking an existing annotation.
          {
            label: 'Change Color',
            commands: 'changeMeasurementColor',
          },
          // Show Question Modal
          {
            label: 'Show Question Modal',
            selector: ({ nearbyToolData }) => {
              // Only show in diagnostic mode
              const viewType =
                (localStorage.getItem('ohif-viewType') as 'diagnostic' | 'screening') ||
                'diagnostic';
              return (
                nearbyToolData?.metadata?.toolName === 'CircleROI' && viewType === 'diagnostic'
              );
            },
            commands: 'showCircleROIQuestionModal',
          },
        ],
      },
    ],
  },
};
