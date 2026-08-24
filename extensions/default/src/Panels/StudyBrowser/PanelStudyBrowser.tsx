import { useCustomParams } from '@ohif/app/src/hooks/useCustomParams';
import { useSystem, utils } from '@ohif/core';
import {
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Separator,
  StudyBrowser,
  useImageViewer,
  useViewportGrid,
} from '@ohif/ui-next';
import { CallbackCustomization } from 'platform/core/src/types';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MoreDropdownMenu from '../../Components/MoreDropdownMenu';
import { defaultActionIcons } from './constants';
import { PanelStudyBrowserHeader } from './PanelStudyBrowserHeader';
import { useUIStateStore } from '../../stores/useUIStateStore';
// Same `getViewLabel` source the viewport overlay uses (one source of truth).
import { getViewLabel, getDisplaySetInstance } from '../../utils/getViewLabel';
// Note: NOT imported via '@ohif/extension-default' here because we ARE
// extension-default; importing your own package name creates a circular ref.

const { sortStudyInstances, formatDate, createStudyBrowserTabs } = utils;

const thumbnailNoImageModalities = ['SR', 'SEG', 'RTSTRUCT', 'RTPLAN', 'RTDOSE', 'DOC', 'PMAP'];

// Utility functions for dynamic annotation loading
const extractStudyIdFromAnnotation = annotation => {
  const imageId = annotation.metadata.referencedImageId;
  // Extract study ID from: wadors:.../studies/{studyId}/series/...
  const studyIdMatch = imageId.match(/studies\/([^\/]+)/);
  return studyIdMatch ? studyIdMatch[1] : null;
};

const isAnnotationForCurrentStudy = (annotation, currentStudyInstanceUID) => {
  const annotationStudyId = extractStudyIdFromAnnotation(annotation);
  return annotationStudyId === currentStudyInstanceUID;
};

// const getAnnotationsForCurrentStudy = (annotationObjs, currentStudyInstanceUID) => {
//   return annotationObjs.filter(annotation =>
//     isAnnotationForCurrentStudy(annotation, currentStudyInstanceUID)
//   );
// };

// const loadDefaultAnnotations = annotations => {
//   annotations.forEach(annotationOBJ => {
//     cs3DTools.annotation.state.addAnnotation(
//       annotationOBJ,
//       viewportOptions.toolGroupId || 'default'
//     );
//     cs3DTools.annotation.config.style.setAnnotationStyles(annotationOBJ.annotationUID, {
//       color: annotationOBJ.color,
//       textBoxColor: annotationOBJ.color,
//       lineWidth: '2',
//       lineDash: '0',
//     });
//   });
// };

// const unloadDefaultAnnotations = annotations => {
//   annotations.forEach(annotationOBJ => {
//     cs3DTools.annotation.state.removeAnnotation(annotationOBJ.annotationUID);
//   });
// };

/**
 * Study Browser component that displays and manages studies and their display sets
 */
function PanelStudyBrowser({
  getImageSrc,
  getStudiesForPatientByMRN,
  requestDisplaySetCreationForStudy,
  dataSource,
  customMapDisplaySets,
  onClickUntrack,
  onDoubleClickThumbnailHandlerCallBack,
}) {
  const { servicesManager, commandsManager, extensionManager } = useSystem();
  const { displaySetService, customizationService } = servicesManager.services;
  const navigate = useNavigate();
  const studyMode = customizationService.getCustomization('studyBrowser.studyMode') || 'all';

  const internalImageViewer = useImageViewer();
  const StudyInstanceUIDs = internalImageViewer.StudyInstanceUIDs;
  const fetchedStudiesRef = useRef(new Set());

  const [{ activeViewportId, viewports, isHangingProtocolLayout }] = useViewportGrid();
  const [activeTabName, setActiveTabName] = useState(studyMode);
  const [expandedStudyInstanceUIDs, setExpandedStudyInstanceUIDs] = useState([
    ...StudyInstanceUIDs,
  ]);
  const [hasLoadedViewports, setHasLoadedViewports] = useState(false);
  const [studyDisplayList, setStudyDisplayList] = useState([]);
  const [displaySets, setDisplaySets] = useState([]);
  const [displaySetsLoadingState, setDisplaySetsLoadingState] = useState({});
  const [thumbnailImageSrcMap, setThumbnailImageSrcMap] = useState({});
  const [jumpToDisplaySet, setJumpToDisplaySet] = useState(null);

  // --- Manual prior comparison ---------------------------------------------
  // The user explicitly picks ONE other study of this patient to hang as the
  // prior. The opened study is always the current (studyInstanceUIDsIndex 0) and
  // the picked one the prior (index 1) — no StudyDate logic, no auto-loading.
  const [comparePriorUID, setComparePriorUID] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  // Remember the last prior the user compared against, so the "Compare"
  // checkbox can re-enable comparison (re-check) without forcing them to pick
  // the study again from the dropdown. Survives an uncheck (which only clears
  // the ACTIVE comparison, not the remembered choice).
  const lastPriorUIDRef = useRef<string | null>(null);

  const [viewPresets, setViewPresets] = useState(
    customizationService.getCustomization('studyBrowser.viewPresets')
  );

  const [actionIcons, setActionIcons] = useState(defaultActionIcons);
  const { viewType } = useCustomParams();

  // Sample annotation objects - in real implementation, fetch from API
  // const annotationObjs = [
  //   {
  //     highlighted: false,
  //     invalidated: false,
  //     metadata: {
  //       toolName: 'CircleROI',
  //       viewPlaneNormal: [0, 0, -1],
  //       viewUp: [0, -1, 0],
  //       referencedImageId:
  //         'wadors:https://d14fa38qiwhyfd.cloudfront.net/dicomweb/studies/1.2.276.0.7230010.3.1.2.2155604110.4180.1021041295.21/series/1.2.392.200036.9125.0.198811291108.7/instances/1.2.392.200036.9125.0.19950720093509/frames/1',
  //       cameraFocalPoint: [835, 1005, 0],
  //       sliceIndex: 0,
  //     },
  //     color: 'red',
  //     data: {
  //       label: 'Faculty ROI',
  //       handles: {
  //         textBox: {
  //           hasMoved: false,
  //           worldPosition: [591.1585112476708, 1001.5165537295396, -2.2737367544323206e-13],
  //           worldBoundingBox: {
  //             topLeft: [678.2447344506974, 1088.602776932566, -2.2737367544323206e-13],
  //             topRight: [1137.1455982496882, 1088.602776932566, -2.2737367544323206e-13],
  //             bottomLeft: [678.2447344506974, 1547.721356289564, -2.2737367544323206e-13],
  //             bottomRight: [1137.1455982496882, 1547.721356289564, -2.2737367544323206e-13],
  //           },
  //         },
  //         points: [
  //           [413.50261591349687, 1001.5165537295396, -2.2737367544323206e-13],
  //           [570.2578176789445, 1085.119328004445, -2.2737367544323206e-13],
  //         ],
  //         activeHandleIndex: null,
  //       },
  //       cachedStats: {
  //         'imageId:wadors:https://d14fa38qiwhyfd.cloudfront.net/dicomweb/studies/1.2.276.0.7230010.3.1.2.2155604110.4180.1021041295.21/series/1.2.392.200036.9125.0.198811291108.7/instances/1.2.392.200036.9125.0.19950720093509/frames/1':
  //           {
  //             Modality: 'CR',
  //             area: 99153.74870976096,
  //             mean: 719.6903246628812,
  //             max: 860,
  //             min: 596,
  //             pointsInShape: [],
  //             stdDev: 42.33269138992349,
  //             statsArray: [
  //               {
  //                 name: 'min',
  //                 label: 'Min Pixel',
  //                 value: 596,
  //                 pointIJK: [481, 1066, 0],
  //                 pointLPS: [481, 1066, 0],
  //               },
  //               {
  //                 name: 'max',
  //                 label: 'Max Pixel',
  //                 value: 860,
  //                 pointIJK: [391, 911, 0],
  //                 pointLPS: [391, 911, 0],
  //               },
  //               {
  //                 name: 'mean',
  //                 label: 'Mean Pixel',
  //                 value: 719.6903246628812,
  //               },
  //               {
  //                 name: 'stdDev',
  //                 label: 'Standard Deviation',
  //                 value: 42.33269138992349,
  //               },
  //               {
  //                 name: 'median',
  //                 label: 'Median',
  //                 value: 716,
  //               },
  //               {
  //                 name: 'skewness',
  //                 label: 'Skewness',
  //                 value: 0.33727104235224775,
  //                 unit: null,
  //               },
  //               {
  //                 name: 'kurtosis',
  //                 label: 'Kurtosis',
  //                 value: -0.1771196171321816,
  //                 unit: null,
  //               },
  //               {
  //                 name: 'count',
  //                 label: 'Voxel Count',
  //                 value: 99149,
  //                 unit: null,
  //               },
  //               {
  //                 name: 'maxLPS',
  //                 label: 'Max LPS',
  //                 value: [391, 911, 0],
  //                 unit: null,
  //               },
  //               {
  //                 name: 'minLPS',
  //                 label: 'Min LPS',
  //                 value: [481, 1066, 0],
  //                 unit: null,
  //               },
  //               {
  //                 name: 'center',
  //                 label: 'Center',
  //                 value: [413.5050277864628, 1001.529808671797, 0],
  //                 unit: null,
  //               },
  //             ],
  //             isEmptyArea: false,
  //             areaUnit: 'px²',
  //             radius: 177.65591430664062,
  //             radiusUnit: 'px',
  //             perimeter: 1116.24503050504,
  //             modalityUnit: '',
  //           },
  //       },
  //     },
  //     annotationUID: '2fdb2955-bf66-46b3-a93d-4bb5190c3344',
  //     isLocked: false,
  //     isVisible: true,
  //     isSelected: true,
  //   },
  //   {
  //     highlighted: false,
  //     invalidated: false,
  //     metadata: {
  //       toolName: 'CircleROI',
  //       viewPlaneNormal: [0, 0, -1],
  //       viewUp: [0, -1, 0],
  //       referencedImageId:
  //         'wadors:https://d14fa38qiwhyfd.cloudfront.net/dicomweb/studies/1.2.276.0.7230010.3.1.2.2155604110.4180.1021041295.21/series/1.2.392.200036.9125.0.198811291108.7/instances/1.2.392.200036.9125.0.19950720093509/frames/1',
  //       cameraFocalPoint: [835, 1005, 0],
  //       sliceIndex: 0,
  //     },
  //     color: 'blue',
  //     data: {
  //       label: 'Student ROI',
  //       handles: {
  //         textBox: {
  //           hasMoved: false,
  //           worldPosition: [566.8201956724902, 963.1986155202079, -2.2737367544323206e-13],
  //           worldBoundingBox: {
  //             topLeft: [653.9064188755167, 1050.2848387232345, -2.2737367544323206e-13],
  //             topRight: [1112.8072826745072, 1050.2848387232345, -2.2737367544323206e-13],
  //             bottomLeft: [653.9064188755167, 1509.4034180802325, -2.2737367544323206e-13],
  //             bottomRight: [1112.8072826745072, 1509.4034180802325, -2.2737367544323206e-13],
  //           },
  //         },
  //         points: [
  //           [434.40330948222316, 963.1986155202079, -2.2737367544323206e-13],
  //           [552.8405730383392, 1022.4172472982659, -2.2737367544323206e-13],
  //         ],
  //         activeHandleIndex: null,
  //       },
  //       cachedStats: {
  //         'imageId:wadors:https://d14fa38qiwhyfd.cloudfront.net/dicomweb/studies/1.2.276.0.7230010.3.1.2.2155604110.4180.1021041295.21/series/1.2.392.200036.9125.0.198811291108.7/instances/1.2.392.200036.9125.0.19950720093509/frames/1':
  //           {
  //             Modality: 'CR',
  //             area: 55085.40662173781,
  //             mean: 726.7745261782005,
  //             max: 860,
  //             min: 596,
  //             pointsInShape: [],
  //             stdDev: 41.67035145849988,
  //             statsArray: [
  //               {
  //                 name: 'min',
  //                 label: 'Min Pixel',
  //                 value: 596,
  //                 pointIJK: [481, 1066, 0],
  //                 pointLPS: [481, 1066, 0],
  //               },
  //               {
  //                 name: 'max',
  //                 label: 'Max Pixel',
  //                 value: 860,
  //                 pointIJK: [391, 911, 0],
  //                 pointLPS: [391, 911, 0],
  //               },
  //               {
  //                 name: 'mean',
  //                 label: 'Mean Pixel',
  //                 value: 726.7745261782005,
  //               },
  //               {
  //                 name: 'stdDev',
  //                 label: 'Standard Deviation',
  //                 value: 41.67035145849988,
  //               },
  //               {
  //                 name: 'median',
  //                 label: 'Median',
  //                 value: 724,
  //               },
  //               {
  //                 name: 'skewness',
  //                 label: 'Skewness',
  //                 value: 0.34891870479017795,
  //                 unit: null,
  //               },
  //               {
  //                 name: 'kurtosis',
  //                 label: 'Kurtosis',
  //                 value: -0.17268830182293993,
  //                 unit: null,
  //               },
  //               {
  //                 name: 'count',
  //                 label: 'Voxel Count',
  //                 value: 55084,
  //                 unit: null,
  //               },
  //               {
  //                 name: 'maxLPS',
  //                 label: 'Max LPS',
  //                 value: [391, 911, 0],
  //                 unit: null,
  //               },
  //               {
  //                 name: 'minLPS',
  //                 label: 'Min LPS',
  //                 value: [481, 1066, 0],
  //                 unit: null,
  //               },
  //               {
  //                 name: 'center',
  //                 label: 'Center',
  //                 value: [434.40022511073994, 963.1887662479123, 0],
  //                 unit: null,
  //               },
  //             ],
  //             isEmptyArea: false,
  //             areaUnit: 'px²',
  //             radius: 132.4168701171875,
  //             radiusUnit: 'px',
  //             perimeter: 831.9997327430201,
  //             modalityUnit: '',
  //           },
  //       },
  //     },
  //     annotationUID: '97649bab-c21c-4e6d-8894-22806f526d21',
  //     isLocked: false,
  //     isVisible: true,
  //     isSelected: true,
  //   },
  // ];

  // // Dynamic auto-loading of annotations based on current study
  // useEffect(() => {
  //   if (StudyInstanceUIDs && StudyInstanceUIDs.length > 0) {
  //     // Get the current active study (first study in the array)
  //     const currentStudyInstanceUID = StudyInstanceUIDs[0];

  //     // Filter annotations that belong to current study
  //     const studySpecificAnnotations = getAnnotationsForCurrentStudy(
  //       annotationObjs,
  //       currentStudyInstanceUID
  //     );

  //     if (studySpecificAnnotations.length > 0 && viewType === 'diagnostic') {
  //       loadDefaultAnnotations(studySpecificAnnotations);
  //     }
  //   }

  //   return () => {
  //     if (StudyInstanceUIDs && StudyInstanceUIDs.length > 0) {
  //       const currentStudyInstanceUID = StudyInstanceUIDs[0];
  //       const studySpecificAnnotations = getAnnotationsForCurrentStudy(
  //         annotationObjs,
  //         currentStudyInstanceUID
  //       );
  //       unloadDefaultAnnotations(studySpecificAnnotations);
  //     }
  //   };
  // }, [StudyInstanceUIDs, viewType]);

  // multiple can be true or false
  const updateActionIconValue = actionIcon => {
    actionIcon.value = !actionIcon.value;
    const newActionIcons = [...actionIcons];
    setActionIcons(newActionIcons);
  };

  // only one is true at a time
  const updateViewPresetValue = viewPreset => {
    if (!viewPreset) {
      return;
    }
    const newViewPresets = viewPresets.map(preset => {
      preset.selected = preset.id === viewPreset.id;
      return preset;
    });
    setViewPresets(newViewPresets);
  };

  const mapDisplaySetsWithState = customMapDisplaySets || _mapDisplaySets;

  const onDoubleClickThumbnailHandler = useCallback(
    async displaySetInstanceUID => {
      // console.log('%%%%%%%%%%%%%%%%%%%%%%', displaySetInstanceUID, activeViewportId);

      // Manual trigger of annotation loading for current study (optional)
      // if (StudyInstanceUIDs && StudyInstanceUIDs.length > 0) {
      //   const currentStudyInstanceUID = StudyInstanceUIDs[0];
      //   const studySpecificAnnotations = getAnnotationsForCurrentStudy(
      //     annotationObjs,
      //     currentStudyInstanceUID
      //   );

      //   if (studySpecificAnnotations.length > 0) {
      //     console.log(
      //       `Manual loading ${studySpecificAnnotations.length} annotations for study: ${currentStudyInstanceUID}`
      //     );
      //     loadDefaultAnnotations(studySpecificAnnotations);
      //   }
      // }

      // it will calculate roi overlap
      // const overlapPercent = calculateROIOverlap(annotationObjs[0], annotationObjs[1]);

      // console.log(`Overlap: ${overlapPercent}%`, overlapPercent);

      const customHandler = customizationService.getCustomization(
        'studyBrowser.thumbnailDoubleClickCallback'
      ) as CallbackCustomization;

      const setupArgs = {
        activeViewportId,
        commandsManager,
        servicesManager,
        isHangingProtocolLayout,
        appConfig: extensionManager._appConfig,
      };

      const handlers = customHandler?.callbacks.map(callback => callback(setupArgs));

      for (const handler of handlers) {
        await handler(displaySetInstanceUID);
      }
      onDoubleClickThumbnailHandlerCallBack?.(displaySetInstanceUID);
    },
    [
      activeViewportId,
      commandsManager,
      servicesManager,
      isHangingProtocolLayout,
      customizationService,
    ]
  );

  // ~~ studyDisplayList
  useEffect(() => {
    // Fetch all studies for the patient in each primary study
    async function fetchStudiesForPatient(StudyInstanceUID) {
      // Skip fetching if we've already fetched this study
      if (fetchedStudiesRef.current.has(StudyInstanceUID)) {
        return;
      }

      fetchedStudiesRef.current.add(StudyInstanceUID);

      // current study qido
      const qidoForStudyUID = await dataSource.query.studies.search({
        studyInstanceUid: StudyInstanceUID,
      });

      if (!qidoForStudyUID?.length) {
        navigate('/notfoundstudy', '_self');
        throw new Error('Invalid study URL');
      }

      let qidoStudiesForPatient = qidoForStudyUID;

      // try to fetch the prior studies based on the patientID if the
      // server can respond.
      try {
        qidoStudiesForPatient = await getStudiesForPatientByMRN(qidoForStudyUID);
      } catch (error) {
        console.warn(error);
      }

      const mappedStudies = _mapDataSourceStudies(qidoStudiesForPatient);
      const actuallyMappedStudies = mappedStudies.map(qidoStudy => {
        return {
          studyInstanceUid: qidoStudy.StudyInstanceUID,
          date: formatDate(qidoStudy.StudyDate) || '',
          description: qidoStudy.StudyDescription,
          modalities: qidoStudy.ModalitiesInStudy,
          numInstances: Number(qidoStudy.NumInstances),
        };
      });

      setStudyDisplayList(prevArray => {
        const ret = [...prevArray];
        for (const study of actuallyMappedStudies) {
          if (!prevArray.find(it => it.studyInstanceUid === study.studyInstanceUid)) {
            ret.push(study);
          }
        }
        return ret;
      });
    }

    StudyInstanceUIDs.forEach(sid => fetchStudiesForPatient(sid));
  }, [StudyInstanceUIDs, dataSource, getStudiesForPatientByMRN, navigate]);

  // ~~ Initial Thumbnails
  useEffect(() => {
    if (!hasLoadedViewports) {
      if (activeViewportId) {
        // Once there is an active viewport id, it means the layout is ready
        // so wait a bit of time to allow the viewports preferential loading
        // which improves user experience of responsiveness significantly on slower
        // systems.
        const delayMs = 250 + displaySetService.getActiveDisplaySets().length * 10;
        window.setTimeout(() => setHasLoadedViewports(true), delayMs);
      }

      return;
    }

    let currentDisplaySets = displaySetService.activeDisplaySets;
    // filter non based on the list of modalities that are supported by cornerstone
    currentDisplaySets = currentDisplaySets.filter(
      ds => !thumbnailNoImageModalities.includes(ds.Modality) || ds.thumbnailSrc === null
    );

    if (!currentDisplaySets.length) {
      return;
    }

    currentDisplaySets.forEach(async dSet => {
      const newImageSrcEntry = {};
      const displaySet = displaySetService.getDisplaySetByUID(dSet.displaySetInstanceUID);
      const imageIds = dataSource.getImageIdsForDisplaySet(dSet);

      const imageId = getImageIdForThumbnail(displaySet, imageIds);

      // TODO: Is it okay that imageIds are not returned here for SR displaySets?
      if (displaySet?.unsupported) {
        return;
      }
      // When the image arrives, render it and store the result in the thumbnailImgSrcMap
      let { thumbnailSrc } = displaySet;
      if (!thumbnailSrc && displaySet.getThumbnailSrc) {
        thumbnailSrc = await displaySet.getThumbnailSrc({ getImageSrc });
      }
      if (!thumbnailSrc && imageId) {
        const thumbnailSrc = await getImageSrc(imageId);
        displaySet.thumbnailSrc = thumbnailSrc;
      }
      newImageSrcEntry[dSet.displaySetInstanceUID] = thumbnailSrc;

      setThumbnailImageSrcMap(prevState => {
        return { ...prevState, ...newImageSrcEntry };
      });
    });
  }, [displaySetService, dataSource, getImageSrc, activeViewportId, hasLoadedViewports]);

  // ~~ displaySets
  useEffect(() => {
    const currentDisplaySets = displaySetService.activeDisplaySets;

    if (!currentDisplaySets.length) {
      return;
    }

    const mappedDisplaySets = mapDisplaySetsWithState(
      currentDisplaySets,
      displaySetsLoadingState,
      thumbnailImageSrcMap,
      viewports
    );

    if (!customMapDisplaySets) {
      sortStudyInstances(mappedDisplaySets);
    }

    setDisplaySets(mappedDisplaySets);
  }, [
    displaySetService.activeDisplaySets,
    displaySetsLoadingState,
    viewports,
    thumbnailImageSrcMap,
    customMapDisplaySets,
  ]);

  // ~~ subscriptions --> displaySets
  useEffect(() => {
    // DISPLAY_SETS_ADDED returns an array of DisplaySets that were added
    const SubscriptionDisplaySetsAdded = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_ADDED,
      data => {
        if (!hasLoadedViewports) {
          return;
        }
        const { displaySetsAdded, options } = data;
        displaySetsAdded.forEach(async dSet => {
          const displaySetInstanceUID = dSet.displaySetInstanceUID;
          const newImageSrcEntry = {};
          const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
          if (displaySet?.unsupported) {
            return;
          }
          if (options?.madeInClient) {
            setJumpToDisplaySet(displaySetInstanceUID);
          }

          const imageIds = dataSource.getImageIdsForDisplaySet(displaySet);
          const imageId = getImageIdForThumbnail(displaySet, imageIds);

          // TODO: Is it okay that imageIds are not returned here for SR displaysets?
          if (!imageId) {
            return;
          }

          // When the image arrives, render it and store the result in the thumbnailImgSrcMap
          let { thumbnailSrc } = displaySet;
          if (!thumbnailSrc && displaySet.getThumbnailSrc) {
            thumbnailSrc = await displaySet.getThumbnailSrc({ getImageSrc });
          }
          if (!thumbnailSrc) {
            thumbnailSrc = await getImageSrc(imageId);
            displaySet.thumbnailSrc = thumbnailSrc;
          }
          newImageSrcEntry[displaySetInstanceUID] = thumbnailSrc;

          setThumbnailImageSrcMap(prevState => {
            return { ...prevState, ...newImageSrcEntry };
          });
        });
      }
    );

    return () => {
      SubscriptionDisplaySetsAdded.unsubscribe();
    };
  }, [displaySetService, dataSource, getImageSrc, hasLoadedViewports]);

  useEffect(() => {
    // TODO: Will this always hold _all_ the displaySets we care about?
    // DISPLAY_SETS_CHANGED returns `DisplaySerService.activeDisplaySets`
    const SubscriptionDisplaySetsChanged = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_CHANGED,
      changedDisplaySets => {
        const mappedDisplaySets = mapDisplaySetsWithState(
          changedDisplaySets,
          displaySetsLoadingState,
          thumbnailImageSrcMap,
          viewports
        );

        if (!customMapDisplaySets) {
          sortStudyInstances(mappedDisplaySets);
        }

        setDisplaySets(mappedDisplaySets);
      }
    );

    const SubscriptionDisplaySetMetaDataInvalidated = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SET_SERIES_METADATA_INVALIDATED,
      () => {
        const mappedDisplaySets = mapDisplaySetsWithState(
          displaySetService.getActiveDisplaySets(),
          displaySetsLoadingState,
          thumbnailImageSrcMap,
          viewports
        );

        if (!customMapDisplaySets) {
          sortStudyInstances(mappedDisplaySets);
        }

        setDisplaySets(mappedDisplaySets);
      }
    );

    return () => {
      SubscriptionDisplaySetsChanged.unsubscribe();
      SubscriptionDisplaySetMetaDataInvalidated.unsubscribe();
    };
  }, [
    displaySetsLoadingState,
    thumbnailImageSrcMap,
    viewports,
    displaySetService,
    customMapDisplaySets,
  ]);

  // Override StudyDescription with the current case title (e.g. "Case 132")
  // so the sidebar shows the case identifier instead of the raw DICOM
  // StudyDescription. Reactive — ViewerLayout pushes the title to
  // useUIStateStore for both student and faculty paths.
  const caseTitle = useUIStateStore(state => state.uiState.caseTitle as string | undefined);
  // StudyInstanceUID -> folder name, published by ViewerLayout from the
  // already-fetched module case list (`study_instance_uid` -> `folder_name`),
  // so this costs no extra request. Used for both the sidebar rows and the
  // "Compare Studies" dropdown; studies outside the current module aren't in
  // the map and fall back.
  // StudyInstanceUID -> folder name, published by ViewerLayout. It merges the
  // module case list (already loaded) with a lookup by PatientID from the LMS
  // (`/cases/folder-names`), so same-patient studies from OTHER modules are
  // covered too. `folder_name` lives only in our `cases` table — it isn't a
  // DICOM tag, so it can't come from study metadata. Used for both the sidebar
  // rows and the "Compare Studies" dropdown.
  const studyFolderNames = useUIStateStore(
    state => state.uiState.studyFolderNames as Record<string, string> | undefined
  );
  // Prefer the study's own FOLDER NAME (per StudyInstanceUID, published by
  // ViewerLayout from the already-fetched module case list). `caseTitle` is a
  // single value for the OPEN case, so using it alone labelled every row in the
  // sidebar identically — no way to tell one study from another. Falls back to
  // caseTitle, then the raw StudyDescription.
  const displayList = React.useMemo(
    () =>
      (studyDisplayList || []).map(s => ({
        ...s,
        description: studyFolderNames?.[s.studyInstanceUid] || caseTitle || s.description,
      })),
    [studyDisplayList, studyFolderNames, caseTitle]
  );

  const tabs = createStudyBrowserTabs(StudyInstanceUIDs, displayList, displaySets);

  // TODO: Should not fire this on "close"
  function _handleStudyClick(StudyInstanceUID) {
    const shouldCollapseStudy = expandedStudyInstanceUIDs.includes(StudyInstanceUID);
    const updatedExpandedStudyInstanceUIDs = shouldCollapseStudy
      ? [...expandedStudyInstanceUIDs.filter(stdyUid => stdyUid !== StudyInstanceUID)]
      : [...expandedStudyInstanceUIDs, StudyInstanceUID];

    setExpandedStudyInstanceUIDs(updatedExpandedStudyInstanceUIDs);

    if (!shouldCollapseStudy) {
      const madeInClient = true;
      requestDisplaySetCreationForStudy(displaySetService, StudyInstanceUID, madeInClient);
    }
  }

  useEffect(() => {
    if (jumpToDisplaySet) {
      // Get element by displaySetInstanceUID
      const displaySetInstanceUID = jumpToDisplaySet;
      const element = document.getElementById(`thumbnail-${displaySetInstanceUID}`);

      if (element && typeof element.scrollIntoView === 'function') {
        // TODO: Any way to support IE here?
        element.scrollIntoView({ behavior: 'smooth' });

        setJumpToDisplaySet(null);
      }
    }
  }, [jumpToDisplaySet, expandedStudyInstanceUIDs, activeTabName]);

  useEffect(() => {
    if (!jumpToDisplaySet) {
      return;
    }

    const displaySetInstanceUID = jumpToDisplaySet;
    // Set the activeTabName and expand the study
    const thumbnailLocation = _findTabAndStudyOfDisplaySet(displaySetInstanceUID, tabs);
    if (!thumbnailLocation) {
      console.warn('jumpToThumbnail: displaySet thumbnail not found.');

      return;
    }
    const { tabName, StudyInstanceUID } = thumbnailLocation;
    setActiveTabName(tabName);
    const studyExpanded = expandedStudyInstanceUIDs.includes(StudyInstanceUID);
    if (!studyExpanded) {
      const updatedExpandedStudyInstanceUIDs = [...expandedStudyInstanceUIDs, StudyInstanceUID];
      setExpandedStudyInstanceUIDs(updatedExpandedStudyInstanceUIDs);
    }
  }, [expandedStudyInstanceUIDs, jumpToDisplaySet, tabs]);

  const activeDisplaySetInstanceUIDs = viewports.get(activeViewportId)?.displaySetInstanceUIDs;

  // --- Manual prior comparison ---------------------------------------------
  const currentStudyUID = StudyInstanceUIDs?.[0];

  // Only breast studies have prior-aware hanging protocols (hpMammo / hpCEM),
  // so the control is hidden for everything else.
  const canCompare = React.useMemo(() => {
    const active = displaySetService.getActiveDisplaySets?.() || [];
    return active.some(ds => ds.StudyInstanceUID === currentStudyUID && ds.Modality === 'MG');
  }, [displaySetService, currentStudyUID, displaySets]);

  // Other studies of the same patient that can serve as a prior. Restricted to
  // breast studies so an unrelated MR/US/CT can't be hung into panes that will
  // never match it. `studyDisplayList` is already fetched for the sidebar, so
  // this costs no extra network call.
  const comparableStudies = React.useMemo(
    () =>
      (studyDisplayList || []).filter(
        study =>
          study?.studyInstanceUid &&
          study.studyInstanceUid !== currentStudyUID &&
          (study.modalities || '').toUpperCase().includes('MG')
      ),
    [studyDisplayList, currentStudyUID]
  );

  const handleCompareChange = useCallback(
    async (value: string) => {
      if (value === 'none') {
        setComparePriorUID(null);
        commandsManager.run({ commandName: 'clearPriorComparison', commandOptions: {} });
        return;
      }

      setIsComparing(true);
      try {
        const applied = await commandsManager.run({
          commandName: 'applyPriorComparison',
          commandOptions: { priorStudyInstanceUID: value },
        });
        if (applied) {
          setComparePriorUID(value);
          lastPriorUIDRef.current = value;
        }
        // NOTE: deliberately do NOT touch `expandedStudyInstanceUIDs` here.
        // `_handleStudyClick` is a pure toggle over that array AND it only calls
        // requestDisplaySetCreationForStudy when it is expanding. Injecting a UID
        // here left a stale "expanded" entry after the comparison was cleared, so
        // the next click on that study collapsed it (and skipped display-set
        // creation) instead of opening it. Expansion state belongs to the user.
      } finally {
        setIsComparing(false);
      }
    },
    [commandsManager]
  );

  // Checkbox next to "Compare Studies": checked = comparison ON. Checking it
  // enables comparison (re-applies the remembered prior, or the first available
  // one if none was picked yet); unchecking is treated as Clear — the current
  // study is re-applied automatically via handleCompareChange('none').
  const handleCompareToggle = useCallback(
    (checked: boolean | 'indeterminate') => {
      if (isComparing) {
        return;
      }
      if (checked === true) {
        const uid = lastPriorUIDRef.current || comparableStudies[0]?.studyInstanceUid;
        if (uid) {
          handleCompareChange(uid);
        }
      } else {
        handleCompareChange('none');
      }
    },
    [isComparing, comparableStudies, handleCompareChange]
  );

  const getCompareStudyLabel = useCallback(
    study =>
      studyFolderNames?.[study?.studyInstanceUid] ||
      `${study?.date || 'No date'} · ${study?.modalities || ''}`,
    [studyFolderNames]
  );

  const compareLabel = comparePriorUID
    ? (() => {
        const picked = comparableStudies.find(s => s.studyInstanceUid === comparePriorUID);
        return picked ? getCompareStudyLabel(picked) : 'Comparing';
      })()
    : 'Current study';

  // Keep the dropdown in sync with whoever changed the comparison. Reset View /
  // Reset Image clear the comparison from the toolbar (they re-run the protocol
  // without the prior), and this event is what drops the stale selection here.
  useEffect(() => {
    const onComparisonChanged = (event: Event) => {
      const uid = (event as CustomEvent)?.detail?.priorStudyInstanceUID ?? null;
      setComparePriorUID(uid);
    };
    window.addEventListener('viewer-prior-comparison-changed', onComparisonChanged);
    return () =>
      window.removeEventListener('viewer-prior-comparison-changed', onComparisonChanged);
  }, []);

  return (
    <>
      <PanelStudyBrowserHeader
        viewPresets={viewPresets}
        updateViewPresetValue={updateViewPresetValue}
        actionIcons={actionIcons}
        updateActionIconValue={updateActionIconValue}
      />

      {/* Compare with a prior study — manual, one at a time. Selecting a study
          loads it and applies the prior hanging protocol; "Current study"
          restores the normal single-study layout. */}
      {canCompare && comparableStudies.length > 0 && (
        <div className="bg-popover mb-3 rounded-md px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-white">Compare Studies</span>
            {/* Checkbox replaces the old "Clear" button: checked = comparison ON.
                Unchecking clears the comparison (current study auto-applies). */}
            <label className="flex shrink-0 cursor-pointer items-center text-[11px] text-white/70">
              <Checkbox
                checked={!!comparePriorUID}
                onCheckedChange={handleCompareToggle}
                disabled={isComparing}
                aria-label="Toggle prior-study comparison"
              />
            </label>
          </div>

          <p className="mb-2 text-[11px] leading-snug text-white/50">
            Select a study to view side-by-side.
          </p>

          <Select
            value={comparePriorUID ?? 'none'}
            onValueChange={handleCompareChange}
            disabled={isComparing}
          >
            <SelectTrigger
              className="h-8 w-[180px] text-xs"
              aria-label="Select a prior study to compare"
            >
              <span className="truncate">{isComparing ? 'Loading…' : compareLabel}</span>
            </SelectTrigger>
            {/* Pin the popup to the trigger width. The ui-next Select uses
                position="popper" with min-w-[--radix-select-trigger-width], so
                by default it GROWS to fit long folder names and overflowed the
                panel. Fixing the width + truncating each label keeps it aligned
                with the field; the full name is still available on hover. */}
            <SelectContent className="w-[var(--radix-select-trigger-width)] overflow-x-hidden">
              <SelectItem value="none">Current study</SelectItem>
              {comparableStudies.map(study => {
                const label = getCompareStudyLabel(study);
                return (
                  <SelectItem
                    key={study.studyInstanceUid}
                    value={study.studyInstanceUid}
                  >
                    <span
                      className="block truncate"
                      title={label}
                    >
                      {label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      <StudyBrowser
        tabs={tabs}
        servicesManager={servicesManager}
        activeTabName={activeTabName}
        expandedStudyInstanceUIDs={expandedStudyInstanceUIDs}
        onClickStudy={_handleStudyClick}
        onClickTab={clickedTabName => {
          setActiveTabName(clickedTabName);
        }}
        onClickUntrack={onClickUntrack}
        onClickThumbnail={() => {}}
        onDoubleClickThumbnail={onDoubleClickThumbnailHandler}
        activeDisplaySetInstanceUIDs={activeDisplaySetInstanceUIDs}
        showSettings={actionIcons.find(icon => icon.id === 'settings')?.value}
        viewPresets={viewPresets}
        ThumbnailMenuItems={MoreDropdownMenu({
          commandsManager,
          servicesManager,
          menuItemsKey: 'studyBrowser.thumbnailMenuItems',
        })}
        StudyMenuItems={MoreDropdownMenu({
          commandsManager,
          servicesManager,
          menuItemsKey: 'studyBrowser.studyMenuItems',
        })}
      />
    </>
  );
}

export default PanelStudyBrowser;

/**
 * Maps from the DataSource's format to a naturalized object
 *
 * @param {*} studies
 */
function _mapDataSourceStudies(studies) {
  return studies.map(study => {
    // TODO: Why does the data source return in this format?
    return {
      AccessionNumber: study.accession,
      StudyDate: study.date,
      StudyDescription: study.description,
      NumInstances: study.instances,
      ModalitiesInStudy: study.modalities,
      PatientID: study.mrn,
      PatientName: study.patientName,
      StudyInstanceUID: study.studyInstanceUid,
      StudyTime: study.time,
    };
  });
}

function _mapDisplaySets(displaySets, displaySetLoadingState, thumbnailImageSrcMap, viewports) {
  const thumbnailDisplaySets = [];
  const thumbnailNoImageDisplaySets = [];
  displaySets
    .filter(ds => !ds.excludeFromThumbnailBrowser)
    .forEach(ds => {
      const { thumbnailSrc, displaySetInstanceUID } = ds;
      const componentType = _getComponentType(ds);

      const array =
        componentType === 'thumbnail' ? thumbnailDisplaySets : thumbnailNoImageDisplaySets;

      const loadingProgress = displaySetLoadingState?.[displaySetInstanceUID];

      // Sidebar card label: prefer a clinical view label (RCC / LMLO / Axial T1
      // / MIP / etc.) derived from per-instance DICOM tags, so cards match
      // what the viewport overlay shows. Falls back to SeriesDescription when
      // the view label can't be derived — never produces a misleading label.
      const viewLabel = getViewLabel(getDisplaySetInstance(ds));

      array.push({
        displaySetInstanceUID,
        description: viewLabel || ds.SeriesDescription || '',
        seriesNumber: ds.SeriesNumber,
        modality: ds.Modality,
        seriesDate: formatDate(ds.SeriesDate),
        numInstances: ds.numImageFrames,
        loadingProgress,
        countIcon: ds.countIcon,
        messages: ds.messages,
        StudyInstanceUID: ds.StudyInstanceUID,
        componentType,
        imageSrc: thumbnailSrc || thumbnailImageSrcMap[displaySetInstanceUID],
        dragData: {
          type: 'displayset',
          displaySetInstanceUID,
          // .. Any other data to pass
        },
        isHydratedForDerivedDisplaySet: ds.isHydrated,
      });
    });

  return [...thumbnailDisplaySets, ...thumbnailNoImageDisplaySets];
}

function _getComponentType(ds) {
  if (
    thumbnailNoImageModalities.includes(ds.Modality) ||
    ds?.unsupported ||
    ds.thumbnailSrc === null
  ) {
    return 'thumbnailNoImage';
  }

  return 'thumbnail';
}

function getImageIdForThumbnail(displaySet, imageIds) {
  let imageId;
  if (displaySet.isDynamicVolume) {
    const timePoints = displaySet.dynamicVolumeInfo.timePoints;
    const middleIndex = Math.floor(timePoints.length / 2);
    const middleTimePointImageIds = timePoints[middleIndex];
    imageId = middleTimePointImageIds[Math.floor(middleTimePointImageIds.length / 2)];
  } else {
    imageId = imageIds[Math.floor(imageIds.length / 2)];
  }
  return imageId;
}

function _findTabAndStudyOfDisplaySet(displaySetInstanceUID, tabs) {
  for (let t = 0; t < tabs.length; t++) {
    const { studies } = tabs[t];

    for (let s = 0; s < studies.length; s++) {
      const { displaySets } = studies[s];

      for (let d = 0; d < displaySets.length; d++) {
        const displaySet = displaySets[d];

        if (displaySet.displaySetInstanceUID === displaySetInstanceUID) {
          return {
            tabName: tabs[t].name,
            StudyInstanceUID: studies[s].studyInstanceUid,
          };
        }
      }
    }
  }
}
