import { utils } from '@ohif/core';
const { formatDate } = utils;

export default {
  'studyBrowser.studyMenuItems': [],
  'studyBrowser.thumbnailMenuItems': [
    {
      id: 'tagBrowser',
      label: 'Tag Browser',
      iconName: 'DicomTagBrowser',
      onClick: ({ commandsManager, displaySetInstanceUID }: withAppTypes) => {
        commandsManager.runCommand('openDICOMTagViewer', {
          displaySetInstanceUID,
        });
      },
    },
    // "Add as Layer" — HIDDEN for BIEDX. This stock-OHIF action overlays a
    // series as a fusion/volume layer (PET/CT-style workflows) which BIEDX does
    // not use. Adding an incompatible display set (e.g. an OT secondary-capture
    // "AI image" or a plain 2D mammogram stack) builds a vtk.js volume actor
    // with a null mapper and crashes in setMapperShaderParameters
    // (`Cannot read properties of null (reading 'isAttributeUsed')`), blanking
    // the viewport. Uncomment to restore.
    // {
    //   id: 'addAsLayer',
    //   label: 'Add as Layer',
    //   iconName: 'ViewportViews',
    //   onClick: ({ commandsManager, displaySetInstanceUID, servicesManager }: withAppTypes) => {
    //     const { viewportGridService } = servicesManager.services;
    //
    //     // Get the active viewport
    //     const { activeViewportId } = viewportGridService.getState();
    //     if (!activeViewportId) {
    //       return;
    //     }
    //
    //     // Use the new command to add the display set as a layer
    //     commandsManager.runCommand('addDisplaySetAsLayer', {
    //       viewportId: activeViewportId,
    //       displaySetInstanceUID,
    //     });
    //   },
    // },
  ],
  'studyBrowser.sortFunctions': [
    {
      label: 'Series Number',
      sortFunction: (a, b) => {
        return a?.SeriesNumber - b?.SeriesNumber;
      },
    },
    {
      label: 'Series Date',
      sortFunction: (a, b) => {
        const dateA = new Date(formatDate(a?.SeriesDate));
        const dateB = new Date(formatDate(b?.SeriesDate));
        return dateB.getTime() - dateA.getTime();
      },
    },
  ],
  'studyBrowser.viewPresets': [
    {
      id: 'list',
      iconName: 'ListView',
      selected: false,
    },
    {
      id: 'thumbnails',
      iconName: 'ThumbnailView',
      selected: true,
    },
  ],
  'studyBrowser.studyMode': 'all',
  'studyBrowser.thumbnailDoubleClickCallback': {
    callbacks: [
      ({ activeViewportId, servicesManager, commandsManager, isHangingProtocolLayout }) =>
        async displaySetInstanceUID => {
          const { hangingProtocolService, uiNotificationService } = servicesManager.services;
          let updatedViewports = [];
          const viewportId = activeViewportId;

          try {
            updatedViewports = hangingProtocolService.getViewportsRequireUpdate(
              viewportId,
              displaySetInstanceUID,
              isHangingProtocolLayout
            );
          } catch (error) {
            console.warn(error);
            uiNotificationService.show({
              title: 'Thumbnail Double Click',
              message: 'The selected display sets could not be added to the viewport.',
              type: 'error',
              duration: 3000,
            });
          }

          commandsManager.run('setDisplaySetsForViewports', {
            viewportsToUpdate: updatedViewports,
          });
        },
    ],
  },
};
