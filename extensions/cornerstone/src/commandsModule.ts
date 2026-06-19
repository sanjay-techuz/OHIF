import { ONNXSegmentationController } from '@cornerstonejs/ai';
import {
  BaseVolumeViewport,
  Enums as CoreEnums,
  Types as CoreTypes,
  utilities as csUtils,
  eventTarget as csEventTarget,
  getEnabledElement,
  getRenderingEngines,
  metaData,
  StackViewport,
  triggerEvent as csTriggerEvent,
  VolumeViewport,
} from '@cornerstonejs/core';
import * as labelmapInterpolation from '@cornerstonejs/labelmap-interpolation';
import * as cornerstoneTools from '@cornerstonejs/tools';
import {
  annotation,
  utilities as cstUtils,
  Enums,
  ToolGroupManager,
  Types as ToolTypes,
} from '@cornerstonejs/tools';

import { SegmentationRepresentations } from '@cornerstonejs/tools/enums';
import { apiService, getCustomParams, Types as OhifTypes, utils } from '@ohif/core';
import {
  callInputDialog,
  callInputDialogAutoComplete,
  colorPickerDialog,
  multiLabelDialog,
  createReportAsync,
  useUIStateStore,
} from '@ohif/extension-default';
import i18n from '@ohif/i18n';
import { mat4, vec3 } from 'gl-matrix';
import { toolNames } from './initCornerstoneTools';
import { usePositionPresentationStore, useSegmentationPresentationStore } from './stores';
import CornerstoneViewportDownloadForm from './utils/CornerstoneViewportDownloadForm';
import { generateSegmentationCSVReport } from './utils/generateSegmentationCSVReport';
import getActiveViewportEnabledElement from './utils/getActiveViewportEnabledElement';
import { getUpdatedViewportsForSegmentation } from './utils/hydrationUtils';
import toggleImageSliceSync from './utils/imageSliceSync/toggleImageSliceSync';
import { getFirstAnnotationSelected } from './utils/measurementServiceMappings/utils/selection';
import toggleVOISliceSync from './utils/toggleVOISliceSync';
import { updateSegmentBidirectionalStats } from './utils/updateSegmentationStats';

const { DefaultHistoryMemo } = csUtils.HistoryMemo;
const toggleSyncFunctions = {
  imageSlice: toggleImageSliceSync,
  voi: toggleVOISliceSync,
};

const { segmentation: segmentationUtils } = cstUtils;

const getLabelmapTools = ({ toolGroupService }) => {
  const labelmapTools = [];
  const toolGroupIds = toolGroupService.getToolGroupIds();
  toolGroupIds.forEach(toolGroupId => {
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
    const tools = toolGroup.getToolInstances();
    // tools is an object with toolName as the key and tool as the value
    Object.keys(tools).forEach(toolName => {
      const tool = tools[toolName];
      if (tool instanceof cornerstoneTools.LabelmapBaseTool) {
        labelmapTools.push(tool);
      }
    });
  });
  return labelmapTools;
};

const getPreviewTools = ({ toolGroupService }) => {
  const labelmapTools = getLabelmapTools({ toolGroupService });

  const previewTools = labelmapTools.filter(tool => tool.acceptPreview || tool.rejectPreview);

  return previewTools;
};

const segmentAI = new ONNXSegmentationController({
  autoSegmentMode: true,
  models: {
    sam_b: [
      {
        name: 'sam-b-encoder',
        url: 'https://huggingface.co/schmuell/sam-b-fp16/resolve/main/sam_vit_b_01ec64.encoder-fp16.onnx',
        size: 180,
        key: 'encoder',
      },
      {
        name: 'sam-b-decoder',
        url: 'https://huggingface.co/schmuell/sam-b-fp16/resolve/main/sam_vit_b_01ec64.decoder.onnx',
        size: 17,
        key: 'decoder',
      },
    ],
  },
  modelName: 'sam_b',
});
let segmentAIEnabled = false;

function commandsModule({
  servicesManager,
  commandsManager,
}: OhifTypes.Extensions.ExtensionParams): OhifTypes.Extensions.CommandsModule {
  const {
    viewportGridService,
    toolGroupService,
    cineService,
    uiDialogService,
    cornerstoneViewportService,
    uiNotificationService,
    measurementService,
    customizationService,
    colorbarService,
    hangingProtocolService,
    syncGroupService,
    segmentationService,
    displaySetService,
  } = servicesManager.services as AppTypes.Services;

  function _getActiveViewportEnabledElement() {
    return getActiveViewportEnabledElement(viewportGridService);
  }

  function _getActiveViewportToolGroupId() {
    const viewport = _getActiveViewportEnabledElement();
    return toolGroupService.getToolGroupForViewport(viewport.id);
  }

  function _getActiveSegmentationInfo() {
    const viewportId = viewportGridService.getActiveViewportId();
    const activeSegmentation = segmentationService.getActiveSegmentation(viewportId);
    const segmentationId = activeSegmentation?.segmentationId;
    const activeSegmentIndex = segmentationService.getActiveSegment(viewportId).segmentIndex;

    return {
      segmentationId,
      segmentIndex: activeSegmentIndex,
    };
  }

  const actions = {
    hydrateSecondaryDisplaySet: async ({ displaySet, viewportId }) => {
      if (!displaySet) {
        return;
      }

      if (displaySet.isOverlayDisplaySet) {
        // update the previously stored segmentationPresentation with the new viewportId
        // presentation so that when we put the referencedDisplaySet back in the viewport
        // it will have the correct segmentation representation hydrated
        commandsManager.runCommand('updateStoredSegmentationPresentation', {
          displaySet,
          type:
            displaySet.Modality === 'SEG'
              ? SegmentationRepresentations.Labelmap
              : SegmentationRepresentations.Contour,
        });
      }

      const referencedDisplaySetInstanceUID = displaySet.referencedDisplaySetInstanceUID;

      const storePositionPresentation = refDisplaySet => {
        // update the previously stored positionPresentation with the new viewportId
        // presentation so that when we put the referencedDisplaySet back in the viewport
        // it will be in the correct position zoom and pan
        commandsManager.runCommand('updateStoredPositionPresentation', {
          viewportId,
          displaySetInstanceUIDs: [refDisplaySet.displaySetInstanceUID],
        });
      };

      if (displaySet.Modality === 'SEG' || displaySet.Modality === 'RTSTRUCT') {
        const referencedDisplaySet = displaySetService.getDisplaySetByUID(
          referencedDisplaySetInstanceUID
        );
        storePositionPresentation(referencedDisplaySet);
        return commandsManager.runCommand('loadSegmentationDisplaySetsForViewport', {
          viewportId,
          displaySetInstanceUIDs: [referencedDisplaySet.displaySetInstanceUID],
        });
      } else if (displaySet.Modality === 'SR') {
        const results = commandsManager.runCommand('hydrateStructuredReport', {
          displaySetInstanceUID: displaySet.displaySetInstanceUID,
        });
        const { SeriesInstanceUIDs } = results;
        const referencedDisplaySets = displaySetService.getDisplaySetsForSeries(
          SeriesInstanceUIDs[0]
        );
        referencedDisplaySets.forEach(storePositionPresentation);

        if (referencedDisplaySets.length) {
          actions.setDisplaySetsForViewports({
            viewportsToUpdate: [
              {
                viewportId: viewportGridService.getActiveViewportId(),
                displaySetInstanceUIDs: [referencedDisplaySets[0].displaySetInstanceUID],
              },
            ],
          });
        }
        return results;
      }
    },
    runSegmentBidirectional: async ({ segmentationId, segmentIndex } = {}) => {
      // Get active segmentation if not specified
      const targetSegmentation =
        segmentationId && segmentIndex
          ? { segmentationId, segmentIndex }
          : _getActiveSegmentationInfo();

      const { segmentationId: targetId, segmentIndex: targetIndex } = targetSegmentation;

      // Get bidirectional measurement data
      const bidirectionalData = await cstUtils.segmentation.getSegmentLargestBidirectional({
        segmentationId: targetId,
        segmentIndices: [targetIndex],
      });

      const activeViewportId = viewportGridService.getActiveViewportId();

      // Process each bidirectional measurement
      bidirectionalData.forEach(measurement => {
        const { segmentIndex, majorAxis, minorAxis } = measurement;

        // Create annotation
        const annotation = cornerstoneTools.SegmentBidirectionalTool.hydrate(
          activeViewportId,
          [majorAxis, minorAxis],
          {
            segmentIndex,
            segmentationId: targetId,
          }
        );

        measurement.annotationUID = annotation.annotationUID;

        // Update segmentation stats
        const updatedSegmentation = updateSegmentBidirectionalStats({
          segmentationId: targetId,
          segmentIndex: targetIndex,
          bidirectionalData: measurement,
          segmentationService,
          annotation,
        });

        // Save changes if needed
        if (updatedSegmentation) {
          segmentationService.addOrUpdateSegmentation({
            segmentationId: targetId,
            segments: updatedSegmentation.segments,
          });
        }
      });

      // get the active segmentIndex bidirectional annotation and jump to it
      const activeBidirectional = bidirectionalData.find(
        measurement => measurement.segmentIndex === targetIndex
      );
      commandsManager.run('jumpToMeasurement', {
        uid: activeBidirectional.annotationUID,
      });
    },
    interpolateLabelmap: () => {
      const { segmentationId, segmentIndex } = _getActiveSegmentationInfo();
      labelmapInterpolation.interpolate({
        segmentationId,
        segmentIndex,
      });
    },
    /**
     * Generates the selector props for the context menu, specific to
     * the cornerstone viewport, and then runs the context menu.
     */
    showCornerstoneContextMenu: options => {
      const element = _getActiveViewportEnabledElement()?.viewport?.element;

      const optionsToUse = { ...options, element };
      const { useSelectedAnnotation, nearbyToolData, event } = optionsToUse;

      // This code is used to invoke the context menu via keyboard shortcuts
      if (useSelectedAnnotation && !nearbyToolData) {
        const firstAnnotationSelected = getFirstAnnotationSelected(element);
        // filter by allowed selected tools from config property (if there is any)
        const isToolAllowed =
          !optionsToUse.allowedSelectedTools ||
          optionsToUse.allowedSelectedTools.includes(firstAnnotationSelected?.metadata?.toolName);
        if (isToolAllowed) {
          optionsToUse.nearbyToolData = firstAnnotationSelected;
        } else {
          return;
        }
      }

      optionsToUse.defaultPointsPosition = [];
      // if (optionsToUse.nearbyToolData) {
      //   optionsToUse.defaultPointsPosition = commandsManager.runCommand(
      //     'getToolDataActiveCanvasPoints',
      //     { toolData: optionsToUse.nearbyToolData }
      //   );
      // }

      // TODO - make the selectorProps richer by including the study metadata and display set.
      optionsToUse.selectorProps = {
        toolName: optionsToUse.nearbyToolData?.metadata?.toolName,
        value: optionsToUse.nearbyToolData,
        uid: optionsToUse.nearbyToolData?.annotationUID,
        nearbyToolData: optionsToUse.nearbyToolData,
        event,
        ...optionsToUse.selectorProps,
      };

      commandsManager.run(options, optionsToUse);
    },
    updateStoredSegmentationPresentation: ({ displaySet, type }) => {
      const { addSegmentationPresentationItem } = useSegmentationPresentationStore.getState();

      const referencedDisplaySetInstanceUID = displaySet.referencedDisplaySetInstanceUID;
      addSegmentationPresentationItem(referencedDisplaySetInstanceUID, {
        segmentationId: displaySet.displaySetInstanceUID,
        hydrated: true,
        type,
      });
    },
    updateStoredPositionPresentation: ({
      viewportId,
      displaySetInstanceUIDs,
      referencedImageId,
      options,
    }) => {
      const presentations = cornerstoneViewportService.getPresentations(viewportId);
      const { positionPresentationStore, setPositionPresentation, getPositionPresentationId } =
        usePositionPresentationStore.getState();

      // Look inside positionPresentationStore and find the key that includes ALL the displaySetInstanceUIDs
      // and the value has viewportId as activeViewportId.
      let previousReferencedDisplaySetStoreKey;

      if (
        displaySetInstanceUIDs &&
        Array.isArray(displaySetInstanceUIDs) &&
        displaySetInstanceUIDs.length > 0
      ) {
        previousReferencedDisplaySetStoreKey = Object.entries(positionPresentationStore).find(
          ([key, value]) => {
            return (
              displaySetInstanceUIDs.every(uid => key.includes(uid)) &&
              value.viewportId === viewportId
            );
          }
        )?.[0];
      }

      // Create presentation data with referencedImageId and options if provided
      const presentationData = referencedImageId
        ? {
            ...presentations.positionPresentation,
            viewReference: {
              referencedImageId,
              ...options,
            },
          }
        : presentations.positionPresentation;

      if (previousReferencedDisplaySetStoreKey) {
        setPositionPresentation(previousReferencedDisplaySetStoreKey, presentationData);
        return;
      }

      // if not found means we have not visited that referencedDisplaySetInstanceUID before
      // so we need to grab the positionPresentationId directly from the store,
      // Todo: this is really hacky, we should have a better way for this
      const positionPresentationId = getPositionPresentationId({
        displaySetInstanceUIDs,
        viewportId,
      });

      setPositionPresentation(positionPresentationId, presentationData);
    },
    getNearbyToolData({ nearbyToolData, element, canvasCoordinates }) {
      return nearbyToolData ?? cstUtils.getAnnotationNearPoint(element, canvasCoordinates);
    },
    getNearbyAnnotation({ element, canvasCoordinates }) {
      const nearbyToolData = actions.getNearbyToolData({
        nearbyToolData: null,
        element,
        canvasCoordinates,
      });

      const isAnnotation = toolName => {
        const enabledElement = getEnabledElement(element);

        if (!enabledElement) {
          return;
        }

        const { renderingEngineId, viewportId } = enabledElement;
        const toolGroup = ToolGroupManager.getToolGroupForViewport(viewportId, renderingEngineId);

        const toolInstance = toolGroup.getToolInstance(toolName);

        return toolInstance?.constructor?.isAnnotation ?? true;
      };

      return nearbyToolData?.metadata?.toolName && isAnnotation(nearbyToolData.metadata.toolName)
        ? nearbyToolData
        : null;
    },
    /**
     * Common logic for handling measurement label updates through dialog
     * @param uid - measurement uid
     * @returns Promise that resolves when the label is updated
     */
    _handleMeasurementLabelDialog: async uid => {
      // Right-click → "Add Label" now opens the multi-label dialog. Each
      // annotation can hold a list of custom labels (text + font size +
      // color + draggable world position) on `data.customLabels`. The
      // labels render via `CustomLabelsOverlay.tsx` and persist through
      // the existing annotation save path because they live inside the
      // annotation's `data` object.
      //
      // The old single-label flow (`measurement.label`) is unrelated — it
      // drives the "Reference Annotation"/"Your Annotation" pill in
      // `AnnotationTooltipsOverlay` and is set automatically by user-
      // type. We leave it alone.
      const measurement = measurementService.getMeasurement(uid);
      if (!measurement) {
        console.debug('No measurement found for label editing');
        return;
      }

      const ann: any = annotation.state.getAnnotation(uid);
      if (!ann?.data) {
        console.debug('No cornerstone annotation found for label editing');
        return;
      }

      const existing = Array.isArray(ann.data.customLabels) ? ann.data.customLabels : [];

      uiDialogService.show({
        content: multiLabelDialog,
        title: 'Annotation Labels',
        contentProps: {
          value: existing,
          onSave: (labels: any[]) => {
            // Write to annotation.data so the overlay re-reads on the
            // next ANNOTATION_MODIFIED.
            ann.data.customLabels = labels;
            // Fire ANNOTATION_MODIFIED via the SAME `eventTarget` instance
            // the overlay imports (NOT via require() — that risked picking
            // up a different module copy under webpack ESM/CJS interop,
            // which is why the label didn't appear until a viewport
            // change forced a CAMERA_MODIFIED). Same event also triggers
            // initMeasurementService's MODIFIED listener which routes
            // through annotationToMeasurement(isUpdate=true), and that
            // is what kicks the BIEDX debounced backend save.
            try {
              const re = cornerstoneViewportService.getRenderingEngine();
              const reId = re?.id;
              const viewports: any = viewportGridService.getState()?.viewports;
              const firstViewportId = viewports?.keys
                ? viewports.keys().next().value
                : undefined;
              csTriggerEvent(csEventTarget, Enums.Events.ANNOTATION_MODIFIED, {
                annotation: ann,
                viewportId: firstViewportId,
                renderingEngineId: reId,
              });
            } catch {
              /* event dispatch failed — labels still saved on annotation */
            }
            // Touch the measurement service too so any panels that watch
            // it re-render.
            try {
              measurementService.update(uid, { ...measurement }, true);
            } catch {
              /* non-fatal */
            }
          },
        },
      });
    },
    /**
     * Show the measurement labelling input dialog and update the label
     * on the measurement with a response if not cancelled.
     */
    setMeasurementLabel: async ({ uid }) => {
      await actions._handleMeasurementLabelDialog(uid);
    },
    renameMeasurement: async ({ uid }) => {
      await actions._handleMeasurementLabelDialog(uid);
    },
    /**
     * Right-click → "Change Color" → existing `colorPickerDialog` → applies the
     * chosen color to the annotation via cornerstone3D's per-annotation style
     * API. The color is ALSO mirrored onto `annotation.data.color`, which is
     * exactly the field the existing `RAW_MEASUREMENT_ADDED` handler reads on
     * load (see `initMeasurementService.ts:458-463`). That gives us a clean
     * round-trip: if the surrounding save flow persists `annotation_data`
     * (the JSON column the GET endpoint returns), the color comes back colored
     * on the next mount — no extra save endpoint needed.
     *
     * Args shape — the context-menu invoker passes the full `selectorProps`,
     * so we accept either an explicit `{ uid }` (programmatic call) or a
     * `nearbyToolData` (right-click invocation).
     */
    changeMeasurementColor: (args: any = {}) => {
      const uid: string | undefined =
        args?.uid ?? args?.nearbyToolData?.annotationUID ?? args?.measurement?.uid;
      if (!uid) {
        return;
      }
      const sourceAnnotation = annotation.state.getAnnotation(uid);
      if (!sourceAnnotation) {
        return;
      }

      // Seed the picker with the current annotation color if we have one;
      // otherwise default to a neutral starting point (cornerstone yellow).
      const parseRgbString = (s: string | undefined): [number, number, number] | null => {
        if (!s) {
          return null;
        }
        const m = s.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
        if (!m) {
          return null;
        }
        return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
      };
      const existing =
        parseRgbString(sourceAnnotation.data?.color as string | undefined) ||
        parseRgbString(
          annotation.config.style.getAnnotationToolStyles(uid)?.color as string | undefined
        );
      const seed = existing || [255, 255, 0];

      uiDialogService.show({
        content: colorPickerDialog,
        title: 'Change Annotation Color',
        contentProps: {
          value: { r: seed[0], g: seed[1], b: seed[2], a: 1 },
          onSave: (rgba: { r: number; g: number; b: number; a: number }) => {
            const colorStr = `rgb(${Math.round(rgba.r)}, ${Math.round(rgba.g)}, ${Math.round(
              rgba.b
            )})`;
            // 1. Apply via the per-annotation style override. Cornerstone3D's
            //    style lookup tries `colorHighlightedActive`, `colorHighlighted`,
            //    then `color` (in that order, more specific first). The global
            //    defaults in `@cornerstonejs/tools` set `colorHighlighted:
            //    rgb(0,255,0)` (BRIGHT GREEN) and `colorSelected: rgb(0,220,0)`
            //    — if we only set the base `color`, the lookup hits the global
            //    `colorHighlighted` first whenever the annotation is hovered/
            //    selected/locked, and the override is ignored. We MUST set every
            //    state + mode variant so the user-chosen color wins in all states.
            const styleOverride = {
              color: colorStr,
              colorHighlighted: colorStr,
              colorSelected: colorStr,
              colorLocked: colorStr,
              colorActive: colorStr,
              colorPassive: colorStr,
              colorEnabled: colorStr,
              colorHighlightedActive: colorStr,
              colorHighlightedPassive: colorStr,
              colorSelectedActive: colorStr,
              colorSelectedPassive: colorStr,
            };
            annotation.config.style.setAnnotationStyles(uid, styleOverride);
            // 2. Mirror onto annotation.data.color so re-renders + load-from-
            //    JSON round-trips pick it up (see initMeasurementService.ts:
            //    458-463). Also drives the per-annotation move handle in
            //    CustomRoiHitTesting.decorateRender (reads data.color).
            if (sourceAnnotation.data) {
              (sourceAnnotation.data as any).color = colorStr;
            }
            // 3. Tell MeasurementService the measurement was updated — this
            //    fires MEASUREMENT_UPDATED to subscribers (panels, save flows
            //    in main OHIF) without re-creating the measurement.
            try {
              const m = measurementService.getMeasurement(uid);
              if (m) {
                measurementService.update(uid, { ...m, color: colorStr } as any, true);
              }
            } catch {
              /* measurement may not be tracked — style change still applies */
            }
            // 4. Force the SVG annotation layer to redraw with the new style.
            //    `renderingEngine.render()` repaints the image layer but does
            //    NOT redraw cached SVG annotations — that's why the move
            //    handle (drawn fresh each render in `decorateRender` reading
            //    data.color) updated but the stock cornerstone border didn't.
            //    `triggerAnnotationRenderForViewportIds` invalidates the SVG
            //    cache and forces a fresh `renderAnnotation` pass with the
            //    new style.
            try {
              const viewportIds: string[] = [];
              const gridState: any = viewportGridService.getState();
              if (gridState?.viewports?.forEach) {
                gridState.viewports.forEach((_vp: any, id: string) => viewportIds.push(id));
              }
              if (viewportIds.length) {
                (cornerstoneTools as any).utilities.triggerAnnotationRenderForViewportIds(
                  viewportIds
                );
              }
            } catch {
              /* no enabled viewports — ignore */
            }
            // 5. Also kick the image-layer render so cornerstone fully flushes.
            try {
              cornerstoneViewportService.getRenderingEngine()?.render();
            } catch {
              /* engine may be gone; ignore */
            }
            // 6. Persist the new color to the BIEDX backend so it survives
            //    reload. The POST /annotation-measurements endpoint is an
            //    UPSERT (cases.service.ts:319-327: existing measurement_uid →
            //    `patchAndFetchById` of `annotation_data`). Re-posting with
            //    the now-updated `sourceAnnotation` (whose data.color we set
            //    above) writes the new color into `annotation_data` JSON.
            //    Round-trip on next load: initMeasurementService reads
            //    `data.annotation.data.color` and re-applies the full state
            //    variant set we just expanded.
            //
            //    Gated the same way as the existing delete (commandsModule.ts:
            //    681-690): no save in preview mode; faculty saves only when
            //    addAnswerClicked is on. Failure here is non-fatal — the
            //    in-session color change still applies; user can retry.
            try {
              const { courseId, moduleId, caseId, studentId, userType, viewType, isPreview } =
                getCustomParams();
              if (!isPreview && sourceAnnotation && (sourceAnnotation as any).metadata) {
                const measurementForSave = measurementService.getMeasurement(uid);
                const meta: any = (sourceAnnotation as any).metadata;
                const studyUID =
                  measurementForSave?.referenceStudyUID ||


                  meta?.referenceStudyUID ||
                  meta?.StudyInstanceUID;
                const toolName = meta?.toolName || measurementForSave?.toolName;
                // Modality must come from the displaySet OR cornerstone's
                // cached DICOM instance metadata — measurement objects do NOT
                // carry a top-level `modality` field. The backend Joi
                // validator rejects an empty string (cases.validation.ts), so
                // if we can't resolve it we abandon the save rather than fire
                // a doomed POST. `displaySetService` here is the real singleton
                // (destructured from servicesManager near the top of actions),
                // unlike `new DisplaySetService()` which would return an empty
                // instance.
                const dsUID = measurementForSave?.displaySetInstanceUID;
                const ds = dsUID ? displaySetService.getDisplaySetByUID(dsUID) : undefined;
                let modality: string = ds?.Modality || meta?.Modality || '';
                if (!modality) {
                  const refImgId = meta?.referencedImageId;
                  if (refImgId) {
                    const instance: any = metaData.get('instance', refImgId);
                    if (instance?.Modality) {
                      modality = instance.Modality;
                    }
                  }
                }
                if (!modality) {
                  console.warn(
                    'changeMeasurementColor: could not resolve modality — skipping save',
                    uid
                  );
                  return;
                }
                if (!studyUID) {
                  console.warn(
                    'changeMeasurementColor: missing study UID — skipping save',
                    uid
                  );
                  return;
                }
                const body: any = {
                  course_id: courseId,
                  module_id: moduleId,
                  case_id: caseId,
                  view_type: viewType,
                  study_instance_uid: studyUID,
                  measurement_uid: uid,
                  tool_name: toolName,
                  measurement_data: measurementForSave,
                  annotation_data: sourceAnnotation,
                  modality,
                  is_recall: !!(measurementForSave as any)?.is_recall,
                };
                if (userType === 'student') {
                  body.student_id = studentId;
                  apiService
                    .post('/user/cases/annotation-measurements', body)
                    .catch(err =>
                      console.warn('changeMeasurementColor: student save failed', err)
                    );
                } else {
                  body.faculty_id = (getCustomParams() as any)?.facultyId;
                  const isAddAnswerClicked = !!useUIStateStore.getState().uiState
                    .addAnswerClicked;
                  if (isAddAnswerClicked) {
                    apiService
                      .post('/admin/cases/annotation-measurements', body)
                      .catch(err =>
                        console.warn('changeMeasurementColor: faculty save failed', err)
                      );
                  }
                }
              }
            } catch (err) {
              console.warn('changeMeasurementColor: persist step failed', err);
            }
          },
        },
      });
    },
    /**
     *
     * @param props - containing the updates to apply
     * @param props.measurementKey - chooses the measurement key to apply the
     *        code to.  This will typically be finding or site to apply a
     *        finding code or a findingSites code.
     * @param props.code - A coding scheme value from DICOM, including:
     *       * CodeValue - the language independent code, for example '1234'
     *       * CodingSchemeDesignator - the issue of the code value
     *       * CodeMeaning - the text value shown to the user
     *       * ref - a string reference in the form `<designator>:<codeValue>`
     *       * type - defaulting to 'finding'.  Will replace other codes of same type
     *       * style - a styling object to use
     *       * Other fields
     *     Note it is a valid option to remove the finding or site values by
     *     supplying null for the code.
     * @param props.uid - the measurement UID to find it with
     * @param props.label - the text value for the code.  Has NOTHING to do with
     *        the measurement label, which can be set with textLabel
     * @param props.textLabel is the measurement label to apply.  Set to null to
     *            delete.
     *
     * If the measurementKey is `site`, then the code will also be added/replace
     * the 0 element of findingSites.  This behaviour is expected to be enhanced
     * in the future with ability to set other site information.
     */
    updateMeasurement: props => {
      const { code, uid, textLabel, label } = props;
      let { style } = props;
      const measurement = measurementService.getMeasurement(uid);
      if (!measurement) {
        console.warn('No measurement found to update', uid);
        return;
      }
      const updatedMeasurement = {
        ...measurement,
      };
      // Call it textLabel as the label value
      // TODO - remove the label setting when direct rendering of findingSites is enabled
      if (textLabel !== undefined) {
        updatedMeasurement.label = textLabel;
      }
      if (code !== undefined) {
        const measurementKey = code.type || 'finding';

        if (code.ref && !code.CodeValue) {
          const split = code.ref.indexOf(':');
          code.CodeValue = code.ref.substring(split + 1);
          code.CodeMeaning = code.text || label;
          code.CodingSchemeDesignator = code.ref.substring(0, split);
        }
        updatedMeasurement[measurementKey] = code;
        if (measurementKey !== 'finding') {
          if (updatedMeasurement.findingSites) {
            updatedMeasurement.findingSites = updatedMeasurement.findingSites.filter(
              it => it.type !== measurementKey
            );
            updatedMeasurement.findingSites.push(code);
          } else {
            updatedMeasurement.findingSites = [code];
          }
        }
      }

      style ||= updatedMeasurement.finding?.style;
      style ||= updatedMeasurement.findingSites?.find(site => site?.style)?.style;

      if (style) {
        // Reset the selected values to preserve appearance on selection
        style.lineDashSelected ||= style.lineDash;
        annotation.config.style.setAnnotationStyles(measurement.uid, style);

        // this is a bit ugly, but given the underlying behavior, this is how it needs to work.
        switch (measurement.toolName) {
          case toolNames.PlanarFreehandROI: {
            const targetAnnotation = annotation.state.getAnnotation(measurement.uid);
            targetAnnotation.data.isOpenUShapeContour = !!style.isOpenUShapeContour;
            break;
          }
          default:
            break;
        }
      }
      measurementService.update(updatedMeasurement.uid, updatedMeasurement, true);
    },

    /**
     * Jumps to the specified (by uid) measurement in the active viewport.
     * Also marks any provided display measurements isActive value
     */
    jumpToMeasurement: ({ uid, displayMeasurements = [] }) => {
      measurementService.jumpToMeasurement(viewportGridService.getActiveViewportId(), uid);
      for (const measurement of displayMeasurements) {
        measurement.isActive = measurement.uid === uid;
      }
    },

    removeMeasurement: async ({ uid }) => {
      if (Array.isArray(uid)) {
        measurementService.removeMany(uid);
      } else {
        // To remove the measurement from the server
        const { userType, isPreview } = getCustomParams();
        if (isPreview) {
          return;
        }
        if (userType === 'student') {
          await apiService.delete(`/user/cases/annotation-measurements/${uid}`);
        } else {
          const isAddAnswerClicked = !!useUIStateStore.getState().uiState.addAnswerClicked;
          if (isAddAnswerClicked) {
            await apiService.delete(`/admin/cases/annotation-measurements/${uid}`);
          }
        }
        measurementService.remove(uid);
      }
    },

    toggleLockMeasurement: ({ uid }) => {
      measurementService.toggleLockMeasurement(uid);
    },

    toggleVisibilityMeasurement: ({ uid, items, visibility }) => {
      if (visibility === undefined && items?.length) {
        visibility = !items[0].isVisible;
      }
      if (Array.isArray(uid)) {
        measurementService.toggleVisibilityMeasurementMany(uid, visibility);
      } else {
        measurementService.toggleVisibilityMeasurement(uid, visibility);
      }
    },

    /**
     * Download the CSV report for the measurements.
     */
    downloadCSVMeasurementsReport: ({ measurementFilter }) => {
      utils.downloadCSVReport(measurementService.getMeasurements(measurementFilter));
    },

    downloadCSVSegmentationReport: ({ segmentationId }) => {
      const segmentation = segmentationService.getSegmentation(segmentationId);

      const { representationData } = segmentation;
      const { Labelmap } = representationData;
      const { referencedImageIds } = Labelmap;

      const firstImageId = referencedImageIds[0];

      // find displaySet for firstImageId
      const displaySet = displaySetService
        .getActiveDisplaySets()
        .find(ds => ds.imageIds?.some(i => i === firstImageId));

      const {
        SeriesNumber,
        SeriesInstanceUID,
        StudyInstanceUID,
        SeriesDate,
        SeriesTime,
        SeriesDescription,
      } = displaySet;

      const additionalInfo = {
        reference: {
          SeriesNumber,
          SeriesInstanceUID,
          StudyInstanceUID,
          SeriesDate,
          SeriesTime,
          SeriesDescription,
        },
      };

      generateSegmentationCSVReport(segmentation, additionalInfo);
    },

    // Retrieve value commands
    getActiveViewportEnabledElement: _getActiveViewportEnabledElement,

    setViewportActive: ({ viewportId }) => {
      const viewportInfo = cornerstoneViewportService.getViewportInfo(viewportId);
      if (!viewportInfo) {
        console.warn('No viewport found for viewportId:', viewportId);
        return;
      }

      viewportGridService.setActiveViewportId(viewportId);
    },
    arrowTextCallback: async ({ callback }) => {
      const labelConfig = customizationService.getCustomization('measurementLabels');
      const renderContent = customizationService.getCustomization('ui.labellingComponent');

      const value = await callInputDialogAutoComplete({
        uiDialogService,
        labelConfig,
        renderContent,
      });
      callback?.(value);
    },

    toggleCine: () => {
      const { viewports } = viewportGridService.getState();
      const { isCineEnabled } = cineService.getState();
      cineService.setIsCineEnabled(!isCineEnabled);
      viewports.forEach((_, index) => cineService.setCine({ id: index, isPlaying: false }));
    },

    setViewportWindowLevel({
      viewportId,
      windowWidth,
      windowCenter,
      displaySetInstanceUID,
    }: {
      viewportId: string;
      windowWidth: number;
      windowCenter: number;
      displaySetInstanceUID?: string;
    }) {
      // convert to numbers
      const windowWidthNum = Number(windowWidth);
      const windowCenterNum = Number(windowCenter);

      // get actor from the viewport
      const renderingEngine = cornerstoneViewportService.getRenderingEngine();
      const viewport = renderingEngine.getViewport(viewportId);

      const { lower, upper } = csUtils.windowLevel.toLowHighRange(windowWidthNum, windowCenterNum);

      if (viewport instanceof BaseVolumeViewport) {
        const volumeId = actions.getVolumeIdForDisplaySet({
          viewportId,
          displaySetInstanceUID,
        });
        viewport.setProperties(
          {
            voiRange: {
              upper,
              lower,
            },
          },
          volumeId
        );
      } else {
        viewport.setProperties({
          voiRange: {
            upper,
            lower,
          },
        });
      }
      viewport.render();
    },
    toggleViewportColorbar: ({ viewportId, displaySetInstanceUIDs, options = {} }) => {
      const hasColorbar = colorbarService.hasColorbar(viewportId);
      if (hasColorbar) {
        colorbarService.removeColorbar(viewportId);
        return;
      }
      colorbarService.addColorbar(viewportId, displaySetInstanceUIDs, options);
    },
    setWindowLevel(props) {
      const { toolGroupId } = props;
      const { viewportId } = _getActiveViewportEnabledElement();
      const viewportToolGroupId = toolGroupService.getToolGroupForViewport(viewportId);

      if (toolGroupId && toolGroupId !== viewportToolGroupId) {
        return;
      }

      actions.setViewportWindowLevel({ ...props, viewportId });
    },
    setWindowLevelPreset: ({ presetName, presetIndex }) => {
      const windowLevelPresets = customizationService.getCustomization(
        'cornerstone.windowLevelPresets'
      );

      const activeViewport = viewportGridService.getActiveViewportId();
      const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewport);
      const metadata = viewport.getImageData().metadata;

      const modality = metadata.Modality;

      if (!modality) {
        return;
      }

      const windowLevelPresetForModality = windowLevelPresets[modality];

      if (!windowLevelPresetForModality) {
        return;
      }

      const windowLevelPreset =
        windowLevelPresetForModality[presetName] ??
        Object.values(windowLevelPresetForModality)[presetIndex];

      actions.setViewportWindowLevel({
        viewportId: activeViewport,
        windowWidth: windowLevelPreset.window,
        windowCenter: windowLevelPreset.level,
      });
    },
    getVolumeIdForDisplaySet: ({ viewportId, displaySetInstanceUID }) => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
      if (viewport instanceof BaseVolumeViewport) {
        const volumeIds = viewport.getAllVolumeIds();
        const volumeId = volumeIds.find(id => id.includes(displaySetInstanceUID));
        return volumeId;
      }
      return null;
    },
    setToolEnabled: ({ toolName, toggle, toolGroupId }) => {
      const { viewports } = viewportGridService.getState();

      if (!viewports.size) {
        return;
      }

      const toolGroup = toolGroupService.getToolGroup(toolGroupId ?? null);

      if (!toolGroup || !toolGroup.hasTool(toolName)) {
        return;
      }

      const toolIsEnabled = toolGroup.getToolOptions(toolName).mode === Enums.ToolModes.Enabled;

      // Toggle the tool's state only if the toggle is true
      if (toggle) {
        toolIsEnabled ? toolGroup.setToolDisabled(toolName) : toolGroup.setToolEnabled(toolName);
      } else {
        toolGroup.setToolEnabled(toolName);
      }

      const renderingEngine = cornerstoneViewportService.getRenderingEngine();
      renderingEngine.render();
    },
    toggleEnabledDisabledToolbar({ value, itemId, toolGroupId }) {
      const toolName = itemId || value;
      toolGroupId = toolGroupId ?? _getActiveViewportToolGroupId();

      const toolGroup = toolGroupService.getToolGroup(toolGroupId);
      if (!toolGroup || !toolGroup.hasTool(toolName)) {
        return;
      }

      const toolIsEnabled = toolGroup.getToolOptions(toolName).mode === Enums.ToolModes.Enabled;

      toolIsEnabled ? toolGroup.setToolDisabled(toolName) : toolGroup.setToolEnabled(toolName);
    },
    toggleActiveDisabledToolbar({ value, itemId, toolGroupId }) {
      const toolName = itemId || value;
      toolGroupId = toolGroupId ?? _getActiveViewportToolGroupId();
      const toolGroup = toolGroupService.getToolGroup(toolGroupId);
      if (!toolGroup || !toolGroup.hasTool(toolName)) {
        return;
      }

      const toolIsActive = [
        Enums.ToolModes.Active,
        Enums.ToolModes.Enabled,
        Enums.ToolModes.Passive,
      ].includes(toolGroup.getToolOptions(toolName).mode);

      toolIsActive
        ? toolGroup.setToolDisabled(toolName)
        : actions.setToolActive({ toolName, toolGroupId });

      // we should set the previously active tool to active after we set the
      // current tool disabled
      if (toolIsActive) {
        const prevToolName = toolGroup.getPrevActivePrimaryToolName();
        if (prevToolName !== toolName) {
          actions.setToolActive({ toolName: prevToolName, toolGroupId });
        }
      }
    },
    setToolActiveToolbar: ({ value, itemId, toolName, toolGroupIds = [] }) => {
      // Sometimes it is passed as value (tools with options), sometimes as itemId (toolbar buttons)
      toolName = toolName || itemId || value;

      toolGroupIds = toolGroupIds.length ? toolGroupIds : toolGroupService.getToolGroupIds();

      toolGroupIds.forEach(toolGroupId => {
        actions.setToolActive({ toolName, toolGroupId });
      });
    },
    setToolActive: ({ toolName, toolGroupId = null }) => {
      const { viewports } = viewportGridService.getState();

      if (!viewports.size) {
        return;
      }

      const toolGroup = toolGroupService.getToolGroup(toolGroupId);

      if (!toolGroup) {
        return;
      }

      if (!toolGroup?.hasTool(toolName)) {
        return;
      }

      const activeToolName = toolGroup.getActivePrimaryMouseButtonTool();

      if (activeToolName) {
        const activeToolOptions = toolGroup.getToolConfiguration(activeToolName);
        activeToolOptions?.disableOnPassive
          ? toolGroup.setToolDisabled(activeToolName)
          : toolGroup.setToolPassive(activeToolName);
      }

      // Set the new toolName to be active
      toolGroup.setToolActive(toolName, {
        bindings: [
          {
            mouseButton: Enums.MouseBindings.Primary,
          },
        ],
      });
    },
    // capture viewport
    showDownloadViewportModal: () => {
      const { activeViewportId } = viewportGridService.getState();

      if (!cornerstoneViewportService.getCornerstoneViewport(activeViewportId)) {
        // Cannot download a non-cornerstone viewport (image).
        uiNotificationService.show({
          title: 'Download Image',
          message: 'Image cannot be downloaded',
          type: 'error',
        });
        return;
      }

      const { uiModalService } = servicesManager.services;

      if (uiModalService) {
        uiModalService.show({
          content: CornerstoneViewportDownloadForm,
          title: 'Download High Quality Image',
          contentProps: {
            activeViewportId,
            cornerstoneViewportService,
          },
          containerClassName: 'max-w-4xl p-4',
        });
      }
    },
    rotateViewport: ({ rotation }) => {
      const enabledElement = _getActiveViewportEnabledElement();
      if (!enabledElement) {
        return;
      }

      const { viewport } = enabledElement;

      if (viewport instanceof BaseVolumeViewport) {
        const camera = viewport.getCamera();
        const rotAngle = (rotation * Math.PI) / 180;
        const rotMat = mat4.identity(new Float32Array(16));
        mat4.rotate(rotMat, rotMat, rotAngle, camera.viewPlaneNormal);
        const rotatedViewUp = vec3.transformMat4(vec3.create(), camera.viewUp, rotMat);
        viewport.setCamera({ viewUp: rotatedViewUp as CoreTypes.Point3 });
        viewport.render();
      } else if (viewport.getRotation !== undefined) {
        const presentation = viewport.getViewPresentation();
        const { rotation: currentRotation } = presentation;
        const newRotation = (currentRotation + rotation + 360) % 360;
        viewport.setViewPresentation({ rotation: newRotation });
        viewport.render();
      }
    },
    flipViewportHorizontal: () => {
      const enabledElement = _getActiveViewportEnabledElement();

      if (!enabledElement) {
        return;
      }

      const { viewport } = enabledElement;

      const { flipHorizontal } = viewport.getCamera();
      viewport.setCamera({ flipHorizontal: !flipHorizontal });
      viewport.render();
    },
    flipViewportVertical: () => {
      const enabledElement = _getActiveViewportEnabledElement();

      if (!enabledElement) {
        return;
      }

      const { viewport } = enabledElement;

      const { flipVertical } = viewport.getCamera();
      viewport.setCamera({ flipVertical: !flipVertical });
      viewport.render();
    },
    invertViewport: ({ element }) => {
      let enabledElement;

      if (element === undefined) {
        enabledElement = _getActiveViewportEnabledElement();
      } else {
        enabledElement = element;
      }

      if (!enabledElement) {
        return;
      }

      const { viewport } = enabledElement;

      const { invert } = viewport.getProperties();
      viewport.setProperties({ invert: !invert });
      viewport.render();
    },
    resetViewport: () => {
      const enabledElement = _getActiveViewportEnabledElement();

      if (!enabledElement) {
        return;
      }

      const { viewport } = enabledElement;

      try {
        // Reset camera first
        viewport.resetCamera();

        // Get current properties to check what needs to be reset
        const currentProperties = viewport.getProperties();

        // Create a safe reset properties object
        const resetProperties = {
          // Reset window/level to default
          voiRange: undefined,
          // Reset invert to false
          invert: false,
          // Reset rotation to 0
          rotation: 0,
        };

        // Only set colormap if it's not null and has a valid name
        if (
          currentProperties.colormap &&
          typeof currentProperties.colormap === 'object' &&
          currentProperties.colormap.name
        ) {
          // Keep existing colormap if it's valid
          resetProperties.colormap = currentProperties.colormap;
        } else {
          // Set default grayscale colormap if current one is invalid
          resetProperties.colormap = { name: 'Grayscale', opacity: 1 };
        }

        // Apply the reset properties
        viewport.setProperties(resetProperties);
        viewport.render();
      } catch (error) {
        console.warn('Error during viewport reset, using fallback approach:', error);

        // Fallback: Reset camera and try to reset properties safely
        try {
          viewport.resetCamera();

          // Try to reset properties with null-safe colormap
          const safeProperties = {
            voiRange: undefined,
            invert: false,
            rotation: 0,
            colormap: { name: 'Grayscale', opacity: 1 },
          };

          viewport.setProperties(safeProperties);
          viewport.render();
        } catch (fallbackError) {
          console.warn('Fallback reset also failed, using minimal reset:', fallbackError);
          // Last resort: just reset camera
          viewport.resetCamera();
          viewport.render();
        }
      }
    },
    resetView: () => {
      // NARROW Reset View — only the hanging protocol snaps back to its
      // default stage; everything else (W/L, zoom, pan, annotations) is
      // left as the user has it. For the full reset behaviour (clear
      // annotations + per-viewport reset + re-fetch from DB) use the
      // separate `clearView` command (Toolbar "Clear" button).
      //
      // Default stage per protocol:
      //   hpMammo (MG)  → stageIndex 2  ("All Current")
      //   hpCEM         → stageIndex 0  ("Paired LE/Recombined (All)")
      //   hpMR          → stageIndex 0  (2x3 grid)
      //   any other     → stageIndex 0
      //
      // Always re-fires `setProtocol(defaultStage)` + `setMammographyZoomConditional`
      // — even when the user is already on the default stage — so the HP/zoom
      // can snap back from a custom layout or zoomed-in state.
      //
      // Why `hangingProtocolService.setProtocol(id, { stageIndex })` directly
      // instead of the OHIF `setHangingProtocol` command wrapper: the wrapper's
      // `reset: true` branch calls `hangingProtocolService.run(study, id)`
      // WITHOUT options, so the `stageIndex` we pass gets dropped and
      // `_setProtocol` defaults to `options?.stageIndex || 0`. Direct
      // setProtocol respects the stageIndex.
      try {
        const active = hangingProtocolService.getActiveProtocol();
        const protocolId = active?.protocol?.id;
        if (protocolId) {
          const defaultStageIndex = protocolId === '@ohif/hpMammo' ? 2 : 0;
          hangingProtocolService.setProtocol(protocolId, {
            stageIndex: defaultStageIndex,
          });
        }
      } catch (e) {
        console.warn('resetView: HP setProtocol failed', e);
      }

      // Replay BIEDX MG-zoom step (no-op for non-MG).
      try {
        commandsManager.run('setMammographyZoomConditional', {});
      } catch {
        /* command may not exist in non-BIEDX modes */
      }
    },

    clearView: () => {
      // Toolbar Clear (full reset): bring viewports back to the
      // "fresh case-open" state WITHOUT reloading the page (DICOM cache
      // preserved so large cases don't re-download).
      //
      // Strategy:
      //
      //   1. Clear EVERY in-memory annotation. Faculty draws that were
      //      never saved (no Add-Answer click) stay gone — what the user
      //      wants ("Clear drops unsaved work"). Saved annotations come
      //      back via the DB re-fetch path (step 5).
      //
      //   2. Per-viewport reset on every viewport that has a loaded image.
      //      `viewport.resetProperties()` re-derives VOI from the image's
      //      modality LUT (true W/L reset — fixes "slight darkening"),
      //      restores `initialInvert`, restores the original colormap.
      //      `viewport.resetCamera()` resets zoom / pan / rotation.
      //      Runs while images are stable, so cornerstone3D's internal
      //      `_getVOIRangeForCurrentImage()` succeeds and the viewport
      //      paints immediately — no blanking.
      //
      //   3. Detect whether the user is on a custom layout (Layout-menu
      //      override) by comparing the current viewport-pane count to the
      //      default HP stage's viewport count. Only re-run HP when needed.
      //
      //   4. Re-run HP with the default stageIndex when stage or layout
      //      differs from default. Direct setProtocol (not the
      //      `setHangingProtocol` command wrapper which drops stageIndex
      //      on `reset: true`).
      //
      //   5. Replay `setMammographyZoomConditional` — BIEDX-specific MG
      //      zoom step that HangingProtocolDropdown.useEffect runs after
      //      HP on initial mount. Idempotent for non-MG.
      //
      //   6. Ask ViewerLayout to re-fetch DB-saved annotations.
      //      `window.__reloadSavedAnnotations` is registered by ViewerLayout
      //      on mount. The fetch effect re-runs and gates correctly by
      //      userType/isPreview/isAddAnswerClicked.

      // ---- 1. Clear all annotations (in-memory) ----
      try {
        measurementService.clearMeasurements();
      } catch (e) {
        console.warn('clearView: clearMeasurements failed', e);
      }

      // ---- 2. Per-viewport reset ----
      try {
        getRenderingEngines().forEach(re => {
          re.getViewports().forEach((viewport: any) => {
            try {
              if (!viewport?.element || !viewport.getImageData?.()) {
                return;
              }
              if (typeof viewport.resetProperties === 'function') {
                viewport.resetProperties();
              }
              viewport.resetCamera?.();
              viewport.render?.();
            } catch {
              /* skip viewports that aren't alive */
            }
          });
        });
      } catch (e) {
        console.warn('clearView: per-viewport reset failed', e);
      }

      // ---- 3. Detect whether HP needs re-running ----
      let needsHpRerun = false;
      let protocolId: string | undefined;
      let defaultStageIndex = 0;
      try {
        const active = hangingProtocolService.getActiveProtocol();
        protocolId = active?.protocol?.id;
        const currentStageIndex = active?.stageIndex ?? 0;
        if (protocolId) {
          if (protocolId === '@ohif/hpMammo') {
            defaultStageIndex = 2;
          }
          if (currentStageIndex !== defaultStageIndex) {
            needsHpRerun = true;
          } else {
            const protocol = hangingProtocolService.getProtocolById(protocolId);
            const expectedCount = protocol?.stages?.[defaultStageIndex]?.viewports?.length || 0;
            const currentCount = viewportGridService.getNumViewportPanes();
            if (expectedCount > 0 && expectedCount !== currentCount) {
              needsHpRerun = true;
            }
          }
        }
      } catch (e) {
        console.warn('clearView: layout detection failed', e);
      }

      // ---- 4. Re-run HP only when custom layout or non-default stage ----
      if (needsHpRerun && protocolId) {
        try {
          hangingProtocolService.setProtocol(protocolId, {
            stageIndex: defaultStageIndex,
          });
        } catch (e) {
          console.warn('clearView: HP setProtocol failed', e);
        }
      }

      // ---- 5. Replay BIEDX MG-zoom step ----
      try {
        commandsManager.run('setMammographyZoomConditional', {});
      } catch {
        /* command may not exist in non-BIEDX modes */
      }

      // ---- 6. Re-fetch DB-saved annotations ----
      try {
        (window as any).__reloadSavedAnnotations?.();
      } catch {
        /* trigger not registered — viewer not mounted; safe to ignore */
      }
    },
    scaleViewport: ({ direction }) => {
      const enabledElement = _getActiveViewportEnabledElement();
      const scaleFactor = direction > 0 ? 0.9 : 1.1;

      if (!enabledElement) {
        return;
      }
      const { viewport } = enabledElement;

      if (viewport instanceof StackViewport) {
        if (direction) {
          const { parallelScale } = viewport.getCamera();
          viewport.setCamera({ parallelScale: parallelScale * scaleFactor });
          viewport.render();
        } else {
          viewport.resetCamera();
          viewport.render();
        }
      }
    },

    setMammographyZoomConditional: ({ viewportId, verticalAlignment }) => {
      // Check if we're in a partial view stage (stages 7-10)
      const hangingProtocolService = servicesManager.services.hangingProtocolService;
      const currentStageIndex = hangingProtocolService.stageIndex;

      // ROBUST SOLUTION: Use multiple attempts with increasing delays
      const applyZoomWithRetry = (attempt = 1, maxAttempts = 5) => {
        const renderingEngine = cornerstoneViewportService.getRenderingEngine();
        if (!renderingEngine) {
          if (attempt < maxAttempts) {
            setTimeout(() => applyZoomWithRetry(attempt + 1, maxAttempts), 200 * attempt);
          }
          return;
        }

        const viewports = renderingEngine.getViewports();

        const targetViewports = viewportId
          ? [renderingEngine.getViewport(viewportId)].filter(Boolean)
          : Object.values(viewports).filter(vp => vp instanceof StackViewport);

        if (targetViewports.length === 0) {
          if (attempt < maxAttempts) {
            setTimeout(() => applyZoomWithRetry(attempt + 1, maxAttempts), 200 * attempt);
          }
          return;
        }

        // Check if viewports are ready (have image data AND non-zero dimensions).
        // The previous check `imageData.dimensions || imageData.width` always passed
        // because a `[0, 0]` array is truthy in JS — so the retry never actually
        // retried and `parallelScale` would be computed as `Math.max(0,0)/2 = 0`,
        // producing the "Zoom: 0.01x" microscopic-image bug on slow first-load.
        const readyViewports = targetViewports.filter(viewport => {
          if (!(viewport instanceof StackViewport)) {
            return false;
          }
          const imageData = viewport.getImageData();
          const dims = imageData?.dimensions;
          return Array.isArray(dims) && dims[0] > 0 && dims[1] > 0;
        });

        // If no viewports have valid dimensions yet, retry. If we've exhausted
        // retries, return without touching the camera — the hanging protocol's
        // `imageArea: [0.8, 0.8]` default fit will hold (clean fit-to-window,
        // never microscopic).
        if (readyViewports.length === 0) {
          if (attempt < maxAttempts) {
            setTimeout(() => applyZoomWithRetry(attempt + 1, maxAttempts), 200 * attempt);
          }
          return;
        }

        // Apply zoom based on stage type
        if (currentStageIndex >= 16) {
          // Partial view stages (16-21) - 2x zoom + pan to show 33% of image
          // Stages: 16=RCC-LCC-TOP, 17=RCC-LCC-CENTER, 18=RCC-LCC-BOTTOM
          //         19=RMLO-LMLO-TOP, 20=RMLO-LMLO-CENTER, 21=RMLO-LMLO-BOTTOM
          const currentStage = hangingProtocolService.protocol?.stages?.[currentStageIndex];
          const stageVerticalAlignment =
            currentStage?.onViewportDataInitialized?.[0]?.commandOptions?.verticalAlignment;

          readyViewports.forEach((viewport, index) => {
            viewport.resetCamera();
            const camera = viewport.getCamera();
            const imageData = viewport.getImageData();
            if (!imageData || !imageData.dimensions) {
              return;
            }

            const [, height] = imageData.dimensions;
            // Apply 2x zoom
            const newParallelScale = camera.parallelScale / 2;

            // Compute pan distance in world coordinates for 33% view
            // Get spacing to convert pixels to world coordinates
            const spacing = imageData.spacing || [1, 1];
            const [, spacingY] = spacing;

            // Full image height in world coordinates
            const fullHeightWorld = height * spacingY;

            // Calculate pan to show the center of each third (33%)
            // Image center is at 0 after resetCamera
            // Top third center: -1/3 from center
            // Center third center: 0 (at center)
            // Bottom third center: +1/3 from center
            let panY = 0;
            if (stageVerticalAlignment === 'top') {
              // Pan up to show top 33%: move center to -1/3 of image height
              panY = -fullHeightWorld / 3;
            } else if (stageVerticalAlignment === 'center') {
              // Pan to show center 33%: keep center at image center
              panY = 0;
            } else if (stageVerticalAlignment === 'bottom') {
              // Pan down to show bottom 33%: move center to +1/3 of image height
              panY = fullHeightWorld / 3;
            }

            // Apply camera update - use position and focalPoint for panning
            const newPosition = [...camera.position] as [number, number, number];
            const newFocalPoint = [...camera.focalPoint] as [number, number, number];

            // Apply vertical pan by adjusting position and focalPoint
            newPosition[1] += panY; // Adjust Y position
            newFocalPoint[1] += panY; // Adjust Y focal point

            let panX = 0;
            try {
              // Get the current stage and viewport configuration
              const currentStage = hangingProtocolService.protocol?.stages?.[currentStageIndex];
              if (currentStage && currentStage.viewports && currentStage.viewports[index]) {
                const viewportConfig = currentStage.viewports[index];
                if (viewportConfig.displaySets && viewportConfig.displaySets[0]) {
                  const displaySetId = viewportConfig.displaySets[0].id;
                  // Apply pan based on display set type (both FFDM and DBT)
                  if (
                    displaySetId === 'LCC' ||
                    displaySetId === 'LMLO' ||
                    displaySetId === 'LCC3D' ||
                    displaySetId === 'LMLO3D'
                  ) {
                    panX = -25; // Left side - pan left
                  } else if (
                    displaySetId === 'RCC' ||
                    displaySetId === 'RMLO' ||
                    displaySetId === 'RCC3D' ||
                    displaySetId === 'RMLO3D'
                  ) {
                    panX = 25; // Right side - pan right
                  }
                }
              }
            } catch (error) {
              // Fallback: use viewport index to determine side
              if (index === 0 || index === 2) {
                panX = 25; // RCC, RMLO
              } else if (index === 1 || index === 3) {
                panX = -25; // LCC, LMLO
              }
            }
            newPosition[0] += panX; // Adjust X position
            newFocalPoint[0] += panX; // Adjust X focal point
            viewport.setCamera({
              ...camera,
              parallelScale: newParallelScale,
              position: newPosition,
              focalPoint: newFocalPoint,
            });
            // viewport.setPan([100, 0]);

            viewport.render();
          });
        } else {
          // Normal stages (0-15) — no manual zoom or pan. The hanging
          // protocol's displayArea (`centeredFitDisplayArea`, imageArea
          // [1.0, 1.0]) already gives a clean centered fit that exactly
          // cancels cornerstone's `insetImageMultiplier = 1.1` so the
          // image lands flush on the constraining canvas dimension with
          // no cutoff. Just call `resetCamera()` so any race-condition
          // camera state gets reset back to the displayArea's intended
          // fit. The previous implementation here applied a
          // `Math.max(scaleX,scaleY)/2` parallelScale plus a ±115-canvas-
          // pixel horizontal pan, which produced the "Zoom: 1.35x with
          // chest-wall cropping" view on initial load AND re-fired
          // whenever the viewport was resized (sidebar open/close),
          // hijacking the displayArea fit. Standalone removed this code
          // 2026-05-26; main OHIF brought into sync 2026-06-04.
          readyViewports.forEach(viewport => {
            viewport.resetCamera();
            viewport.render();
          });
        }
      };

      // Start with immediate attempt, then retry with delays
      applyZoomWithRetry();
    },

    /** Jumps the active viewport or the specified one to the given slice index */
    jumpToImage: ({ imageIndex, viewport: gridViewport }): void => {
      // Get current active viewport (return if none active)
      let viewport;
      if (!gridViewport) {
        const enabledElement = _getActiveViewportEnabledElement();
        if (!enabledElement) {
          return;
        }
        viewport = enabledElement.viewport;
      } else {
        viewport = cornerstoneViewportService.getCornerstoneViewport(gridViewport.id);
      }

      // Get number of slices
      // -> Copied from cornerstone3D jumpToSlice\_getImageSliceData()
      let numberOfSlices = 0;

      if (viewport instanceof StackViewport) {
        numberOfSlices = viewport.getImageIds().length;
      } else if (viewport instanceof VolumeViewport) {
        numberOfSlices = csUtils.getImageSliceDataForVolumeViewport(viewport).numberOfSlices;
      } else {
        throw new Error('Unsupported viewport type');
      }

      const jumpIndex = imageIndex < 0 ? numberOfSlices + imageIndex : imageIndex;
      if (jumpIndex >= numberOfSlices || jumpIndex < 0) {
        throw new Error(`Can't jump to ${imageIndex}`);
      }

      // Set slice to last slice
      const options = { imageIndex: jumpIndex };
      csUtils.jumpToSlice(viewport.element, options);
    },
    scroll: (options: ToolTypes.ScrollOptions) => {
      const enabledElement = _getActiveViewportEnabledElement();
      // Allow either or direction for consistency in scroll implementation
      options.delta ??= options.direction || 1;
      options.direction ??= options.delta;

      if (!enabledElement) {
        return;
      }

      const { viewport } = enabledElement;

      csUtils.scroll(viewport, options);
    },
    setViewportColormap: ({
      viewportId,
      displaySetInstanceUID,
      colormap,
      opacity = 1,
      immediate = false,
    }) => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

      let hpOpacity;
      // Retrieve active protocol's viewport match details
      const { viewportMatchDetails } = hangingProtocolService.getActiveProtocol();
      // Get display set options for the specified viewport ID
      const displaySetsInfo = viewportMatchDetails.get(viewportId)?.displaySetsInfo;

      if (displaySetsInfo) {
        // Find the display set that matches the given UID
        const matchingDisplaySet = displaySetsInfo.find(
          displaySet => displaySet.displaySetInstanceUID === displaySetInstanceUID
        );
        // If a matching display set is found, update the opacity with its value
        hpOpacity = matchingDisplaySet?.displaySetOptions?.options?.colormap?.opacity;
      }

      // HP takes priority over the default opacity
      // Add null check to prevent spread operator error when colormap is null
      if (colormap && typeof colormap === 'object' && colormap.name) {
        colormap = { ...colormap, opacity: hpOpacity || opacity };
      } else {
        console.warn('Invalid colormap object, using default Grayscale:', colormap);
        colormap = { name: 'Grayscale', opacity: hpOpacity || opacity };
      }

      if (viewport instanceof StackViewport) {
        viewport.setProperties({ colormap });
      }

      if (viewport instanceof VolumeViewport) {
        if (!displaySetInstanceUID) {
          const { viewports } = viewportGridService.getState();
          displaySetInstanceUID = viewports.get(viewportId)?.displaySetInstanceUIDs[0];
        }

        // ToDo: Find a better way of obtaining the volumeId that corresponds to the displaySetInstanceUID
        const volumeId =
          viewport
            .getAllVolumeIds()
            .find((_volumeId: string) => _volumeId.includes(displaySetInstanceUID)) ??
          viewport.getVolumeId();
        viewport.setProperties({ colormap }, volumeId);
      }

      if (immediate) {
        viewport.render();
      }
    },
    changeActiveViewport: ({ direction = 1 }) => {
      const { activeViewportId, viewports } = viewportGridService.getState();
      const viewportIds = Array.from(viewports.keys());
      const currentIndex = viewportIds.indexOf(activeViewportId);
      const nextViewportIndex =
        (currentIndex + direction + viewportIds.length) % viewportIds.length;
      viewportGridService.setActiveViewportId(viewportIds[nextViewportIndex] as string);
    },
    /**
     * If the syncId is given and a synchronizer with that ID already exists, it will
     * toggle it on/off for the provided viewports. If not, it will attempt to create
     * a new synchronizer using the given syncId and type for the specified viewports.
     * If no viewports are provided, you may notice some default behavior.
     * - 'voi' type, we will aim to synchronize all viewports with the same modality
     * -'imageSlice' type, we will aim to synchronize all viewports with the same orientation.
     *
     * @param options
     * @param options.viewports - The viewports to synchronize
     * @param options.syncId - The synchronization group ID
     * @param options.type - The type of synchronization to perform
     */
    toggleSynchronizer: ({ type, viewports, syncId }) => {
      const synchronizer = syncGroupService.getSynchronizer(syncId);

      if (synchronizer) {
        synchronizer.isDisabled() ? synchronizer.setEnabled(true) : synchronizer.setEnabled(false);
        return;
      }

      const fn = toggleSyncFunctions[type];

      if (fn) {
        fn({
          servicesManager,
          viewports,
          syncId,
        });
      }
    },
    setViewportForToolConfiguration: ({ viewportId, toolName }) => {
      if (!viewportId) {
        const { activeViewportId } = viewportGridService.getState();
        viewportId = activeViewportId ?? 'default';
      }

      const toolGroup = toolGroupService.getToolGroupForViewport(viewportId);

      if (!toolGroup?.hasTool(toolName)) {
        return;
      }

      const prevConfig = toolGroup?.getToolConfiguration(toolName);
      toolGroup?.setToolConfiguration(
        toolName,
        {
          ...prevConfig,
          sourceViewportId: viewportId,
        },
        true // overwrite
      );

      const renderingEngine = cornerstoneViewportService.getRenderingEngine();
      renderingEngine.render();
    },
    storePresentation: ({ viewportId }) => {
      cornerstoneViewportService.storePresentation({ viewportId });
    },
    updateVolumeData: ({ volume }) => {
      // update vtkOpenGLTexture and imageData of computed volume
      const { imageData, vtkOpenGLTexture } = volume;
      const numSlices = imageData.getDimensions()[2];
      const slicesToUpdate = [...Array(numSlices).keys()];
      slicesToUpdate.forEach(i => {
        vtkOpenGLTexture.setUpdatedFrame(i);
      });
      imageData.modified();
    },

    attachProtocolViewportDataListener: ({ protocol, stageIndex }) => {
      const EVENT = cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED;
      const command = protocol.callbacks.onViewportDataInitialized;
      const numPanes = protocol.stages?.[stageIndex]?.viewports.length ?? 1;

      // Two-phase readiness:
      //   Phase 1: VIEWPORT_DATA_CHANGED — stack assigned, but pixels may not be
      //            decoded yet (image dimensions can still read as [0,0]).
      //   Phase 2: IMAGE_RENDERED       — pixels decoded, dimensions populated;
      //            this is when fit-to-window math is safe to run.
      // The previous code only waited on Phase 1, which raced with the decode
      // and caused mammography zoom to be applied against zero dimensions
      // (Zoom: 0.01x / clipped / undersized viewports on first load).
      const renderedElements = new Set<HTMLElement>();
      let allPanesRendered = false;

      const tryRunCommand = () => {
        if (allPanesRendered) return;
        if (renderedElements.size >= numPanes) {
          allPanesRendered = true;
          commandsManager.run(...command);
        }
      };

      const hasValidDimensions = (viewport: unknown): boolean => {
        if (!(viewport instanceof StackViewport)) return false;
        const dims = viewport.getImageData()?.dimensions;
        return Array.isArray(dims) && dims[0] > 0 && dims[1] > 0;
      };

      const { unsubscribe } = cornerstoneViewportService.subscribe(EVENT, evt => {
        // Event payload from CornerstoneViewportService._broadcastEvent is
        // `{ viewportData, viewportId }` at the top level (see service line 1028).
        const viewportId = evt?.viewportId;
        if (!viewportId) return;
        const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
        const element = viewport?.element as HTMLElement | undefined;
        if (!element || renderedElements.has(element)) return;

        // Fast path: if pixels already decoded by the time VIEWPORT_DATA_CHANGED
        // arrives (cached image, or synchronous-decode codec), count immediately.
        if (hasValidDimensions(viewport)) {
          renderedElements.add(element);
          tryRunCommand();
          if (allPanesRendered) unsubscribe(EVENT);
          return;
        }

        // Slow path: wait for IMAGE_RENDERED on this viewport's element.
        const onRendered = () => {
          if (!hasValidDimensions(viewport)) return;
          element.removeEventListener(CoreEnums.Events.IMAGE_RENDERED, onRendered);
          renderedElements.add(element);
          tryRunCommand();
          if (allPanesRendered) unsubscribe(EVENT);
        };
        element.addEventListener(CoreEnums.Events.IMAGE_RENDERED, onRendered);
      });
    },

    setViewportPreset: ({ viewportId, preset }) => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
      if (!viewport) {
        return;
      }
      viewport.setProperties({
        preset,
      });
      viewport.render();
    },

    /**
     * Sets the volume quality for a given viewport.
     * @param {string} viewportId - The ID of the viewport to set the volume quality.
     * @param {number} volumeQuality - The desired quality level of the volume rendering.
     */

    setVolumeRenderingQulaity: ({ viewportId, volumeQuality }) => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
      const { actor } = viewport.getActors()[0];
      const mapper = actor.getMapper();
      const image = mapper.getInputData();
      const dims = image.getDimensions();
      const spacing = image.getSpacing();
      const spatialDiagonal = vec3.length(
        vec3.fromValues(dims[0] * spacing[0], dims[1] * spacing[1], dims[2] * spacing[2])
      );

      let sampleDistance = spacing.reduce((a, b) => a + b) / 3.0;
      sampleDistance /= volumeQuality > 1 ? 0.5 * volumeQuality ** 2 : 1.0;
      const samplesPerRay = spatialDiagonal / sampleDistance + 1;
      mapper.setMaximumSamplesPerRay(samplesPerRay);
      mapper.setSampleDistance(sampleDistance);
      viewport.render();
    },

    /**
     * Shifts opacity points for a given viewport id.
     * @param {string} viewportId - The ID of the viewport to set the mapping range.
     * @param {number} shift - The shift value to shift the points by.
     */
    shiftVolumeOpacityPoints: ({ viewportId, shift }) => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
      const { actor } = viewport.getActors()[0];
      const ofun = actor.getProperty().getScalarOpacity(0);

      const opacityPointValues = []; // Array to hold values
      // Gather Existing Values
      const size = ofun.getSize();
      for (let pointIdx = 0; pointIdx < size; pointIdx++) {
        const opacityPointValue = [0, 0, 0, 0];
        ofun.getNodeValue(pointIdx, opacityPointValue);
        // opacityPointValue now holds [xLocation, opacity, midpoint, sharpness]
        opacityPointValues.push(opacityPointValue);
      }
      // Add offset
      opacityPointValues.forEach(opacityPointValue => {
        opacityPointValue[0] += shift; // Change the location value
      });
      // Set new values
      ofun.removeAllPoints();
      opacityPointValues.forEach(opacityPointValue => {
        ofun.addPoint(...opacityPointValue);
      });
      viewport.render();
    },

    /**
     * Sets the volume lighting settings for a given viewport.
     * @param {string} viewportId - The ID of the viewport to set the lighting settings.
     * @param {Object} options - The lighting settings to be set.
     * @param {boolean} options.shade - The shade setting for the lighting.
     * @param {number} options.ambient - The ambient setting for the lighting.
     * @param {number} options.diffuse - The diffuse setting for the lighting.
     * @param {number} options.specular - The specular setting for the lighting.
     **/

    setVolumeLighting: ({ viewportId, options }) => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
      const { actor } = viewport.getActors()[0];
      const property = actor.getProperty();

      if (options.shade !== undefined) {
        property.setShade(options.shade);
      }

      if (options.ambient !== undefined) {
        property.setAmbient(options.ambient);
      }

      if (options.diffuse !== undefined) {
        property.setDiffuse(options.diffuse);
      }

      if (options.specular !== undefined) {
        property.setSpecular(options.specular);
      }

      viewport.render();
    },
    resetCrosshairs: ({ viewportId }) => {
      const crosshairInstances = [];

      const getCrosshairInstances = toolGroupId => {
        const toolGroup = toolGroupService.getToolGroup(toolGroupId);
        crosshairInstances.push(toolGroup.getToolInstance('Crosshairs'));
      };

      if (!viewportId) {
        const toolGroupIds = toolGroupService.getToolGroupIds();
        toolGroupIds.forEach(getCrosshairInstances);
      } else {
        const toolGroup = toolGroupService.getToolGroupForViewport(viewportId);
        getCrosshairInstances(toolGroup.id);
      }

      crosshairInstances.forEach(ins => {
        ins?.computeToolCenter();
      });
    },
    /**
     * Creates a labelmap for the active viewport
     *
     * The created labelmap will be registered as a display set and also added
     * as a segmentation representation to the viewport.
     */
    createLabelmapForViewport: async ({ viewportId, options = {} }) => {
      const { viewportGridService, displaySetService, segmentationService } =
        servicesManager.services;
      const { viewports } = viewportGridService.getState();
      const targetViewportId = viewportId;

      const viewport = viewports.get(targetViewportId);

      // Todo: add support for multiple display sets
      const displaySetInstanceUID =
        options.displaySetInstanceUID || viewport.displaySetInstanceUIDs[0];

      const segs = segmentationService.getSegmentations();

      const label = options.label || `Segmentation ${segs.length + 1}`;
      const segmentationId = options.segmentationId || `${csUtils.uuidv4()}`;

      const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);

      // This will create the segmentation and register it as a display set
      const generatedSegmentationId = await segmentationService.createLabelmapForDisplaySet(
        displaySet,
        {
          label,
          segmentationId,
          segments: options.createInitialSegment
            ? {
                1: {
                  label: `${i18n.t('Segment')} 1`,
                  active: true,
                },
              }
            : {},
        }
      );

      // Also add the segmentation representation to the viewport
      await segmentationService.addSegmentationRepresentation(viewportId, {
        segmentationId,
        type: Enums.SegmentationRepresentations.Labelmap,
      });

      return generatedSegmentationId;
    },

    /**
     * Sets the active segmentation for a viewport
     * @param props.segmentationId - The ID of the segmentation to set as active
     */
    setActiveSegmentation: ({ segmentationId }) => {
      const { viewportGridService, segmentationService } = servicesManager.services;
      segmentationService.setActiveSegmentation(
        viewportGridService.getActiveViewportId(),
        segmentationId
      );
    },

    /**
     * Adds a new segment to a segmentation
     * @param props.segmentationId - The ID of the segmentation to add the segment to
     */
    addSegmentCommand: ({ segmentationId }) => {
      const { segmentationService } = servicesManager.services;
      segmentationService.addSegment(segmentationId);
    },

    /**
     * Sets the active segment and jumps to its center
     * @param props.segmentationId - The ID of the segmentation
     * @param props.segmentIndex - The index of the segment to activate
     */
    setActiveSegmentAndCenterCommand: ({ segmentationId, segmentIndex }) => {
      const { segmentationService, viewportGridService } = servicesManager.services;
      // set both active segmentation and active segment
      segmentationService.setActiveSegmentation(
        viewportGridService.getActiveViewportId(),
        segmentationId
      );
      segmentationService.setActiveSegment(segmentationId, segmentIndex);
      segmentationService.jumpToSegmentCenter(segmentationId, segmentIndex);
    },

    /**
     * Toggles the visibility of a segment
     * @param props.segmentationId - The ID of the segmentation
     * @param props.segmentIndex - The index of the segment
     * @param props.type - The type of visibility to toggle
     */
    toggleSegmentVisibilityCommand: ({ segmentationId, segmentIndex, type }) => {
      const { segmentationService, viewportGridService } = servicesManager.services;
      segmentationService.toggleSegmentVisibility(
        viewportGridService.getActiveViewportId(),
        segmentationId,
        segmentIndex,
        type
      );
    },

    /**
     * Toggles the lock state of a segment
     * @param props.segmentationId - The ID of the segmentation
     * @param props.segmentIndex - The index of the segment
     */
    toggleSegmentLockCommand: ({ segmentationId, segmentIndex }) => {
      const { segmentationService } = servicesManager.services;
      segmentationService.toggleSegmentLocked(segmentationId, segmentIndex);
    },

    /**
     * Toggles the visibility of a segmentation representation
     * @param props.segmentationId - The ID of the segmentation
     * @param props.type - The type of representation
     */
    toggleSegmentationVisibilityCommand: ({ segmentationId, type }) => {
      const { segmentationService, viewportGridService } = servicesManager.services;
      segmentationService.toggleSegmentationRepresentationVisibility(
        viewportGridService.getActiveViewportId(),
        { segmentationId, type }
      );
    },

    /**
     * Downloads a segmentation
     * @param props.segmentationId - The ID of the segmentation to download
     */
    downloadSegmentationCommand: ({ segmentationId }) => {
      const { segmentationService } = servicesManager.services;
      segmentationService.downloadSegmentation(segmentationId);
    },

    /**
     * Stores a segmentation and shows it in the viewport
     * @param props.segmentationId - The ID of the segmentation to store
     */
    storeSegmentationCommand: async ({ segmentationId }) => {
      const { segmentationService, viewportGridService } = servicesManager.services;

      const displaySetInstanceUIDs = await createReportAsync({
        servicesManager,
        getReport: () =>
          commandsManager.runCommand('storeSegmentation', {
            segmentationId,
          }),
        reportType: 'Segmentation',
      });

      if (displaySetInstanceUIDs) {
        segmentationService.remove(segmentationId);
        viewportGridService.setDisplaySetsForViewport({
          viewportId: viewportGridService.getActiveViewportId(),
          displaySetInstanceUIDs,
        });
      }
    },

    /**
     * Downloads a segmentation as RTSS
     * @param props.segmentationId - The ID of the segmentation
     */
    downloadRTSSCommand: ({ segmentationId }) => {
      const { segmentationService } = servicesManager.services;
      segmentationService.downloadRTSS(segmentationId);
    },

    /**
     * Sets the style for a segmentation
     * @param props.segmentationId - The ID of the segmentation
     * @param props.type - The type of style
     * @param props.key - The style key to set
     * @param props.value - The style value
     */
    setSegmentationStyleCommand: ({ type, key, value }) => {
      const { segmentationService } = servicesManager.services;
      segmentationService.setStyle({ type }, { [key]: value });
    },

    /**
     * Deletes a segment from a segmentation
     * @param props.segmentationId - The ID of the segmentation
     * @param props.segmentIndex - The index of the segment to delete
     */
    deleteSegmentCommand: ({ segmentationId, segmentIndex }) => {
      const { segmentationService } = servicesManager.services;
      segmentationService.removeSegment(segmentationId, segmentIndex);
    },

    /**
     * Deletes an entire segmentation
     * @param props.segmentationId - The ID of the segmentation to delete
     */
    deleteSegmentationCommand: ({ segmentationId }) => {
      const { segmentationService } = servicesManager.services;
      segmentationService.remove(segmentationId);
    },

    /**
     * Removes a segmentation from the viewport
     * @param props.segmentationId - The ID of the segmentation to remove
     */
    removeSegmentationFromViewportCommand: ({ segmentationId }) => {
      const { segmentationService, viewportGridService } = servicesManager.services;
      segmentationService.removeSegmentationRepresentations(
        viewportGridService.getActiveViewportId(),
        { segmentationId }
      );
    },

    /**
     * Toggles rendering of inactive segmentations
     */
    toggleRenderInactiveSegmentationsCommand: () => {
      const { segmentationService, viewportGridService } = servicesManager.services;
      const viewportId = viewportGridService.getActiveViewportId();
      const renderInactive = segmentationService.getRenderInactiveSegmentations(viewportId);
      segmentationService.setRenderInactiveSegmentations(viewportId, !renderInactive);
    },

    /**
     * Sets the fill alpha value for a segmentation type
     * @param props.type - The type of segmentation
     * @param props.value - The alpha value to set
     */
    setFillAlphaCommand: ({ type, value }) => {
      const { segmentationService } = servicesManager.services;
      segmentationService.setStyle({ type }, { fillAlpha: value });
    },

    /**
     * Sets the outline width for a segmentation type
     * @param props.type - The type of segmentation
     * @param props.value - The width value to set
     */
    setOutlineWidthCommand: ({ type, value }) => {
      const { segmentationService } = servicesManager.services;
      segmentationService.setStyle({ type }, { outlineWidth: value });
    },

    /**
     * Sets whether to render fill for a segmentation type
     * @param props.type - The type of segmentation
     * @param props.value - Whether to render fill
     */
    setRenderFillCommand: ({ type, value }) => {
      const { segmentationService } = servicesManager.services;
      segmentationService.setStyle({ type }, { renderFill: value });
    },

    /**
     * Sets whether to render outline for a segmentation type
     * @param props.type - The type of segmentation
     * @param props.value - Whether to render outline
     */
    setRenderOutlineCommand: ({ type, value }) => {
      const { segmentationService } = servicesManager.services;
      segmentationService.setStyle({ type }, { renderOutline: value });
    },

    /**
     * Sets the fill alpha for inactive segmentations
     * @param props.type - The type of segmentation
     * @param props.value - The alpha value to set
     */
    setFillAlphaInactiveCommand: ({ type, value }) => {
      const { segmentationService } = servicesManager.services;
      segmentationService.setStyle({ type }, { fillAlphaInactive: value });
    },

    editSegmentLabel: async ({ segmentationId, segmentIndex }) => {
      const { segmentationService, uiDialogService } = servicesManager.services;
      const segmentation = segmentationService.getSegmentation(segmentationId);

      if (!segmentation) {
        return;
      }

      const segment = segmentation.segments[segmentIndex];

      callInputDialog({
        uiDialogService,
        title: 'Edit Segment Label',
        placeholder: 'Enter new label',
        defaultValue: segment.label,
      }).then(label => {
        segmentationService.setSegmentLabel(segmentationId, segmentIndex, label);
      });
    },

    editSegmentationLabel: ({ segmentationId }) => {
      const { segmentationService, uiDialogService } = servicesManager.services;
      const segmentation = segmentationService.getSegmentation(segmentationId);

      if (!segmentation) {
        return;
      }

      const { label } = segmentation;

      callInputDialog({
        uiDialogService,
        title: 'Edit Segmentation Label',
        placeholder: 'Enter new label',
        defaultValue: label,
      }).then(label => {
        segmentationService.addOrUpdateSegmentation({ segmentationId, label });
      });
    },

    editSegmentColor: ({ segmentationId, segmentIndex }) => {
      const { segmentationService, uiDialogService, viewportGridService } =
        servicesManager.services;
      const viewportId = viewportGridService.getActiveViewportId();
      const color = segmentationService.getSegmentColor(viewportId, segmentationId, segmentIndex);

      const rgbaColor = {
        r: color[0],
        g: color[1],
        b: color[2],
        a: color[3] / 255.0,
      };

      uiDialogService.show({
        content: colorPickerDialog,
        title: 'Segment Color',
        contentProps: {
          value: rgbaColor,
          onSave: newRgbaColor => {
            const color = [newRgbaColor.r, newRgbaColor.g, newRgbaColor.b, newRgbaColor.a * 255.0];
            segmentationService.setSegmentColor(viewportId, segmentationId, segmentIndex, color);
          },
        },
      });
    },

    getRenderInactiveSegmentations: () => {
      const { segmentationService, viewportGridService } = servicesManager.services;
      return segmentationService.getRenderInactiveSegmentations(
        viewportGridService.getActiveViewportId()
      );
    },

    deleteActiveAnnotation: () => {
      // Route through removeMeasurement so backend DELETE fires (right-click
      // "Delete Measurement" goes through the same path). Without this the
      // annotation comes back from the DB on next mount.
      //
      // Cornerstone's selection API can be empty even when the user clearly
      // has an annotation highlighted (it only populates on certain
      // interactions). Fall back to MeasurementService.isSelected, which
      // initMeasurementService keeps in sync via ANNOTATION_SELECTION_CHANGE.
      let uids: string[] = cornerstoneTools.annotation.selection.getAnnotationsSelected() || [];
      if (!uids.length) {
        uids = measurementService
          .getMeasurements()
          .filter((m: any) => m.isSelected)
          .map((m: any) => m.uid);
      }
      uids.forEach(uid => {
        commandsManager.run('removeMeasurement', { uid });
      });
    },
    setDisplaySetsForViewports: ({ viewportsToUpdate }) => {
      const { cineService, viewportGridService } = servicesManager.services;
      // Stopping the cine of modified viewports before changing the viewports to
      // avoid inconsistent state and lost references
      viewportsToUpdate.forEach(viewport => {
        const state = cineService.getState();
        const currentCineState = state.cines?.[viewport.viewportId];
        cineService.setCine({
          id: viewport.viewportId,
          frameRate: currentCineState?.frameRate ?? state.default?.frameRate ?? 24,
          isPlaying: false,
        });
      });

      viewportGridService.setDisplaySetsForViewports(viewportsToUpdate);
    },
    undo: () => {
      DefaultHistoryMemo.undo();
    },
    redo: () => {
      DefaultHistoryMemo.redo();
    },
    toggleSegmentPreviewEdit: ({ toggle }) => {
      let labelmapTools = getLabelmapTools({ toolGroupService });
      labelmapTools = labelmapTools.filter(tool => !tool.toolName.includes('Eraser'));
      labelmapTools.forEach(tool => {
        tool.configuration = {
          ...tool.configuration,
          preview: {
            ...tool.configuration.preview,
            enabled: toggle,
          },
        };
      });
    },
    toggleSegmentSelect: ({ toggle }) => {
      const toolGroupIds = toolGroupService.getToolGroupIds();
      toolGroupIds.forEach(toolGroupId => {
        const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
        if (toggle) {
          toolGroup.setToolActive(cornerstoneTools.SegmentSelectTool.toolName);
        } else {
          toolGroup.setToolDisabled(cornerstoneTools.SegmentSelectTool.toolName);
        }
      });
    },
    toggleUseCenterSegmentIndex: ({ toggle }) => {
      let labelmapTools = getLabelmapTools({ toolGroupService });
      labelmapTools = labelmapTools.filter(tool => !tool.toolName.includes('Eraser'));
      labelmapTools.forEach(tool => {
        tool.configuration = {
          ...tool.configuration,
          useCenterSegmentIndex: toggle,
        };
      });
    },
    _handlePreviewAction: action => {
      const { viewport } = _getActiveViewportEnabledElement();
      const previewTools = getPreviewTools({ toolGroupService });

      previewTools.forEach(tool => {
        try {
          tool[`${action}Preview`]();
        } catch (error) {
          console.debug('Error accepting preview for tool', tool.toolName);
        }
      });

      if (segmentAI.enabled) {
        segmentAI[`${action}Preview`](viewport.element);
      }
    },
    acceptPreview: () => {
      actions._handlePreviewAction('accept');
    },
    rejectPreview: () => {
      actions._handlePreviewAction('reject');
    },
    clearMarkersForMarkerLabelmap: () => {
      const { viewport } = _getActiveViewportEnabledElement();
      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroupForViewport(viewport.id);
      const toolInstance = toolGroup.getToolInstance('MarkerLabelmap');

      if (!toolInstance) {
        return;
      }

      toolInstance.clearMarkers(viewport);
    },
    interpolateScrollForMarkerLabelmap: () => {
      const { viewport } = _getActiveViewportEnabledElement();
      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroupForViewport(viewport.id);
      const toolInstance = toolGroup.getToolInstance('MarkerLabelmap');

      if (!toolInstance) {
        return;
      }

      toolInstance.interpolateScroll(viewport, 1);
    },
    toggleLabelmapAssist: async () => {
      const { viewport } = _getActiveViewportEnabledElement();
      const newState = !segmentAI.enabled;
      segmentAI.enabled = newState;

      if (!segmentAIEnabled) {
        await segmentAI.initModel();
        segmentAIEnabled = true;
      }

      // set the brush tool to active
      const toolGroupIds = toolGroupService.getToolGroupIds();
      if (newState) {
        actions.setToolActiveToolbar({
          toolName: 'CircularBrushForAutoSegmentAI',
          toolGroupIds: toolGroupIds,
        });
      } else {
        toolGroupIds.forEach(toolGroupId => {
          const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId);
          toolGroup.setToolPassive('CircularBrushForAutoSegmentAI');
        });
      }

      if (segmentAI.enabled) {
        segmentAI.initViewport(viewport);
      }
    },
    setBrushSize: ({ value, toolNames }) => {
      const brushSize = Number(value);

      toolGroupService.getToolGroupIds()?.forEach(toolGroupId => {
        if (toolNames?.length === 0) {
          segmentationUtils.setBrushSizeForToolGroup(toolGroupId, brushSize);
        } else {
          toolNames?.forEach(toolName => {
            segmentationUtils.setBrushSizeForToolGroup(toolGroupId, brushSize, toolName);
          });
        }
      });
    },
    setThresholdRange: ({
      value,
      toolNames = [
        'ThresholdCircularBrush',
        'ThresholdSphereBrush',
        'ThresholdCircularBrushDynamic',
        'ThresholdSphereBrushDynamic',
      ],
    }) => {
      const toolGroupIds = toolGroupService.getToolGroupIds();
      if (!toolGroupIds?.length) {
        return;
      }

      for (const toolGroupId of toolGroupIds) {
        const toolGroup = toolGroupService.getToolGroup(toolGroupId);
        toolNames?.forEach(toolName => {
          toolGroup.setToolConfiguration(toolName, {
            threshold: {
              range: value,
            },
          });
        });
      }
    },
    increaseBrushSize: () => {
      const toolGroupIds = toolGroupService.getToolGroupIds();
      if (!toolGroupIds?.length) {
        return;
      }

      for (const toolGroupId of toolGroupIds) {
        const brushSize = segmentationUtils.getBrushSizeForToolGroup(toolGroupId);
        segmentationUtils.setBrushSizeForToolGroup(toolGroupId, brushSize + 3);
      }
    },
    decreaseBrushSize: () => {
      const toolGroupIds = toolGroupService.getToolGroupIds();
      if (!toolGroupIds?.length) {
        return;
      }

      for (const toolGroupId of toolGroupIds) {
        const brushSize = segmentationUtils.getBrushSizeForToolGroup(toolGroupId);
        segmentationUtils.setBrushSizeForToolGroup(toolGroupId, brushSize - 3);
      }
    },
    addNewSegment: () => {
      const { segmentationService } = servicesManager.services;
      const { activeViewportId } = viewportGridService.getState();
      const activeSegmentation = segmentationService.getActiveSegmentation(activeViewportId);
      segmentationService.addSegment(activeSegmentation.segmentationId);
    },
    loadSegmentationDisplaySetsForViewport: ({ viewportId, displaySetInstanceUIDs }) => {
      const updatedViewports = getUpdatedViewportsForSegmentation({
        viewportId,
        servicesManager,
        displaySetInstanceUIDs,
      });

      actions.setDisplaySetsForViewports({
        viewportsToUpdate: updatedViewports.map(viewport => ({
          viewportId: viewport.viewportId,
          displaySetInstanceUIDs: viewport.displaySetInstanceUIDs,
        })),
      });
    },
    setViewportOrientation: ({ viewportId, orientation }) => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

      if (!viewport || viewport.type !== CoreEnums.ViewportType.ORTHOGRAPHIC) {
        console.warn('Orientation can only be set on volume viewports');
        return;
      }

      // Get display sets for this viewport to verify at least one is reconstructable
      const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);
      const displaySets = displaySetUIDs.map(uid => displaySetService.getDisplaySetByUID(uid));

      if (!displaySets.some(ds => ds.isReconstructable)) {
        console.warn('Cannot change orientation: No reconstructable display sets in viewport');
        return;
      }

      viewport.setOrientation(orientation);
      viewport.render();

      // update the orientation in the viewport info
      const viewportInfo = cornerstoneViewportService.getViewportInfo(viewportId);
      viewportInfo.setOrientation(orientation);
    },
    triggerCreateAnnotationMemo: ({
      annotation,
      FrameOfReferenceUID,
      options,
    }: {
      annotation: ToolTypes.Annotation;
      FrameOfReferenceUID: string;
      options: { newAnnotation?: boolean; deleting?: boolean };
    }): void => {
      const { newAnnotation, deleting } = options;
      const renderingEngines = getRenderingEngines();
      const viewports = renderingEngines.flatMap(re => re.getViewports());
      const validViewport = viewports.find(
        vp => vp.getFrameOfReferenceUID() === FrameOfReferenceUID
      );

      if (!validViewport) {
        return;
      }

      cornerstoneTools.AnnotationTool.createAnnotationMemo(validViewport.element, annotation, {
        newAnnotation,
        deleting,
      });
    },
    // Show the question modal for Circle ROI - pass measurementUid
    showCircleROIQuestionModal: async ({ uid }) => {
      const measurement = measurementService.getMeasurement(uid);
      if (measurement && measurement.toolName === 'CircleROI') {
        // Show the question modal for Circle ROI in diagnostic mode - pass measurementUid
        measurementService._broadcastEvent(measurementService.EVENTS.SHOW_MEASUREMENT_MODAL, {
          measurementUid: uid,
          measurement: measurement,
        });
      }
    },
    // Show the recall modal for Circle ROI in screening mode - pass measurementUid
    showRecallModal: async ({ uid }) => {
      const measurement = measurementService.getMeasurement(uid);
      if (measurement && measurement.toolName === 'CircleROI') {
        // Show the recall modal for Circle ROI in screening mode
        measurementService._broadcastEvent(measurementService.EVENTS.SHOW_RECALL_MODAL, {
          measurementUid: uid,
          measurement: measurement,
        });
      }
    },
  };

  const definitions = {
    // The command here is to show the viewer context menu, as being the
    // context menu
    showCornerstoneContextMenu: {
      commandFn: actions.showCornerstoneContextMenu,
      options: {
        menuCustomizationId: 'measurementsContextMenu',
        commands: [
          {
            commandName: 'showContextMenu',
          },
        ],
      },
    },

    getNearbyToolData: {
      commandFn: actions.getNearbyToolData,
    },
    getNearbyAnnotation: {
      commandFn: actions.getNearbyAnnotation,
      storeContexts: [],
      options: {},
    },
    toggleViewportColorbar: {
      commandFn: actions.toggleViewportColorbar,
    },
    setMeasurementLabel: {
      commandFn: actions.setMeasurementLabel,
    },
    renameMeasurement: {
      commandFn: actions.renameMeasurement,
    },
    changeMeasurementColor: {
      commandFn: actions.changeMeasurementColor,
    },
    updateMeasurement: {
      commandFn: actions.updateMeasurement,
    },
    jumpToMeasurement: {
      commandFn: actions.jumpToMeasurement,
    },
    removeMeasurement: {
      commandFn: actions.removeMeasurement,
    },
    toggleLockMeasurement: {
      commandFn: actions.toggleLockMeasurement,
    },
    toggleVisibilityMeasurement: {
      commandFn: actions.toggleVisibilityMeasurement,
    },
    downloadCSVMeasurementsReport: {
      commandFn: actions.downloadCSVMeasurementsReport,
    },
    setViewportWindowLevel: {
      commandFn: actions.setViewportWindowLevel,
    },
    setWindowLevel: {
      commandFn: actions.setWindowLevel,
    },
    setWindowLevelPreset: {
      commandFn: actions.setWindowLevelPreset,
    },
    setToolActive: {
      commandFn: actions.setToolActive,
    },
    setToolActiveToolbar: {
      commandFn: actions.setToolActiveToolbar,
    },
    setToolEnabled: {
      commandFn: actions.setToolEnabled,
    },
    rotateViewportCW: {
      commandFn: actions.rotateViewport,
      options: { rotation: 90 },
    },
    rotateViewportCCW: {
      commandFn: actions.rotateViewport,
      options: { rotation: -90 },
    },
    incrementActiveViewport: {
      commandFn: actions.changeActiveViewport,
    },
    decrementActiveViewport: {
      commandFn: actions.changeActiveViewport,
      options: { direction: -1 },
    },
    flipViewportHorizontal: {
      commandFn: actions.flipViewportHorizontal,
    },
    flipViewportVertical: {
      commandFn: actions.flipViewportVertical,
    },
    invertViewport: {
      commandFn: actions.invertViewport,
    },
    resetViewport: {
      commandFn: actions.resetViewport,
    },
    resetView: {
      commandFn: actions.resetView,
    },
    clearView: {
      commandFn: actions.clearView,
    },
    scaleUpViewport: {
      commandFn: actions.scaleViewport,
      options: { direction: 1 },
    },
    scaleDownViewport: {
      commandFn: actions.scaleViewport,
      options: { direction: -1 },
    },
    fitViewportToWindow: {
      commandFn: actions.scaleViewport,
      options: { direction: 0 },
    },
    nextImage: {
      commandFn: actions.scroll,
      options: { direction: 1 },
    },
    previousImage: {
      commandFn: actions.scroll,
      options: { direction: -1 },
    },
    firstImage: {
      commandFn: actions.jumpToImage,
      options: { imageIndex: 0 },
    },
    lastImage: {
      commandFn: actions.jumpToImage,
      options: { imageIndex: -1 },
    },
    jumpToImage: {
      commandFn: actions.jumpToImage,
    },
    showDownloadViewportModal: {
      commandFn: actions.showDownloadViewportModal,
    },
    toggleCine: {
      commandFn: actions.toggleCine,
    },
    arrowTextCallback: {
      commandFn: actions.arrowTextCallback,
    },
    setViewportActive: {
      commandFn: actions.setViewportActive,
    },
    setViewportColormap: {
      commandFn: actions.setViewportColormap,
    },
    setViewportForToolConfiguration: {
      commandFn: actions.setViewportForToolConfiguration,
    },
    storePresentation: {
      commandFn: actions.storePresentation,
    },
    attachProtocolViewportDataListener: {
      commandFn: actions.attachProtocolViewportDataListener,
    },
    setViewportPreset: {
      commandFn: actions.setViewportPreset,
    },
    setVolumeRenderingQulaity: {
      commandFn: actions.setVolumeRenderingQulaity,
    },
    shiftVolumeOpacityPoints: {
      commandFn: actions.shiftVolumeOpacityPoints,
    },
    setVolumeLighting: {
      commandFn: actions.setVolumeLighting,
    },
    resetCrosshairs: {
      commandFn: actions.resetCrosshairs,
    },
    toggleSynchronizer: {
      commandFn: actions.toggleSynchronizer,
    },
    updateVolumeData: {
      commandFn: actions.updateVolumeData,
    },
    toggleEnabledDisabledToolbar: {
      commandFn: actions.toggleEnabledDisabledToolbar,
    },
    toggleActiveDisabledToolbar: {
      commandFn: actions.toggleActiveDisabledToolbar,
    },
    updateStoredPositionPresentation: {
      commandFn: actions.updateStoredPositionPresentation,
    },
    updateStoredSegmentationPresentation: {
      commandFn: actions.updateStoredSegmentationPresentation,
    },
    createLabelmapForViewport: {
      commandFn: actions.createLabelmapForViewport,
    },
    setActiveSegmentation: {
      commandFn: actions.setActiveSegmentation,
    },
    addSegment: {
      commandFn: actions.addSegmentCommand,
    },
    setActiveSegmentAndCenter: {
      commandFn: actions.setActiveSegmentAndCenterCommand,
    },
    toggleSegmentVisibility: {
      commandFn: actions.toggleSegmentVisibilityCommand,
    },
    toggleSegmentLock: {
      commandFn: actions.toggleSegmentLockCommand,
    },
    toggleSegmentationVisibility: {
      commandFn: actions.toggleSegmentationVisibilityCommand,
    },
    downloadSegmentation: {
      commandFn: actions.downloadSegmentationCommand,
    },
    storeSegmentation: {
      commandFn: actions.storeSegmentationCommand,
    },
    downloadRTSS: {
      commandFn: actions.downloadRTSSCommand,
    },
    setSegmentationStyle: {
      commandFn: actions.setSegmentationStyleCommand,
    },
    deleteSegment: {
      commandFn: actions.deleteSegmentCommand,
    },
    deleteSegmentation: {
      commandFn: actions.deleteSegmentationCommand,
    },
    removeSegmentationFromViewport: {
      commandFn: actions.removeSegmentationFromViewportCommand,
    },
    toggleRenderInactiveSegmentations: {
      commandFn: actions.toggleRenderInactiveSegmentationsCommand,
    },
    setFillAlpha: {
      commandFn: actions.setFillAlphaCommand,
    },
    setOutlineWidth: {
      commandFn: actions.setOutlineWidthCommand,
    },
    setRenderFill: {
      commandFn: actions.setRenderFillCommand,
    },
    setRenderOutline: {
      commandFn: actions.setRenderOutlineCommand,
    },
    setFillAlphaInactive: {
      commandFn: actions.setFillAlphaInactiveCommand,
    },
    editSegmentLabel: {
      commandFn: actions.editSegmentLabel,
    },
    editSegmentationLabel: {
      commandFn: actions.editSegmentationLabel,
    },
    editSegmentColor: {
      commandFn: actions.editSegmentColor,
    },
    getRenderInactiveSegmentations: {
      commandFn: actions.getRenderInactiveSegmentations,
    },
    deleteActiveAnnotation: {
      commandFn: actions.deleteActiveAnnotation,
    },
    setMammographyZoomConditional: actions.setMammographyZoomConditional,
    setDisplaySetsForViewports: actions.setDisplaySetsForViewports,
    undo: actions.undo,
    redo: actions.redo,
    interpolateLabelmap: actions.interpolateLabelmap,
    runSegmentBidirectional: actions.runSegmentBidirectional,
    downloadCSVSegmentationReport: actions.downloadCSVSegmentationReport,
    toggleSegmentPreviewEdit: actions.toggleSegmentPreviewEdit,
    toggleSegmentSelect: actions.toggleSegmentSelect,
    acceptPreview: actions.acceptPreview,
    rejectPreview: actions.rejectPreview,
    toggleUseCenterSegmentIndex: actions.toggleUseCenterSegmentIndex,
    toggleLabelmapAssist: actions.toggleLabelmapAssist,
    interpolateScrollForMarkerLabelmap: actions.interpolateScrollForMarkerLabelmap,
    clearMarkersForMarkerLabelmap: actions.clearMarkersForMarkerLabelmap,
    setBrushSize: actions.setBrushSize,
    setThresholdRange: actions.setThresholdRange,
    increaseBrushSize: actions.increaseBrushSize,
    decreaseBrushSize: actions.decreaseBrushSize,
    addNewSegment: actions.addNewSegment,
    loadSegmentationDisplaySetsForViewport: actions.loadSegmentationDisplaySetsForViewport,
    setViewportOrientation: actions.setViewportOrientation,
    hydrateSecondaryDisplaySet: actions.hydrateSecondaryDisplaySet,
    getVolumeIdForDisplaySet: actions.getVolumeIdForDisplaySet,
    triggerCreateAnnotationMemo: actions.triggerCreateAnnotationMemo,
    showCircleROIQuestionModal: actions.showCircleROIQuestionModal,
    showRecallModal: actions.showRecallModal,
  };

  return {
    actions,
    definitions,
    defaultContext: 'CORNERSTONE',
  };
}

export default commandsModule;
