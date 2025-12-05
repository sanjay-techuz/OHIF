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
            label: 'Add Label',
            commands: 'setMeasurementLabel',
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
