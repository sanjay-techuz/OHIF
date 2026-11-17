import { utils, getCustomParams } from '@ohif/core';
const { formatDate } = utils;

export default {
  'studyBrowser.studyMenuItems': [],
  'studyBrowser.thumbnailMenuItems': [
    // Permanently delete a series — only for admin / master-faculty (never students or
    // preview). `isVisible` is read by MoreDropdownMenu, which hides the whole ⋯ menu when
    // no item is visible, so students see nothing. The delete itself runs in the command.
    {
      id: 'deleteSeries',
      label: 'Delete series',
      iconName: 'Delete',
      isVisible: () => {
        const p = getCustomParams();
        if (!p || p.userType !== 'faculty' || p.isPreview) {
          return false;
        }
        // Faculty-dashboard launch (answerAuth === 'user'): only the master faculty who OWNS the
        // case may delete, so require the server-computed canDeleteSeries flag (set at token mint).
        // Admin launch (no answerAuth) may always delete; the backend re-checks either way.
        return p.answerAuth !== 'user' || p.canDeleteSeries === true;
      },
      onClick: ({ commandsManager, displaySetInstanceUID }: withAppTypes) => {
        commandsManager.runCommand('deleteCaseSeries', { displaySetInstanceUID });
      },
    },
    // Tag Browser thumbnail menu item hidden for BIEDX (commented, not removed).
    // {
    //   id: 'tagBrowser',
    //   label: 'Tag Browser',
    //   iconName: 'DicomTagBrowser',
    //   onClick: ({ commandsManager, displaySetInstanceUID }: withAppTypes) => {
    //     commandsManager.runCommand('openDICOMTagViewer', {
    //       displaySetInstanceUID,
    //     });
    //   },
    // },
    // Add as Layer thumbnail menu item hidden for BIEDX (commented, not removed).
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
