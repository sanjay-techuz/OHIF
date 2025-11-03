import * as cornerstone from '@cornerstonejs/core';
import {
  Enums as cs3DEnums,
  imageLoadPoolManager,
  imageRetrievalPoolManager,
} from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import { Enums as cs3DToolsEnums } from '@cornerstonejs/tools';
import { Types } from '@ohif/core';
import React from 'react';
import Enums from './enums';

import getCommandsModule from './commandsModule';
import getCustomizationModule from './getCustomizationModule';
import getHangingProtocolModule from './getHangingProtocolModule';
import getToolbarModule from './getToolbarModule';
import init from './init';
import ColorbarService from './services/ColorbarService';
import CornerstoneCacheService from './services/CornerstoneCacheService';
import SegmentationService from './services/SegmentationService';
import SyncGroupService from './services/SyncGroupService';
import ToolGroupService from './services/ToolGroupService';
import CornerstoneViewportService from './services/ViewportService/CornerstoneViewportService';
import * as CornerstoneExtensionTypes from './types';

import { toolNames } from './initCornerstoneTools';
import { reset as enabledElementReset, getEnabledElement, setEnabledElement } from './state';
import dicomLoaderService from './utils/dicomLoaderService';
import getActiveViewportEnabledElement from './utils/getActiveViewportEnabledElement';

import { getDynamicVolumeInfo } from '@cornerstonejs/core/utilities';
import { useToggleOneUpViewportGridStore } from '@ohif/extension-default';
import { StudySummaryFromMetadata } from './components/StudySummaryFromMetadata';
import getPanelModule from './getPanelModule';
import { getSopClassHandlerModule } from './getSopClassHandlerModule';
import { useActiveViewportSegmentationRepresentations } from './hooks/useActiveViewportSegmentationRepresentations';
import { useMeasurements } from './hooks/useMeasurements';
import { useMeasurementTracking } from './hooks/useMeasurementTracking';
import { useSegmentations } from './hooks/useSegmentations';
import { id } from './id';
import PanelMeasurement from './panels/PanelMeasurement';
import PanelSegmentation from './panels/PanelSegmentation';
import type { PublicViewportOptions } from './services/ViewportService/Viewport';
import {
  useLutPresentationStore,
  usePositionPresentationStore,
  useSegmentationPresentationStore,
  useSynchronizersStore,
} from './stores';
import { createFrameViewSynchronizer } from './synchronizers/frameViewSynchronizer';
import ImageOverlayViewerTool from './tools/ImageOverlayViewerTool';
import utils from './utils';
import CornerstoneViewportDownloadForm from './utils/CornerstoneViewportDownloadForm';
import { findNearbyToolData } from './utils/findNearbyToolData';
import { measurementMappingUtils } from './utils/measurementServiceMappings';
import PlanarFreehandROI from './utils/measurementServiceMappings/PlanarFreehandROI';
import RectangleROI from './utils/measurementServiceMappings/RectangleROI';
import getSOPInstanceAttributes from './utils/measurementServiceMappings/utils/getSOPInstanceAttributes';
import { setUpSegmentationEventHandlers } from './utils/setUpSegmentationEventHandlers';
export * from './components';

const { imageRetrieveMetadataProvider } = cornerstone.utilities;

const Component = React.lazy(() => {
  return import(/* webpackPrefetch: true */ './Viewport/OHIFCornerstoneViewport');
});

const OHIFCornerstoneViewport = props => {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Component {...props} />
    </React.Suspense>
  );
};

const stackRetrieveOptions = {
  retrieveOptions: {
    single: {
      streaming: true,
      decodeLevel: 1,
    },
  },
};

const unsubscriptions = [];
/**
 *
 */
const cornerstoneExtension: Types.Extensions.Extension = {
  /**
   * Only required property. Should be a unique value across all extensions.
   */
  id,

  onModeEnter: ({ servicesManager, commandsManager }: withAppTypes): void => {
    const { cornerstoneViewportService, toolbarService, segmentationService } =
      servicesManager.services;

    const { unsubscriptions: segmentationUnsubscriptions } = setUpSegmentationEventHandlers({
      servicesManager,
      commandsManager,
    });
    unsubscriptions.push(...segmentationUnsubscriptions);

    toolbarService.registerEventForToolbarUpdate(cornerstoneViewportService, [
      cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
    ]);

    toolbarService.registerEventForToolbarUpdate(segmentationService, [
      segmentationService.EVENTS.SEGMENTATION_REMOVED,
      segmentationService.EVENTS.SEGMENTATION_MODIFIED,
    ]);

    toolbarService.registerEventForToolbarUpdate(cornerstone.eventTarget, [
      cornerstoneTools.Enums.Events.TOOL_ACTIVATED,
    ]);

    // Configure the interleaved/HTJ2K loader
    imageRetrieveMetadataProvider.clear();
    // The default volume interleaved options are to interleave the
    // image retrieve, but don't perform progressive loading per image
    // This interleaves images and replicates them for low-resolution depth volume
    // reconstruction, which progressively improves
    imageRetrieveMetadataProvider.add(
      'volume',
      cornerstone.ProgressiveRetrieveImages.interleavedRetrieveStages
    );
    // The default stack loading option is to progressive load HTJ2K images
    // There are other possible options, but these need more thought about
    // how to define them.
    imageRetrieveMetadataProvider.add('stack', stackRetrieveOptions);
  },
  getPanelModule,
  onModeExit: ({ servicesManager }: withAppTypes): void => {
    unsubscriptions.forEach(unsubscribe => unsubscribe());
    // Clear the unsubscriptions
    unsubscriptions.length = 0;

    const { cineService, segmentationService } = servicesManager.services;
    // Empty out the image load and retrieval pools to prevent memory leaks
    // on the mode exits
    Object.values(cs3DEnums.RequestType).forEach(type => {
      imageLoadPoolManager.clearRequestStack(type);
      imageRetrievalPoolManager.clearRequestStack(type);
    });

    cineService.setIsCineEnabled(false);

    enabledElementReset();

    useLutPresentationStore.getState().clearLutPresentationStore();
    usePositionPresentationStore.getState().clearPositionPresentationStore();
    useSynchronizersStore.getState().clearSynchronizersStore();
    useToggleOneUpViewportGridStore.getState().clearToggleOneUpViewportGridStore();
    useSegmentationPresentationStore.getState().clearSegmentationPresentationStore();
    segmentationService.removeAllSegmentations();
  },

  /**
   * Register the Cornerstone 3D services and set them up for use.
   *
   * @param configuration.csToolsConfig - Passed directly to `initCornerstoneTools`
   */
  preRegistration: async function (props: Types.Extensions.ExtensionParams): Promise<void> {
    const { servicesManager } = props;
    servicesManager.registerService(CornerstoneViewportService.REGISTRATION);
    servicesManager.registerService(ToolGroupService.REGISTRATION);
    servicesManager.registerService(SyncGroupService.REGISTRATION);
    servicesManager.registerService(SegmentationService.REGISTRATION);
    servicesManager.registerService(CornerstoneCacheService.REGISTRATION);
    servicesManager.registerService(ColorbarService.REGISTRATION);

    const { syncGroupService } = servicesManager.services;
    syncGroupService.registerCustomSynchronizer('frameview', createFrameViewSynchronizer);

    await init.call(this, props);
  },
  getToolbarModule,
  getHangingProtocolModule,
  getViewportModule({ servicesManager, commandsManager }) {
    const ExtendedOHIFCornerstoneViewport = props => {
      const { toolbarService } = servicesManager.services;

      return (
        <OHIFCornerstoneViewport
          {...props}
          toolbarService={toolbarService}
          servicesManager={servicesManager}
          commandsManager={commandsManager}
        />
      );
    };

    return [
      {
        name: 'cornerstone',
        component: ExtendedOHIFCornerstoneViewport,
        isReferenceViewable: props => utils.isReferenceViewable({ ...props, servicesManager }),
      },
    ];
  },
  getCommandsModule,
  getCustomizationModule,
  getUtilityModule({ servicesManager }) {
    return [
      {
        name: 'common',
        exports: {
          getCornerstoneLibraries: () => {
            return { cornerstone, cornerstoneTools };
          },
          getEnabledElement,
          dicomLoaderService,
        },
      },
      {
        name: 'core',
        exports: {
          Enums: cs3DEnums,
        },
      },
      {
        name: 'tools',
        exports: {
          toolNames,
          Enums: cs3DToolsEnums,
        },
      },
      {
        name: 'volumeLoader',
        exports: {
          getDynamicVolumeInfo,
        },
      },
    ];
  },
  getSopClassHandlerModule,
};

export {
  CornerstoneViewportDownloadForm,
  dicomLoaderService,
  Enums,
  findNearbyToolData,
  getActiveViewportEnabledElement,
  getEnabledElement,
  getSOPInstanceAttributes,
  ImageOverlayViewerTool,
  measurementMappingUtils,
  OHIFCornerstoneViewport,
  PanelMeasurement,
  PanelSegmentation,
  PlanarFreehandROI,
  RectangleROI,
  setEnabledElement,
  StudySummaryFromMetadata,
  toolNames,
  CornerstoneExtensionTypes as Types,
  useActiveViewportSegmentationRepresentations,
  // Export all stores
  useLutPresentationStore,
  useMeasurements,
  useMeasurementTracking,
  usePositionPresentationStore,
  useSegmentationPresentationStore,
  useSegmentations,
  useSynchronizersStore,
  utils,
};
export type { PublicViewportOptions };

// Export constants
export { DYNAMIC_VOLUME_LOADER_SCHEME, VOLUME_LOADER_SCHEME } from './constants';
export default cornerstoneExtension;
