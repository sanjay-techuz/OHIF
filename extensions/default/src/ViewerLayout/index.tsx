import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Enums as CoreEnums } from '@cornerstonejs/core';

import { useCustomParams } from '@ohif/app/src/hooks/useCustomParams';
import {
  apiCall,
  apiService,
  buildFellowshipBody,
  buildFellowshipQuery,
  DicomMetadataStore,
  encrypt,
  HangingProtocolService,
  HTTP_STATUS,
  Types,
} from '@ohif/core';
import {
  ACRDisplay,
  Button,
  CaseHistoryModal,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  getModalityConfig,
  getQuestionModalConfig,
  IconPresentationProvider,
  Icons,
  InstructionModal,
  LexaReportingPanel,
  Onboarding,
  OverlayFieldsModal,
  QuestionAnswerModal,
  RecallModal,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ToolButton,
  useModal,
} from '@ohif/ui-next';
import { useAppConfig } from '@state';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import SidePanelWithServices from '../Components/SidePanelWithServices';
import { useUIStateStore } from '../stores/useUIStateStore';
import { useOverlayFieldsStore } from '../stores/useOverlayFieldsStore';
import useResizablePanels from './ResizablePanelsHook';
import ViewerHeader from './ViewerHeader';

const resizableHandleClassName = 'mt-[1px] bg-black';

function ViewerLayout({
  // From Extension Module Params
  extensionManager,
  servicesManager,
  hotkeysManager,
  commandsManager,
  // From Modes
  viewports,
  ViewportGridComp,
  leftPanelClosed = false,
  rightPanelClosed = false,
  leftPanelResizable = false,
  rightPanelResizable = false,
}: withAppTypes): React.FunctionComponent {
  const [appConfig] = useAppConfig();

  const {
    panelService,
    hangingProtocolService,
    customizationService,
    displaySetService,
    cornerstoneViewportService,
  } = servicesManager.services;
  // Use the app config flag as originally intended; do not force a loader on.
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(appConfig.showLoadingIndicator);

  const hasPanels = useCallback(
    (side): boolean => !!panelService.getPanels(side).length,
    [panelService]
  );

  const [hasRightPanels, setHasRightPanels] = useState(hasPanels('right'));
  const [hasLeftPanels, setHasLeftPanels] = useState(hasPanels('left'));
  const [leftPanelClosedState, setLeftPanelClosed] = useState(true);
  const [rightPanelClosedState, setRightPanelClosed] = useState(true);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [currentMeasurementUid, setCurrentMeasurementUid] = useState<string | null>(null);
  const modalitySlug = useUIStateStore(state => state.uiState.modalitySlug as string | null);
  const subSpecialitySlug = useUIStateStore(
    state => state.uiState.subSpecialitySlug as string | null
  );
  const acrConfig = useMemo(
    () => getModalityConfig(subSpecialitySlug, modalitySlug),
    [subSpecialitySlug, modalitySlug]
  );
  const [studentAcrValues, setStudentAcrValues] = useState(acrConfig.defaultValues);
  const [facultyAcrValues, setFacultyAcrValues] = useState(acrConfig.defaultValues);
  // Bump this to re-run the annotation/ACR backend fetch (see the
  // `getToolMapping` / `getAcrValues` useEffect below). The toolbar
  // Reset command writes to `window.__reloadSavedAnnotations` (registered
  // in a side-effect below) so it can clear all in-memory annotations
  // and then ask us to repopulate them from the DB. This mirrors the
  // "ephemeral local annotations are cleared on Reset; DB-saved ones
  // are re-fetched" behaviour the user asked for.
  const [annotationsReloadKey, setAnnotationsReloadKey] = useState(0);
  // Auto-save plumbing for studentAcrValues. The two refs together gate
  // the auto-save useEffect below so we never (a) save the initial
  // backend fetch right back to the backend, and (b) re-save values that
  // were just persisted by the ACR modal's manual Save (avoids double
  // round-trips). Both refs are updated *before* a setStudentAcrValues
  // call whenever the new value is already in-sync with the backend.
  // PatientID we've already fetched folder names for — the display-set
  // subscription below fires repeatedly, and this keeps it to one request.
  const folderNamesPatientRef = useRef<string | null>(null);
  const initialAcrLoadedRef = useRef(false);
  const lastSavedAcrRef = useRef<string | null>(null);
  const [currentFormData, setCurrentFormData] = useState<any>(null);
  const [currentAnnotationIndex, setCurrentAnnotationIndex] = useState<number>(1);
  // ViewType management
  const [currentViewType, setCurrentViewType] = useState<'diagnostic' | 'screening'>('diagnostic');
  const [showRecallModal, setShowRecallModal] = useState(false);

  // Case navigation state
  const [caseList, setCaseList] = useState([]);
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [caseListError, setCaseListError] = useState(null);
  const [moduleTitle, setModuleTitle] = useState<string>('');

  // Add state for validation modal
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showCaseHistoryModal, setShowCaseHistoryModal] = useState(false);
  const [showOverlayFieldsModal, setShowOverlayFieldsModal] = useState(false);
  const [caseHistoryText, setCaseHistoryText] = useState('');
  const [annotationData, setAnnotationData] = useState<any>(null);

  // Lexa AI reporting panel — single panel, two modes ('generate' | 'correct').
  const [lexaPanelMode, setLexaPanelMode] = useState<'generate' | 'correct' | null>(null);
  // ROI form data (one entry per annotation) for the current student/case —
  // captured from the same /annotation-measurements GET we already make on
  // mount, so the Lexa panel can compose Key Findings from real ROI answers.
  const [roiFormDataList, setRoiFormDataList] = useState<Array<Record<string, unknown> | null>>([]);
  // Patient demographics from DICOM metadata for Lexa "patient" payload.
  const [patientInfo, setPatientInfo] = useState<{ age: string; sex: string }>({
    age: '',
    sex: '',
  });

  const {
    courseId,
    moduleId,
    caseId,
    studentId,
    viewType,
    userType,
    facultyId,
    StudyInstanceUIDs,
    isPreview,
    isFellowship,
    programId,
    phaseId,
  } = useCustomParams();
  // Fellowship cases come to OHIF with `programId` instead of `courseId`.
  // Existing backend endpoints expect a value in the `:courseId` URL slot;
  // when fellowship, the backend routes by the `is_fellowship` query flag
  // so this positional value is a pass-through but must NOT be `undefined`
  // (which would render literally in the URL path).
  const urlCourseId = isFellowship ? programId : courseId;
  const isAddAnswerClicked = useUIStateStore(state => !!state.uiState.addAnswerClicked);
  const { setUIState } = useUIStateStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { show } = useModal();

  // Get viewType from URL or localStorage
  useEffect(() => {
    if (viewType) {
      setCurrentViewType(viewType);
      localStorage.setItem('ohif-viewType', viewType);
    } else {
      const storedViewType = localStorage.getItem('ohif-viewType') as 'diagnostic' | 'screening';
      if (storedViewType) {
        setCurrentViewType(storedViewType);
      }
    }
  }, []);

  const [
    leftPanelProps,
    rightPanelProps,
    resizablePanelGroupProps,
    resizableLeftPanelProps,
    resizableViewportGridPanelProps,
    resizableRightPanelProps,
    onHandleDragging,
  ] = useResizablePanels(
    leftPanelClosedState,
    setLeftPanelClosed,
    rightPanelClosedState,
    setRightPanelClosed,
    hasLeftPanels,
    hasRightPanels
  );

  // Extract onOpen and onClose from leftPanelProps
  const { onOpen: onLeftPanelOpen, onClose: onLeftPanelClose } = leftPanelProps as {
    onOpen: () => void;
    onClose: () => void;
  };

  const handleMouseEnter = () => {
    (document.activeElement as HTMLElement)?.blur();
  };

  const LoadingIndicatorProgress = customizationService.getCustomization(
    'ui.loadingIndicatorProgress'
  );

  /**
   * Set body classes (tailwindcss) that don't allow vertical
   * or horizontal overflow (no scrolling). Also guarantee window
   * is sized to our viewport.
   */
  useEffect(() => {
    document.body.classList.add('bg-black');
    document.body.classList.add('overflow-hidden');

    return () => {
      document.body.classList.remove('bg-black');
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  // Notify other components (e.g. HangingProtocolDropdown) when sidebar toggles
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('ohif-sidebar-toggle', {
        detail: { isOpen: !leftPanelClosedState },
      })
    );
  }, [leftPanelClosedState]);

  const getComponent = id => {
    const entry = extensionManager.getModuleEntry(id);

    if (!entry || !entry.component) {
      throw new Error(
        `${id} is not valid for an extension module or no component found from extension ${id}. Please verify your configuration or ensure that the extension is properly registered. It's also possible that your mode is utilizing a module from an extension that hasn't been included in its dependencies (add the extension to the "extensionDependencies" array in your mode's index.js file). Check the reference string to the extension in your Mode configuration`
      );
    }

    return { entry };
  };

  // Hanging-protocol loader gate.
  //
  // Problem (the "flicker"): OHIF applies a DEFAULT hanging protocol the moment
  // display sets land, then HangingProtocolDropdown swaps in the BIEDX breast
  // protocol (hpMammo / hpCEM / hpMR) a beat later. If the loader hides after
  // the DEFAULT layout paints, the user sees the wrong-ordered grid and then a
  // visible jump when the real protocol applies — and the same jump on every
  // manual stage change. To keep it smooth we hold a full-screen loader OVER
  // the viewport until the protocol the user / auto-apply actually asked for
  // has settled and painted.
  //
  // Coordination: HangingProtocolDropdown dispatches a `viewer-hp-transition`
  // window event immediately before it runs ANY setHangingProtocol command
  // (initial auto-apply AND manual stage changes). That event tells this gate
  // "a deliberate swap is starting — keep the loader up until its panes paint."
  // When NO transition is requested shortly after a protocol change (a plain
  // non-breast study, e.g. US, that only ever gets the default protocol), a
  // grace timer lets the loader finish on the current protocol so it never
  // hangs.
  //
  // Each transition waits for every pane's first IMAGE_RENDERED with non-zero
  // dimensions (so partially-empty grids — "WW/WL: -- / --", "1/0", blank panes
  // — are never shown). For multi-frame stacks (DBT, MRI) only the FIRST frame
  // is gated; background frame prefetch keeps running. A 30s hard ceiling
  // guarantees the loader can never trap the user.
  //
  // This supersedes the previous modalitySlug-based gate (which waited for a
  // specific targetProtocolId but was one-shot, so it never covered manual
  // stage changes). REVERT NOTE: to restore the old behaviour, bring back the
  // modalitySlug/targetProtocolId gate that finished on the matching
  // PROTOCOL_CHANGED, and drop the `viewer-hp-transition` dispatch in
  // HangingProtocolDropdown.tsx (`runHangingProtocol`).
  useEffect(() => {
    const HARD_TIMEOUT_MS = 30000;
    // Must stay LARGER than the auto-apply delay in HangingProtocolDropdown
    // (currently 250ms) so the breast protocol's transition always arrives
    // before the default protocol's grace window elapses.
    const GRACE_MS = 900;

    let renderedElements = new Set<HTMLElement>();
    let attachedListeners: Array<{ el: HTMLElement; fn: EventListener }> = [];
    let viewportDataUnsub: (() => void) | null = null;
    let hardTimer: ReturnType<typeof setTimeout> | null = null;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    let watchStarted = false;
    let settled = false;
    let transitionRequested = false;

    const clearWatchResources = () => {
      attachedListeners.forEach(({ el, fn }) =>
        el.removeEventListener(CoreEnums.Events.IMAGE_RENDERED, fn)
      );
      attachedListeners = [];
      if (viewportDataUnsub) {
        viewportDataUnsub();
        viewportDataUnsub = null;
      }
      if (hardTimer) {
        clearTimeout(hardTimer);
        hardTimer = null;
      }
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      setShowLoadingIndicator(false);
      clearWatchResources();
    };

    const hasValidDims = (vp: any): boolean => {
      const dims = vp?.getImageData?.()?.dimensions;
      return Array.isArray(dims) && dims[0] > 0 && dims[1] > 0;
    };

    const beginViewportWatch = () => {
      if (watchStarted) return;
      watchStarted = true;
      const numPanes =
        hangingProtocolService.protocol?.stages?.[hangingProtocolService.stageIndex]?.viewports
          ?.length ?? 1;

      const tryFinish = () => {
        if (renderedElements.size >= numPanes) finish();
      };

      const watchViewport = (viewportId: string | undefined) => {
        if (!viewportId || !cornerstoneViewportService) return;
        const vp = cornerstoneViewportService.getCornerstoneViewport(viewportId);
        const el = (vp as any)?.element as HTMLElement | undefined;
        if (!el || renderedElements.has(el)) return;

        if (hasValidDims(vp)) {
          renderedElements.add(el);
          tryFinish();
          return;
        }
        const onRendered = () => {
          if (!hasValidDims(vp)) return;
          el.removeEventListener(CoreEnums.Events.IMAGE_RENDERED, onRendered);
          renderedElements.add(el);
          tryFinish();
        };
        el.addEventListener(CoreEnums.Events.IMAGE_RENDERED, onRendered);
        attachedListeners.push({ el, fn: onRendered });
      };

      if (cornerstoneViewportService?.subscribe && cornerstoneViewportService.EVENTS) {
        const sub = cornerstoneViewportService.subscribe(
          cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
          (evt: any) => watchViewport(evt?.viewportId)
        );
        viewportDataUnsub = sub?.unsubscribe ?? null;
      }

      // Catch viewports that already had their data set before this subscriber
      // ran (e.g. fast cache hits during a stage swap).
      try {
        const re = cornerstoneViewportService?.getRenderingEngine?.();
        const viewports = re?.getViewports?.();
        if (viewports) {
          Object.values(viewports).forEach((vp: any) => watchViewport(vp?.id));
        }
      } catch {
        /* non-fatal */
      }

      if (hardTimer) clearTimeout(hardTimer);
      hardTimer = setTimeout(finish, HARD_TIMEOUT_MS);
    };

    // Re-arm for a brand-new transition: drop any in-flight watch, reset the
    // pane tally, bring the loader back over the viewport, and re-arm the hard
    // ceiling so a transition that never lands a PROTOCOL_CHANGED can't hang.
    const armForNewTransition = () => {
      clearWatchResources();
      renderedElements = new Set();
      watchStarted = false;
      settled = false;
      setShowLoadingIndicator(true);
      hardTimer = setTimeout(finish, HARD_TIMEOUT_MS);
    };

    const onTransitionRequested = () => {
      transitionRequested = true;
      if (graceTimer) {
        clearTimeout(graceTimer);
        graceTimer = null;
      }
      armForNewTransition();
    };

    const onProtocolChanged = () => {
      if (transitionRequested) {
        // The deliberate swap we were told to wait for just applied — watch its
        // panes and hide the loader once they paint.
        transitionRequested = false;
        watchStarted = false;
        beginViewportWatch();
        return;
      }
      // Unsolicited change (default protocol at init, or an external caller).
      // Give the dropdown a short window to request a transition; if none comes,
      // treat this protocol as final so the loader never hangs.
      if (!graceTimer && !settled) {
        graceTimer = setTimeout(() => {
          graceTimer = null;
          if (!transitionRequested && !settled) {
            beginViewportWatch();
          }
        }, GRACE_MS);
      }
    };

    window.addEventListener('viewer-hp-transition', onTransitionRequested);
    const { unsubscribe } = hangingProtocolService.subscribe(
      HangingProtocolService.EVENTS.PROTOCOL_CHANGED,
      onProtocolChanged
    );

    return () => {
      window.removeEventListener('viewer-hp-transition', onTransitionRequested);
      unsubscribe();
      if (graceTimer) clearTimeout(graceTimer);
      clearWatchResources();
    };
  }, [hangingProtocolService, cornerstoneViewportService]);

  const getViewportComponentData = viewportComponent => {
    const { entry } = getComponent(viewportComponent.namespace);

    return {
      component: entry.component,
      isReferenceViewable: entry.isReferenceViewable,
      displaySetsToDisplay: viewportComponent.displaySetsToDisplay,
    };
  };

  // Capture PatientAge / PatientSex from the first display-set as soon as
  // it loads. Used by the Lexa panel to pre-fill the patient block.
  // PatientAge comes through DICOM as e.g. "045Y"; we strip non-digits so
  // the number lands cleanly in the Age input.
  useEffect(() => {
    const computePatientInfo = () => {
      const displaySets = displaySetService?.getActiveDisplaySets?.();
      if (!displaySets || displaySets.length === 0) {
        return;
      }
      const instance = displaySets[0]?.instances?.[0] || (displaySets[0] as any)?.instance;
      if (!instance) {
        return;
      }
      const rawAge = instance.PatientAge as string | undefined;
      const ageDigits = rawAge ? String(rawAge).replace(/[^0-9]/g, '') : '';
      let sex = '';
      if (instance.PatientSex === 'M') {
        sex = 'Male';
      } else if (instance.PatientSex === 'F') {
        sex = 'Female';
      } else if (instance.PatientSex === 'O') {
        sex = 'Other';
      } else {
        sex = instance.PatientSex || '';
      }
      setPatientInfo({ age: ageDigits, sex });

      // Folder names for EVERY study of this patient. The module case list only
      // covers the current module, so a same-patient study opened from another
      // module (or the compare dropdown) had no label. `folder_name` lives only
      // in our `cases` table — it is not a DICOM tag — so it must come from the
      // LMS, keyed by PatientID. Merged into the same store key the module list
      // writes, so the sidebar rows, the compare dropdown and the viewport
      // overlay all read one map. Fetched once per PatientID.
      const patientId = instance.PatientID as string | undefined;
      if (patientId && patientId !== folderNamesPatientRef.current) {
        folderNamesPatientRef.current = patientId;
        const endpoint = userType === 'faculty' ? '/admin/cases/folder-names' : '/user/cases/folder-names';
        apiCall(() => apiService.get(`${endpoint}?patient_id=${encodeURIComponent(patientId)}`))
          .then((result: any) => {
            const map = (result?.success ? result?.data?.data : null) as Record<string, string> | null;
            if (!map || typeof map !== 'object') {
              return;
            }
            setUIState('studyFolderNames', {
              ...((useUIStateStore.getState().uiState.studyFolderNames as Record<string, string>) || {}),
              ...map,
            });
          })
          .catch(() => {
            /* Non-fatal — labels just fall back to their previous value. */
          });
      }
    };

    // Run once in case display sets are already loaded by the time we mount.
    computePatientInfo();

    const subscription = displaySetService?.subscribe?.(
      displaySetService.EVENTS.DISPLAY_SETS_ADDED,
      computePatientInfo
    );
    return () => subscription?.unsubscribe?.();
  }, [displaySetService, userType, setUIState]);

  useEffect(() => {
    const { unsubscribe } = panelService.subscribe(
      panelService.EVENTS.PANELS_CHANGED,
      ({ options }) => {
        setHasLeftPanels(hasPanels('left'));
        setHasRightPanels(hasPanels('right'));
        if (options?.leftPanelClosed !== undefined) {
          setLeftPanelClosed(options.leftPanelClosed);
        }
        if (options?.rightPanelClosed !== undefined) {
          setRightPanelClosed(options.rightPanelClosed);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [panelService, hasPanels]);

  useEffect(() => {
    const { measurementService } = servicesManager.services;
    const { unsubscribe } = measurementService.subscribe(
      measurementService.EVENTS.SHOW_MEASUREMENT_MODAL,
      async (data: { measurementUid: string }) => {
        setCurrentMeasurementUid(data.measurementUid);

        // Compute 1-based annotation index for the modal title (ROI-1, Lesion-2, etc.)
        try {
          const allMeasurements = measurementService.getMeasurements();
          const idx = allMeasurements.findIndex((m: any) => m.uid === data.measurementUid);
          setCurrentAnnotationIndex(idx >= 0 ? idx + 1 : allMeasurements.length + 1);
        } catch {
          setCurrentAnnotationIndex(1);
        }

        if (userType === 'student') {
          const result = await apiCall(() =>
            apiService.get(`/user/cases/question-answer/${data.measurementUid}`)
          );
          if (result.success) {
            const { data: formData } = result.data as any;
            console.log('formData--------------', formData);
            setCurrentFormData(formData || null);
            console.log('SHOW_MEASUREMENT_MODAL event received in ViewerLayout', data);
            setShowMeasurementModal(true);
          } else {
            console.error('Failed to fetch measurement data:', (result as any).error);
            // Handle error - could show notification or set error state
          }
        } else {
          if (isAddAnswerClicked) {
            const result = await apiCall(() =>
              apiService.get(`/admin/cases/question-answer/${data.measurementUid}`)
            );
            if (result.success) {
              const { data: formData } = result.data as any;
              console.log('formData--------------', formData);
              setCurrentFormData(formData || null);
              console.log('SHOW_MEASUREMENT_MODAL event received in ViewerLayout', data);
              setShowMeasurementModal(true);
            } else {
              console.error('Failed to fetch measurement data:', (result as any).error);
              // Handle error - could show notification or set error state
            }
          }
        }
      }
    );
    return () => unsubscribe();
  }, [servicesManager.services.measurementService, currentViewType, isAddAnswerClicked]);

  useEffect(() => {
    const { measurementService } = servicesManager.services;
    const { unsubscribe } = measurementService.subscribe(
      measurementService.EVENTS.SHOW_RECALL_MODAL,
      (data: {
        measurementUid: string;
        annotationData: any;
        modality: string;
        measurement: any;
      }) => {
        setCurrentMeasurementUid(data.measurementUid);
        setAnnotationData(data.annotationData);
        console.log('SHOW_RECALL_MODAL event received in ViewerLayout', data);
        setShowRecallModal(true);
      }
    );
    return () => unsubscribe();
  }, [servicesManager.services.measurementService, currentViewType]);

  useEffect(() => {
    const getToolMapping = async () => {
      if (isPreview) {
        const result = await apiCall(() =>
          apiService.get(
            `/user/cases/evaluation/preview-measurements/${urlCourseId}/${moduleId}/${caseId}/${studentId}${buildFellowshipQuery({ isFellowship, programId, phaseId, moduleId })}`
          )
        );
        if (result.success) {
          const { data } = result.data as any;
          console.log('data--------------', data);
          if (Array.isArray(data)) {
            setRoiFormDataList(data.map((it: any) => it?.form_data ?? null));
          }
          if (data && data.length > 0) {
            data.forEach(item => {
              const CORNERSTONE_3D_TOOLS_SOURCE_NAME = 'Cornerstone3DTools';
              const CORNERSTONE_3D_TOOLS_SOURCE_VERSION = '0.1';

              // Get existing source and mappings
              const existingSource = servicesManager.services.measurementService.getSource(
                CORNERSTONE_3D_TOOLS_SOURCE_NAME,
                CORNERSTONE_3D_TOOLS_SOURCE_VERSION
              );

              console.log('existingSource--------------', existingSource);

              const sourceMappings = servicesManager.services.measurementService.getSourceMappings(
                CORNERSTONE_3D_TOOLS_SOURCE_NAME,
                CORNERSTONE_3D_TOOLS_SOURCE_VERSION
              );
              const toolMapping = sourceMappings.find(
                mapping => mapping.annotationType === item.measurement_data.toolName
              );

              const dataSource = extensionManager.getActiveDataSource()[0];

              console.log('existingSource', existingSource);
              console.log('toolMapping', toolMapping);
              console.log('dataSource', dataSource);
              console.log('item.measurement_data', item.measurement_data);

              // Transform data to match expected structure for addRawMeasurement
              const transformedData = {
                measurement: item.measurement_data,
                annotation: item.annotation_data,
                uid: item.measurement_data.uid,
                id: item.measurement_data.uid,
                toolName: item.measurement_data.toolName,
                formData: item.form_data || null,
              };

              // Use addRawMeasurement with transformed data
              servicesManager.services.measurementService.addRawMeasurement(
                existingSource,
                item.measurement_data.toolName,
                transformedData,
                toolMapping.toMeasurementSchema,
                dataSource
              );
            });
          }
        } else {
          console.error('Failed to fetch tool mapping data:', (result as any).error);
        }
      } else {
        if (userType === 'student') {
          const result = await apiCall(() =>
            apiService.get(
              `/user/cases/annotation-measurements/${urlCourseId}/${moduleId}/${caseId}/${studentId}${buildFellowshipQuery({ isFellowship, programId, phaseId, moduleId })}`
            )
          );
          if (result.success) {
            const { data } = result.data as any;
            console.log('data--------------', data);
            // Capture per-ROI form_data for the Lexa panel's Key Findings.
            // Order here is the order the backend returned (= submission
            // order), which matches OHIF's measurement list, so ROI-1 / ROI-2
            // labels stay consistent with the rest of the UI.
            if (Array.isArray(data)) {
              setRoiFormDataList(data.map((it: any) => it?.form_data ?? null));
            }
            if (data && data.length > 0) {
              data.forEach(item => {
                const CORNERSTONE_3D_TOOLS_SOURCE_NAME = 'Cornerstone3DTools';
                const CORNERSTONE_3D_TOOLS_SOURCE_VERSION = '0.1';

                // Get existing source and mappings
                const existingSource = servicesManager.services.measurementService.getSource(
                  CORNERSTONE_3D_TOOLS_SOURCE_NAME,
                  CORNERSTONE_3D_TOOLS_SOURCE_VERSION
                );

                console.log('existingSource--------------', existingSource);

                const sourceMappings =
                  servicesManager.services.measurementService.getSourceMappings(
                    CORNERSTONE_3D_TOOLS_SOURCE_NAME,
                    CORNERSTONE_3D_TOOLS_SOURCE_VERSION
                  );
                const toolMapping = sourceMappings.find(
                  mapping => mapping.annotationType === item.measurement_data.toolName
                );

                const dataSource = extensionManager.getActiveDataSource()[0];

                console.log('existingSource', existingSource);
                console.log('toolMapping', toolMapping);
                console.log('dataSource', dataSource);
                console.log('item.measurement_data', item.measurement_data);

                // Transform data to match expected structure for addRawMeasurement
                const transformedData = {
                  measurement: item.measurement_data,
                  annotation: item.annotation_data,
                  uid: item.measurement_data.uid,
                  id: item.measurement_data.uid,
                  toolName: item.measurement_data.toolName,
                  formData: item.form_data || null,
                };

                // Use addRawMeasurement with transformed data
                servicesManager.services.measurementService.addRawMeasurement(
                  existingSource,
                  item.measurement_data.toolName,
                  transformedData,
                  toolMapping.toMeasurementSchema,
                  dataSource
                );
              });
            }
          } else {
            console.error('Failed to fetch tool mapping data:', (result as any).error);
          }
        } else {
          if (isAddAnswerClicked) {
            const result = await apiCall(() =>
              apiService.get(`/admin/cases/annotation-measurements/${caseId}/${facultyId}`)
            );
            if (result.success) {
              const { data } = result.data as any;
              console.log('data--------------', data);
              if (Array.isArray(data)) {
                setRoiFormDataList(data.map((it: any) => it?.form_data ?? null));
              }
              if (data && data.length > 0) {
                data.forEach(item => {
                  const CORNERSTONE_3D_TOOLS_SOURCE_NAME = 'Cornerstone3DTools';
                  const CORNERSTONE_3D_TOOLS_SOURCE_VERSION = '0.1';

                  // Get existing source and mappings
                  const existingSource = servicesManager.services.measurementService.getSource(
                    CORNERSTONE_3D_TOOLS_SOURCE_NAME,
                    CORNERSTONE_3D_TOOLS_SOURCE_VERSION
                  );

                  console.log('existingSource--------------', existingSource);

                  const sourceMappings =
                    servicesManager.services.measurementService.getSourceMappings(
                      CORNERSTONE_3D_TOOLS_SOURCE_NAME,
                      CORNERSTONE_3D_TOOLS_SOURCE_VERSION
                    );
                  const toolMapping = sourceMappings.find(
                    mapping => mapping.annotationType === item.measurement_data.toolName
                  );

                  const dataSource = extensionManager.getActiveDataSource()[0];

                  console.log('existingSource', existingSource);
                  console.log('toolMapping', toolMapping);
                  console.log('dataSource', dataSource);
                  console.log('item.measurement_data', item.measurement_data);

                  // Transform data to match expected structure for addRawMeasurement
                  const transformedData = {
                    measurement: item.measurement_data,
                    annotation: item.annotation_data,
                    uid: item.measurement_data.uid,
                    id: item.measurement_data.uid,
                    toolName: item.measurement_data.toolName,
                    formData: item.form_data || null,
                  };

                  // Use addRawMeasurement with transformed data
                  servicesManager.services.measurementService.addRawMeasurement(
                    existingSource,
                    item.measurement_data.toolName,
                    transformedData,
                    toolMapping.toMeasurementSchema,
                    dataSource
                  );
                });
              }
            } else {
              console.error('Failed to fetch tool mapping data:', (result as any).error);
            }
          }
        }
      }
    };

    // Wrapper for the initial-fetch path: primes the auto-save refs so
    // the loaded value isn't echoed back as a save. Use this anywhere we
    // set studentAcrValues from the backend's response.
    const seedStudentAcr = (values: typeof studentAcrValues) => {
      lastSavedAcrRef.current = JSON.stringify(values);
      initialAcrLoadedRef.current = true;
      setStudentAcrValues(values);
    };

    const getAcrValues = async () => {
      if (userType === 'student' || isPreview) {
        const result = await apiCall(() =>
          apiService.get(
            `/user/cases/acr-values/${urlCourseId}/${moduleId}/${caseId}/${studentId}${buildFellowshipQuery({ isFellowship, programId, phaseId, moduleId })}`
          )
        );
        if (
          result.success &&
          (result.status === HTTP_STATUS.OK || result.status === HTTP_STATUS.CREATED)
        ) {
          const { data } = result.data as any;
          if (data) {
            if (isPreview) {
              setFacultyAcrValues(data.faculty_result_data || acrConfig.defaultValues);
            }
            seedStudentAcr(data.result_data || acrConfig.defaultValues);
          }
        } else {
          setFacultyAcrValues(acrConfig.defaultValues);
          seedStudentAcr(acrConfig.defaultValues);
        }
      }
      if (userType === 'faculty' || isPreview) {
        if (isAddAnswerClicked) {
          const result = await apiCall(() => apiService.get(`/admin/cases/acr-values/${caseId}`));
          if (
            result.success &&
            (result.status === HTTP_STATUS.OK || result.status === HTTP_STATUS.CREATED)
          ) {
            const { data } = result.data as any;
            if (data) {
              if (isPreview) {
                setFacultyAcrValues(data.result_data || acrConfig.defaultValues);
              } else {
                seedStudentAcr(data.result_data || acrConfig.defaultValues);
              }
            }
          } else {
            if (isPreview) {
              setFacultyAcrValues(acrConfig.defaultValues);
            } else {
              seedStudentAcr(acrConfig.defaultValues);
            }
          }
        }
      }
    };

    setTimeout(() => {
      getToolMapping();
      getAcrValues();
    }, 1000);
  }, [isAddAnswerClicked, annotationsReloadKey]);

  // Expose a window-attached trigger that the toolbar Reset command
  // calls after `measurementService.clearMeasurements()`. Bumping
  // `annotationsReloadKey` re-runs the fetch effect above, which
  // already correctly gates by userType/isPreview/isAddAnswerClicked:
  //   - student         → re-fetches /user/cases/annotation-measurements
  //   - faculty + addAnswer → re-fetches /admin/cases/annotation-measurements
  //   - faculty no addAnswer → fetch path is a no-op (annotations
  //     were unsaved, so they stay cleared — the desired behaviour)
  //   - preview         → re-fetches preview-measurements (both sides)
  // The window key is scoped to the viewer mount/unmount so it can't
  // leak across navigations.
  useEffect(() => {
    (window as any).__reloadSavedAnnotations = () => setAnnotationsReloadKey(k => k + 1);
    return () => {
      delete (window as any).__reloadSavedAnnotations;
    };
  }, []);

  /**
   * Persist `studentAcrValues` to the backend. Mirrors the body shape that
   * `ACRDisplay`'s manual Save uses, but driven from here so ROI-form-saves
   * (which mutate ACR via `onBreastDensityChange` / `onBiRadsChange` above)
   * are kept in sync with MySQL. Diagnostic-only — screening mode doesn't
   * own ACR state.
   */
  const saveStudentAcrToBackend = useCallback(
    async (values: typeof studentAcrValues) => {
      if (currentViewType !== 'diagnostic') {
        return;
      }
      if (userType === 'faculty' && !isAddAnswerClicked) {
        return;
      }
      try {
        const body: Record<string, unknown> = {
          ...(isFellowship
            ? buildFellowshipBody({ isFellowship, programId, phaseId, moduleId })
            : { course_id: courseId, module_id: moduleId }),
          case_id: caseId,
          student_id: userType === 'student' ? studentId : '',
          result_data: values,
          view_type: viewType,
          user_type: userType,
          faculty_id: userType === 'student' ? '' : facultyId,
          study_instance_uid: StudyInstanceUIDs,
        };
        const endpoint =
          userType === 'student' ? '/user/cases/case-answer' : '/admin/cases/case-answer';
        await apiCall(() => apiService.post(endpoint, body));
      } catch (e) {
        console.error('Auto-save ACR failed:', e);
      }
    },
    [
      currentViewType,
      userType,
      isAddAnswerClicked,
      isFellowship,
      programId,
      phaseId,
      moduleId,
      courseId,
      caseId,
      studentId,
      facultyId,
      viewType,
      StudyInstanceUIDs,
    ]
  );

  /**
   * Auto-save `studentAcrValues` whenever it changes. Skipped until the
   * first backend fetch resolves (`initialAcrLoadedRef`) so we don't echo
   * the initial fetch right back, and skipped when the serialized value
   * matches the last one we wrote (`lastSavedAcrRef`) so the ACR modal's
   * manual Save — which updates the ref pre-emptively — doesn't trigger a
   * second round-trip for the same values.
   */
  useEffect(() => {
    if (!initialAcrLoadedRef.current) {
      return;
    }
    const serialized = JSON.stringify(studentAcrValues);
    if (serialized === lastSavedAcrRef.current) {
      return;
    }
    lastSavedAcrRef.current = serialized;
    saveStudentAcrToBackend(studentAcrValues);
  }, [studentAcrValues, saveStudentAcrToBackend]);

  // Fetch case list for navigation
  const fetchCaseList = async () => {
    // Fellowship cases arrive without a `courseId` (they carry `programId`
    // instead), so gating on `courseId` alone would skip the fetch and
    // suppress the case-navigation panel. `moduleId` is all we need —
    // /user/cases/cases/:moduleId serves both course types (backend branches
    // on the `is_fellowship` query flag).
    if (!moduleId || (!courseId && !isFellowship)) {
      return;
    }

    setIsLoadingCases(true);
    setCaseListError(null);

    try {
      const result = await apiCall(() =>
        apiService.get(
          `/user/cases/cases/${moduleId}${buildFellowshipQuery({ isFellowship, programId, phaseId, moduleId })}`
        )
      );
      console.log('result--------------', result);
      if (result.success) {
        const cases = result.data.data.cases || [];
        const moduleTitle = result.data.data.module_title || '';
        setCaseList(cases);
        setModuleTitle(moduleTitle);
        console.log('cases--------------', cases);

        // Find current case index
        const currentIndex = cases.findIndex(c => c.case_id === +caseId);
        const resolvedIndex = currentIndex >= 0 ? currentIndex : 0;
        setCurrentCaseIndex(resolvedIndex);

        // Store the case label on window for viewport overlay access. Students see
        // the course-wide case number (case_no, e.g. "Case 1"), NOT the folder
        // name (folder name is admin-only). Fall back to case_title only if the
        // sequence hasn't been generated yet.
        const studentCaseTitle =
          cases[resolvedIndex]?.case_no || cases[resolvedIndex]?.case_title || '';
        (window as any).__currentCaseTitle = studentCaseTitle;
        // Also push to the UI state store so the StudyBrowser sidebar can
        // display the case title in place of StudyDescription (reactive read).
        setUIState('caseTitle', studentCaseTitle);

        // StudyInstanceUID -> folder name, built from the case list we just
        // fetched (it already carries `study_instance_uid` + `folder_name`), so
        // the StudyBrowser's "Compare Studies" dropdown can label each study by
        // the folder it was uploaded from instead of a date/modality pair. No
        // extra request. Studies outside this module simply aren't in the map
        // and the dropdown falls back to date · modality.
        setUIState(
          'studyFolderNames',
          cases.reduce((acc, c) => {
            if (c?.study_instance_uid && c?.folder_name) {
              acc[c.study_instance_uid] = c.folder_name;
            }
            return acc;
          }, {} as Record<string, string>)
        );

        // Viewport overlay label for STUDENTS: "Case 1 - Case 13 FU", i.e. the
        // course-wide case number (what a student sees everywhere else in the
        // LMS) followed by the case's folder name. Faculty/admin deliberately
        // keep the plain folder name — they work in folder terms — so this map
        // is built for students only and the overlay falls back to
        // `studyFolderNames` when a study isn't in it. Either part may be
        // missing (e.g. no folder name on a ZIP upload); we join whatever
        // exists rather than rendering a dangling separator.
        if (userType !== 'faculty') {
          setUIState(
            'studyOverlayLabels',
            cases.reduce((acc, c) => {
              if (!c?.study_instance_uid) {
                return acc;
              }
              const label = [c.case_no, c.folder_name].filter(Boolean).join(' - ');
              if (label) {
                acc[c.study_instance_uid] = label;
              }
              return acc;
            }, {} as Record<string, string>)
          );
        }

        // Store current case's subspeciality and modality slugs in global state
        const currentCase = cases[resolvedIndex];
        if (currentCase) {
          setUIState('subSpecialitySlug', currentCase.sub_speciality_slug || null);
          setUIState('modalitySlug', currentCase.modality_slug || null);
          setCaseHistoryText(currentCase.case_history || '');
          // Admin-configured per (subspeciality, modality) overlay fields,
          // resolved server-side in /user/cases/cases/:moduleId. Stamp the
          // result into the overlay store so the viewport shows the admin's
          // picks (or BIEDX defaults if no row exists for this pair).
          // Students see this and cannot change it (menu entry is gated
          // by userType below); admin/faculty can still adjust via the
          // Customize Viewport Overlay modal, which writes back to the
          // same backend row on modal close.
          const overlayFields = Array.isArray(currentCase.viewer_overlay_fields)
            ? currentCase.viewer_overlay_fields
            : ['patient_age', 'case_id', 'view'];
          useOverlayFieldsStore.getState().setSelectedFields(overlayFields);
        }

        console.log('Case list loaded:', cases);
        console.log('Current case index:', resolvedIndex);
      } else {
        setCaseListError('Failed to load case list');
      }
    } catch (error) {
      console.error('Error fetching case list:', error);
      setCaseListError('Error loading case list');
    } finally {
      setIsLoadingCases(false);
    }
  };

  // Navigate to specific case
  const navigateToCase = (targetCaseIndex: number) => {
    if (targetCaseIndex < 0 || targetCaseIndex >= caseList.length) {
      return;
    }

    const targetCase = caseList[targetCaseIndex];
    if (!targetCase) {
      return;
    }

    // Per-case fields move via plain URL params; auth + course/module/student
    // context stays in the cached token payload (re-redeemed on the reload
    // because PrivateRoute sees ?t= in the URL).
    const currentUrl = new URL(window.location.href);
    const encryptedUid = encrypt(targetCase.study_instance_uid || '');
    currentUrl.searchParams.set('StudyInstanceUIDs', encryptedUid);
    currentUrl.searchParams.set('caseId', String(targetCase.case_id));
    currentUrl.searchParams.set(
      'viewType',
      targetCase.view_type === '1' ? 'diagnostic' : 'screening'
    );
    currentUrl.searchParams.delete('data');

    // Full reload re-initialises OHIF state for the next case.
    window.location.replace(currentUrl.toString());
  };

  // Navigation handlers
  const handleNextCase = () => {
    const nextIndex = currentCaseIndex + 1;
    if (nextIndex < caseList.length) {
      navigateToCase(nextIndex);
    }
  };

  const handlePreviousCase = () => {
    const prevIndex = currentCaseIndex - 1;
    if (prevIndex >= 0) {
      navigateToCase(prevIndex);
    }
  };

  // Add validation function — config-driven per modality
  const validateACRForm = (acrValues: Record<string, string>) => {
    const missing = acrConfig.requiredFields.filter(key => !acrValues[key]);
    if (missing.length > 0) {
      setValidationMessage(
        `There are still some unfinished cases.\n Finish training and see the results?`
      );
      setShowValidationModal(true);
      return false;
    }
    return true;
  };

  const UserPreferencesModal = customizationService.getCustomization(
    'ohif.userPreferencesModal'
  ) as Types.MenuComponentCustomization;

  const menuOptions = [
    // {
    //   title: AboutModal?.menuTitle ?? t('Header:About'),
    //   icon: 'info',
    //   onClick: () =>
    //     show({
    //       content: AboutModal,
    //       title: AboutModal?.title ?? t('AboutModal:About OHIF Viewer'),
    //       containerClassName: AboutModal?.containerClassName ?? 'max-w-md',
    //     }),
    // },
    {
      title: UserPreferencesModal.menuTitle ?? t('Header:Preferences'),
      icon: 'settings',
      onClick: () =>
        show({
          content: UserPreferencesModal,
          title: UserPreferencesModal.title ?? t('UserPreferencesModal:User preferences'),
          containerClassName:
            UserPreferencesModal?.containerClassName ??
            'flex max-w-4xl p-6 flex-col max-h-[80vh] overflow-auto',
        }),
    },
    // Customize Viewport Overlay is admin/faculty-only. Students see the
    // admin-configured fields (delivered via case data) and cannot change
    // them. Faculty/admin saves write back to the (subspec, modality) row
    // in the admin overlay-config table — see the close handler below.
    ...(userType !== 'student'
      ? [
          {
            title: 'Customize Viewport Overlay',
            icon: 'settings',
            onClick: () => setShowOverlayFieldsModal(true),
          },
        ]
      : []),
  ];

  if (appConfig.oidc) {
    menuOptions.push({
      title: t('Header:Logout'),
      icon: 'power-off',
      onClick: async () => {
        navigate(`/logout?redirect_uri=${encodeURIComponent(window.location.href)}`);
      },
    });
  }

  // Fetch case details for faculty (admin sees a single case, not the full module case list)
  const fetchFacultyCaseDetails = async () => {
    if (!caseId) {
      return;
    }
    try {
      const result = await apiCall(() => apiService.get(`/admin/cases/${caseId}`));
      if (result.success) {
        const caseData = result.data?.data;
        if (caseData) {
          const facultyCaseTitle = caseData.folder_name || caseData.case_id || '';
          (window as any).__currentCaseTitle = facultyCaseTitle;
          // Mirror to the UI state store so the StudyBrowser sidebar can show
          // the case title (reactive — see PanelStudyBrowser).
          setUIState('caseTitle', facultyCaseTitle);
          setUIState('subSpecialitySlug', caseData.sub_speciality_slug || null);
          setUIState('modalitySlug', caseData.modality_slug || null);
          setCaseHistoryText(caseData.case_history || '');
          const overlayFields = Array.isArray(caseData.viewer_overlay_fields)
            ? caseData.viewer_overlay_fields
            : ['patient_age', 'case_id', 'view'];
          useOverlayFieldsStore.getState().setSelectedFields(overlayFields);
        }
      }
    } catch (error) {
      console.error('Error fetching faculty case details:', error);
    }
  };

  // Fetch case list/details on mount
  useEffect(() => {
    if (userType === 'student') {
      fetchCaseList();
    } else if (userType === 'faculty') {
      fetchFacultyCaseDetails();
    }
  }, [courseId, moduleId, caseId, userType, isFellowship, programId]);

  const viewportComponents = viewports.map(getViewportComponentData);

  // Auto-compose key findings for the Lexa form from current OHIF state.
  // Goal: feed Gemini natural-language prose (not key=value debug dumps) that
  // a radiologist would actually write, including each ROI's full BI-RADS
  // form. The user can still edit before submitting.
  const lexaKeyFindings = useMemo(() => {
    const humanizeKey = (k: string): string =>
      k
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, c => c.toUpperCase())
        .trim();
    const acrLabelMap: Record<string, string> = {
      acr: 'Breast density',
      bpe: 'BPE',
      r: 'Right BI-RADS',
      l: 'Left BI-RADS',
      overall_birads: 'Overall BI-RADS',
    };

    const lines: string[] = [];

    // Opening sentence — view type + modality.
    const isScreening = currentViewType === 'screening';
    const study = `${isScreening ? 'Screening' : 'Diagnostic'} study${
      modalitySlug ? ` performed on ${modalitySlug}` : ''
    }.`;
    lines.push(study);

    // ACR / BI-RADS summary as a single sentence with friendly labels.
    const acrParts: string[] = [];
    Object.entries(studentAcrValues || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || String(v).trim() === '') {
        return;
      }
      const label = acrLabelMap[k] || humanizeKey(k);
      acrParts.push(`${label}: ${v}`);
    });
    if (acrParts.length) {
      lines.push(`Overall assessment — ${acrParts.join('; ')}.`);
    }

    // NOTE: case_history used to be appended here as "Clinical history: …".
    // It now flows to the Lexa panel via the dedicated
    // `defaultAdditionalDetails` prop and is sent to Gemini as
    // `additionalClinicalDetails` instead — same information, correct field,
    // and visible to the user in the "Additional clinical details" textarea
    // where they can edit it before generating.

    // Per-marker findings — one labeled paragraph each. The marker label
    // (e.g. "ROI" vs "Lesion") is sourced from the SAME question-modal
    // config the student saw when filling the form, so terminology stays
    // consistent end-to-end and any future modality just needs its own
    // titlePrefix in questionModalConfigs.ts — no changes here. Empty
    // form_data entries (annotation drawn but no BI-RADS form filled yet)
    // are shown as "no findings recorded" rather than skipped, so Gemini
    // knows a marker exists at that position.
    // Pull the same config the student saw; the field list is the source
    // of truth for which keys belong on the report. Walking the config
    // (instead of `Object.entries(form)`) lets us emit "N/A" for any
    // expected field the user left blank — required by the Lexa flow
    // since 2026-05-13, when all non-BI-RADS fields became optional. The
    // "N/A" only lives inside this Lexa prompt; the saved form_data row
    // in MySQL still stores the empty string (no DB writes happen here).
    const modalityCfg = (() => {
      try {
        return getQuestionModalConfig(subSpecialitySlug, modalitySlug);
      } catch {
        return undefined;
      }
    })();
    const markerSingular = modalityCfg?.titlePrefix || 'ROI';
    const markerHeadingNoun = markerSingular === 'ROI' ? 'Region of interest' : markerSingular;
    const markerHeading = `${markerHeadingNoun} findings`;

    const isEmptyValue = (v: unknown): boolean =>
      v === '' || v === null || v === undefined || (Array.isArray(v) && v.length === 0);

    const validRois = (roiFormDataList || []).filter(Boolean);
    if (validRois.length > 0) {
      lines.push('');
      lines.push(
        `${markerHeading} (${validRois.length} ${markerSingular.toLowerCase()}${validRois.length > 1 ? 's' : ''}):`
      );
      validRois.forEach((form, idx) => {
        const markerLabel = `${markerSingular}-${idx + 1}`;

        // Form never submitted (still null or stripped to {}): keep the
        // legacy short-form line — Gemini can tell this annotation has no
        // form attached at all (different signal than "submitted but
        // every field blank").
        if (!form || Object.keys(form).length === 0) {
          lines.push(`${markerLabel}: no findings recorded.`);
          return;
        }

        // Build parts off the config's field list, falling back to the
        // form's own keys if the config is missing (very defensive — every
        // modality we ship has a config, but a future stray slug must not
        // throw here).
        const fieldKeys: string[] = modalityCfg?.fields?.map(f => f.key) ?? [];
        const remarks = (form as Record<string, unknown>).remarks;
        const parts: string[] = [];
        const seen = new Set<string>();

        const pushPart = (k: string) => {
          if (k === 'id' || k === 'remarks' || seen.has(k)) {
            return;
          }
          seen.add(k);
          const raw = (form as Record<string, unknown>)[k];
          const value = isEmptyValue(raw)
            ? 'N/A'
            : Array.isArray(raw)
              ? raw.join(', ')
              : String(raw);
          parts.push(`${humanizeKey(k)}: ${value}`);
        };

        // Config order first (so output reads in the same order the user
        // saw on screen).
        fieldKeys.forEach(pushPart);
        // Then any form-only keys we didn't already cover (legacy data /
        // newer keys not yet in the config) — extracted values only, no
        // N/A spam since we don't know if these fields are expected.
        Object.entries(form as Record<string, unknown>).forEach(([k, v]) => {
          if (seen.has(k) || k === 'id' || k === 'remarks') {
            return;
          }
          if (isEmptyValue(v)) {
            return;
          }
          seen.add(k);
          parts.push(`${humanizeKey(k)}: ${Array.isArray(v) ? v.join(', ') : String(v)}`);
        });

        if (parts.length === 0 && !remarks) {
          lines.push(`${markerLabel}: no findings recorded.`);
        } else {
          lines.push(
            `${markerLabel} — ${parts.join('; ')}.${remarks ? ` Remarks: ${remarks}.` : ''}`
          );
        }
      });
    }

    return lines.join('\n');
  }, [currentViewType, modalitySlug, subSpecialitySlug, studentAcrValues, roiFormDataList]);

  // The initial /annotation-measurements GET runs once at mount, so any
  // annotation drawn + form filled in THIS session never lands in
  // roiFormDataList — Lexa's Key Findings would then look empty. Refetch
  // on every Lexa-panel open so the form data list reflects everything
  // the student has saved up to "now". One small GET; cheap.
  useEffect(() => {
    if (lexaPanelMode === null) {
      return;
    }
    if (!caseId || !moduleId) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const url = isPreview
          ? `/user/cases/evaluation/preview-measurements/${urlCourseId}/${moduleId}/${caseId}/${studentId}${buildFellowshipQuery({ isFellowship, programId, phaseId, moduleId })}`
          : userType === 'student'
            ? `/user/cases/annotation-measurements/${urlCourseId}/${moduleId}/${caseId}/${studentId}${buildFellowshipQuery({ isFellowship, programId, phaseId, moduleId })}`
            : `/admin/cases/annotation-measurements/${caseId}/${facultyId}`;
        const result = await apiCall(() => apiService.get(url));
        if (cancelled || !result.success) {
          return;
        }
        const { data } = result.data as any;
        if (Array.isArray(data)) {
          setRoiFormDataList(data.map((it: any) => it?.form_data ?? null));
        }
      } catch (err) {
        console.error('Lexa: failed to refresh ROI form data list', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    lexaPanelMode,
    caseId,
    moduleId,
    urlCourseId,
    studentId,
    facultyId,
    userType,
    isPreview,
    isFellowship,
    programId,
    phaseId,
  ]);

  const lexaDefaultScenario =
    currentViewType === 'screening' ? 'Routine Screening' : 'Diagnostic Evaluation';

  // Resolve the human-friendly case label. Student path uses caseList from
  // the module fetch (case_title); faculty path uses the window-stashed
  // value set in fetchFacultyCaseDetails. Falls back to caseId so the field
  // is never empty.
  const lexaCaseName = useMemo(() => {
    const fromList = caseList[currentCaseIndex]?.case_title;
    if (fromList) {
      return String(fromList);
    }
    const fromWindow = (window as any).__currentCaseTitle;
    if (fromWindow) {
      return String(fromWindow);
    }
    return caseId ? `Case ${caseId}` : '';
  }, [caseList, currentCaseIndex, caseId]);

  const handleSubmitAnswer = async () => {
    const body = {
      course_id: courseId,
      module_id: moduleId,
      case_id: caseId,
      student_id: '',
      result_data: studentAcrValues,
      view_type: viewType,
      user_type: userType,
      faculty_id: '',
      study_instance_uid: StudyInstanceUIDs,
    };

    body.faculty_id = facultyId;
    delete body.student_id;
    if (isAddAnswerClicked) {
      const result = await apiCall(() => apiService.post('/admin/cases/case-answer', body));
      if (!result.success) {
        console.error('Failed to submit answer:', (result as any).error);
      }
    }
    setUIState('addAnswerClicked', false);
  };

  const handleFinalSubmit = async () => {
    try {
      // Call the API first. For fellowship cases we add program/phase
      // context and fellowship_curriculum_module_id so the backend writes
      // to the fellowship-scoped row in case_result_module_attempt instead
      // of the flat-course shape.
      const body: Record<string, unknown> = {
        student_id: studentId,
        ...(isFellowship
          ? buildFellowshipBody({ isFellowship, programId, phaseId, moduleId })
          : { module_id: moduleId }),
      };

      const result = await apiCall(() =>
        apiService.post('/user/cases/final-submit/case-type', body)
      );

      if (result.success) {
        // Only navigate if API call is successful
        setShowValidationModal(false);

        const currentParams = new URLSearchParams(window.location.search);

        navigate({
          pathname: '/results',
          search: currentParams.toString(),
        });
      }
    } catch (error) {
      console.error('Error submitting case type:', error);
    }
  };

  return (
    <div>
      <ViewerHeader
        hotkeysManager={hotkeysManager}
        extensionManager={extensionManager}
        servicesManager={servicesManager}
        appConfig={appConfig}
        acrValues={studentAcrValues}
        caseNavigation={{
          currentIndex: currentCaseIndex,
          totalCases: caseList.length,
          canGoNext: currentCaseIndex < caseList.length - 1,
          canGoPrevious: currentCaseIndex > 0,
          isLoading: isLoadingCases,
          currentCase: caseList[currentCaseIndex] || null,
          error: caseListError,
        }}
        onNextCase={handleNextCase}
        onPreviousCase={handlePreviousCase}
        onToggleStudiesPanel={() => {
          // Use the ResizablePanel API callbacks to properly expand/collapse
          if (leftPanelClosedState) {
            onLeftPanelOpen();
          } else {
            onLeftPanelClose();
          }
        }}
        hasLeftPanels={hasLeftPanels}
        leftPanelClosedState={leftPanelClosedState}
        moduleTitle={moduleTitle}
      />
      <div
        className="relative flex w-full flex-row flex-nowrap items-stretch overflow-hidden bg-black"
        style={{ height: 'calc(100vh - 130.5px' }}
      >
        <React.Fragment>
          {showLoadingIndicator && <LoadingIndicatorProgress className="h-full w-full bg-black" />}
          <ResizablePanelGroup {...resizablePanelGroupProps}>
            {/* LEFT sidebar is rendered as a floating overlay below (outside
                ResizablePanelGroup) so it slides ON TOP of the viewport instead
                of resizing it. Resizing the viewport is what was causing the
                cornerstone canvas re-render flicker. */}
            {/* TOOLBAR + GRID */}
            <ResizablePanel {...resizableViewportGridPanelProps}>
              <div className="flex h-full flex-1 flex-col">
                <div
                  className="relative flex h-full flex-1 items-center justify-center overflow-hidden bg-black"
                  onMouseEnter={handleMouseEnter}
                >
                  <ViewportGridComp
                    servicesManager={servicesManager}
                    viewportComponents={viewportComponents}
                    commandsManager={commandsManager}
                  />
                </div>
              </div>
            </ResizablePanel>
            {hasRightPanels ? (
              <>
                {/* Hide the resize handle for right panel - panel is always hidden */}
                {false && (
                  <ResizableHandle
                    onDragging={onHandleDragging}
                    disabled={!rightPanelResizable}
                    className={resizableHandleClassName}
                  />
                )}
                <ResizablePanel {...resizableRightPanelProps}>
                  <SidePanelWithServices
                    side="right"
                    isExpanded={false}
                    servicesManager={servicesManager}
                    {...rightPanelProps}
                  />
                </ResizablePanel>
              </>
            ) : null}
          </ResizablePanelGroup>
          {/* Floating LEFT sidebar overlay. translateX is GPU-accelerated and
              does NOT trigger layout on the viewport, so the cornerstone canvas
              keeps its pixel buffer and there's no flicker. Width is kept
              compact (260px) so more space stays available for the viewport;
              when closed, the wrapper sits one full width off-screen so its
              content can't bleed onto the viewport. */}
          {hasLeftPanels && (
            <div
              className="biedx-floating-sidebar absolute left-0 top-0 bottom-0 z-30 bg-[#0B0A0A]"
              style={{
                width: '260px',
                transform: leftPanelClosedState ? 'translateX(-100%)' : 'translateX(0)',
                transition: 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)',
                willChange: 'transform',
                pointerEvents: leftPanelClosedState ? 'none' : 'auto',
              }}
            >
              {/* isExpanded is hard-coded to true so the SidePanel keeps its
                  full-content rendering throughout the slide-in AND slide-out.
                  Visibility is driven entirely by the wrapper's transform —
                  letting the SidePanel switch to its (empty) closed-state
                  rendering mid-animation would make the panel appear blank
                  while it's sliding out. */}
              <SidePanelWithServices
                side="left"
                isExpanded={true}
                servicesManager={servicesManager}
                {...leftPanelProps}
              />
            </div>
          )}
        </React.Fragment>
      </div>
      <IconPresentationProvider
        size="large"
        IconContainer={ToolButton}
      >
        {/* Bottom Bar - Fixed at bottom with proper alignment */}
        <div className="bg-bkg-full fixed bottom-0 left-0 right-0 z-50 flex h-[66.5px] items-center justify-between border-t border-white/10 py-2.5 px-7 shadow-lg">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary h-10 w-10 rounded-lg"
                  style={{
                    backgroundColor: '#232323',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#2E2E2E';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#232323';
                  }}
                  onFocus={e => {
                    e.currentTarget.style.backgroundColor = '#2E2E2E';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.backgroundColor = '#232323';
                  }}
                >
                  <Icons.GearSettings />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {menuOptions.map((option, index) => {
                  const IconComponent = option.icon
                    ? Icons[option.icon as keyof typeof Icons]
                    : null;
                  return (
                    <DropdownMenuItem
                      key={index}
                      onSelect={option.onClick}
                      className="flex items-center gap-2 py-2"
                    >
                      {IconComponent && (
                        <span className="flex h-4 w-4 items-center justify-center">
                          <Icons.ByName name={IconComponent.name} />
                        </span>
                      )}
                      <span className="flex-1">{option.title}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              onClick={() => setShowInstructionsModal(true)}
              className="inline-flex h-auto gap-2 rounded-lg bg-[#232323] py-2 px-4 font-medium text-white hover:bg-[#2e2e2e] disabled:opacity-50"
              title="Instructions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="25"
                height="25"
                viewBox="0 0 25 25"
                fill="none"
              >
                <path
                  d="M12.4997 21.875L12.3955 21.7187C11.6719 20.6333 11.3101 20.0906 10.8321 19.6977C10.4089 19.3499 9.92131 19.089 9.39718 18.9298C8.80514 18.75 8.15291 18.75 6.84845 18.75H5.41634C4.24957 18.75 3.66618 18.75 3.22053 18.5229C2.82852 18.3232 2.50981 18.0045 2.31008 17.6125C2.08301 17.1668 2.08301 16.5834 2.08301 15.4167V6.45833C2.08301 5.29156 2.08301 4.70817 2.31008 4.26252C2.50981 3.87052 2.82852 3.55181 3.22053 3.35207C3.66618 3.125 4.24957 3.125 5.41634 3.125H5.83301C8.16656 3.125 9.33334 3.125 10.2246 3.57914C11.0086 3.97861 11.6461 4.61603 12.0455 5.40004C12.4997 6.29134 12.4997 7.45811 12.4997 9.79167M12.4997 21.875V9.79167M12.4997 21.875L12.6039 21.7187C13.3275 20.6333 13.6893 20.0906 14.1673 19.6977C14.5904 19.3499 15.078 19.089 15.6022 18.9298C16.1942 18.75 16.8464 18.75 18.1509 18.75H19.583C20.7498 18.75 21.3332 18.75 21.7788 18.5229C22.1708 18.3232 22.4895 18.0045 22.6893 17.6125C22.9163 17.1668 22.9163 16.5834 22.9163 15.4167V6.45833C22.9163 5.29156 22.9163 4.70817 22.6893 4.26252C22.4895 3.87052 22.1708 3.55181 21.7788 3.35207C21.3332 3.125 20.7498 3.125 19.583 3.125H19.1663C16.8328 3.125 15.666 3.125 14.7747 3.57914C13.9907 3.97861 13.3533 4.61603 12.9538 5.40004C12.4997 6.29134 12.4997 7.45811 12.4997 9.79167"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>

            {/* Case History Button - Faculty (edit mode) or Student (read-only).
                COMMENTED OUT to hide it from the bottom bar. To restore the
                feature, uncomment this block AND the <CaseHistoryModal> mount
                near the end of this file. */}
            {/*
            {((userType === 'faculty' && isAddAnswerClicked) || userType === 'student') && (
              <Button
                variant="ghost"
                onClick={() => setShowCaseHistoryModal(true)}
                className="inline-flex h-auto gap-2 rounded-lg bg-[#232323] py-2 px-4 font-medium text-white hover:bg-[#2e2e2e] disabled:opacity-50"
                title="Case History"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12H15"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9 16H13"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </Button>
            )}
            */}
          </div>

          {/* //Center Section - Main Toolbar
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
            <div className="bg-bkg-full flex items-center justify-center gap-3 rounded-lg px-4 py-2 shadow-lg">
              <Toolbar buttonSection="primary" />
            </div>
          </div> */}

          <div className="flex items-center gap-4">
            {/* ACR Display Component - Only visible in diagnostic mode */}
            {currentViewType === 'diagnostic' && userType === 'faculty' && isAddAnswerClicked && (
              <ACRDisplay
                studentValues={studentAcrValues}
                facultyValues={facultyAcrValues}
                onValuesChange={values => {
                  // Manual ACR modal "Save" already POSTed these values to
                  // /case-answer. Mark them as the last-saved snapshot so
                  // the auto-save useEffect skips and we don't double-write.
                  lastSavedAcrRef.current = JSON.stringify(values);
                  setStudentAcrValues(values);
                }}
              />
            )}
            {currentViewType === 'diagnostic' && userType === 'student' && (
              <ACRDisplay
                studentValues={studentAcrValues}
                facultyValues={facultyAcrValues}
                onValuesChange={values => {
                  // Manual ACR modal "Save" already POSTed these values to
                  // /case-answer. Mark them as the last-saved snapshot so
                  // the auto-save useEffect skips and we don't double-write.
                  lastSavedAcrRef.current = JSON.stringify(values);
                  setStudentAcrValues(values);
                }}
              />
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Lexa AI compound pill — Generate + Correct in one bordered
                container, separated by a vertical divider. Icon-only (no
                labels) to match the compact controls grouped on this side
                of the toolbar.

                Faculty view: hide until the user enters edit mode by
                clicking "Add Answer". Authoring assistance has no purpose
                before the faculty has committed to writing an answer, and
                showing it pre-edit clutters the read-only review state.
                Students always see it. */}
            {/* COMMENTED OUT to hide Generate Report / Correct Report from the
                bottom bar. To restore, uncomment this block AND the
                <LexaReportingPanel> mount near the end of this file. */}
            {/*
            {(userType !== 'faculty' || isAddAnswerClicked) && (
              <div className="flex items-center overflow-hidden rounded-lg bg-[#232323]">
                <button
                  type="button"
                  onClick={() => setLexaPanelMode('generate')}
                  className="flex h-auto items-center justify-center py-2 px-4 text-white hover:bg-[#2e2e2e]"
                  title="Generate Report (Lexa AI)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="25"
                    height="25"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M14 3v4a1 1 0 0 0 1 1h4M5 3h9l5 5v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 13h6M9 17h6M9 9h2"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <span
                  className="h-6 w-px bg-[#4F4F4F]"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => setLexaPanelMode('correct')}
                  className="flex h-auto items-center justify-center py-2 px-4 text-white hover:bg-[#2e2e2e]"
                  title="Correct Report (Lexa AI)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="25"
                    height="25"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M14 3v4a1 1 0 0 0 1 1h4M5 3h9l5 5v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 14l2 2 4-4"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
            */}

            {/* Case Navigation Buttons */}
            {caseList.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  disabled={currentCaseIndex === 0 || isLoadingCases}
                  onClick={handlePreviousCase}
                  className="h-8 w-8 rounded-lg p-2 text-white disabled:opacity-50"
                  title="Previous Case (Ctrl+Left)"
                  style={{
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onFocus={e => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  onBlur={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </Button>
                <span className="min-w-[60px] rounded-md bg-white/10 px-2 py-1.5 text-center text-sm font-medium text-white">
                  {isLoadingCases ? '...' : `${currentCaseIndex + 1} / ${caseList.length}`}
                </span>
                <Button
                  variant="ghost"
                  disabled={currentCaseIndex === caseList.length - 1 || isLoadingCases}
                  onClick={handleNextCase}
                  className="h-8 w-8 rounded-lg p-2 text-white disabled:opacity-50"
                  title="Next Case (Ctrl+Right)"
                  style={{
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onFocus={e => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  onBlur={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Button>
              </div>
            )}

            {/* Submit/Add Answer Button */}
            {userType === 'student' && (
              <Button
                variant="default"
                className="h-auto rounded px-4 py-2 text-xl font-medium text-white"
                style={{
                  backgroundColor: 'hsl(var(--highlight))',
                }}
                onClick={() => {
                  if (isPreview) {
                    // Close preview → restore the original /results URL the
                    // user came from (browser-history pop). This avoids
                    // leaking preview-only params (isPreview, caseId,
                    // viewType, preview StudyInstanceUIDs) onto /results.
                    // Fallback for the rare deep-link case where there's no
                    // history entry: go to /results with preview overrides
                    // explicitly stripped.
                    if (window.history.length > 1) {
                      navigate(-1);
                    } else {
                      const stripped = new URLSearchParams(window.location.search);
                      stripped.delete('isPreview');
                      stripped.delete('caseId');
                      stripped.delete('viewType');
                      navigate({ pathname: '/results', search: stripped.toString() });
                    }
                  } else if (validateACRForm(studentAcrValues)) {
                    // Happy path: all required ACR fields filled → hit
                    // /user/cases/final-submit/case-type so the backend
                    // aggregator persists case_result_module_attempt
                    // before we navigate to /results.
                    handleFinalSubmit();
                  }
                }}
              >
                {isPreview ? 'Close' : 'Submit'}
              </Button>
            )}
            {userType === 'faculty' && !isAddAnswerClicked && (
              <Button
                variant="default"
                className="h-auto rounded-[8px] px-4 py-2 text-xl font-medium text-white"
                style={{
                  backgroundColor: 'hsl(var(--highlight))',
                }}
                onClick={() => {
                  setUIState('addAnswerClicked', true);
                }}
              >
                Add Answer
              </Button>
            )}
            {isAddAnswerClicked && (
              <Button
                variant="default"
                className="h-auto rounded-[8px] px-4 py-2 text-xl font-medium text-white"
                style={{
                  backgroundColor: 'hsl(var(--highlight))',
                }}
                onClick={handleSubmitAnswer}
              >
                Submit Answer
              </Button>
            )}

            {/* // Undo/Redo Buttons
            <div className="flex items-center gap-2">
              <div className="bg-bkg-full flex items-center justify-center gap-2 rounded-lg px-2 py-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary h-7 w-7"
                  onClick={() => {
                    commandsManager.run('undo');
                  }}
                  style={{
                    backgroundColor: '#232323',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#2E2E2E';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#232323';
                  }}
                  onFocus={e => {
                    e.currentTarget.style.backgroundColor = '#2E2E2E';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.backgroundColor = '#232323';
                  }}
                >
                  <Icons.Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary h-7 w-7"
                  onClick={() => {
                    commandsManager.run('redo');
                  }}
                  style={{
                    backgroundColor: '#232323',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#2E2E2E';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#232323';
                  }}
                  onFocus={e => {
                    e.currentTarget.style.backgroundColor = '#2E2E2E';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.backgroundColor = '#232323';
                  }}
                >
                  <Icons.Redo className="h-4 w-4" />
                </Button>
              </div>
            </div> */}
          </div>
        </div>
      </IconPresentationProvider>
      <Onboarding tours={customizationService.getCustomization('ohif.tours')} />
      {/* <InvestigationalUseDialog dialogConfiguration={appConfig?.investigationalUseDialog} /> */}

      {/* Conditional Modal Rendering */}
      {currentViewType === 'diagnostic' && (
        <QuestionAnswerModal
          formData={currentFormData}
          measurementUid={currentMeasurementUid}
          servicesManager={servicesManager}
          open={showMeasurementModal}
          onClose={() => setShowMeasurementModal(false)}
          onBreastDensityChange={value => {
            // ACR breast density = highest BI-RADS density across ALL ROIs.
            // Example: ROI-1=B, ROI-2=C, ROI-3=A → ACR shows C.
            //
            // `roiFormDataList` is captured by closure at render time; it
            // may not yet contain the value the user is currently saving
            // (no optimistic list update in the modal-save path), so we
            // include `value` explicitly as an extra candidate. Anything
            // outside A–D is ignored.
            const DENSITY_RANK: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };
            const candidates = [
              ...(roiFormDataList || []).map(
                f => (f as Record<string, unknown> | null)?.breastDensity as string | undefined
              ),
              value,
            ].filter((d): d is string => typeof d === 'string' && d in DENSITY_RANK);
            if (candidates.length === 0) {
              return;
            }
            const highest = candidates.reduce(
              (max, cur) => (DENSITY_RANK[cur] > DENSITY_RANK[max] ? cur : max),
              candidates[0]
            );
            setStudentAcrValues(prev => ({
              ...prev,
              acr: highest,
            }));
          }}
          onBiRadsChange={savedForm => {
            // BI-RADS propagation rules (driven by the ACR modality config
            // — `r/l/overall_birads` field keys are the source of truth):
            //
            //   MG / DBT / CEM (config has `r` + `l`):
            //     R = max BI-RADS across ROIs on RIGHT-laterality viewports
            //     L = max BI-RADS across ROIs on LEFT-laterality viewports
            //     Laterality = ImageLaterality of the series each ROI was
            //     drawn on (from DicomMetadataStore).
            //
            //   MR / US (config has `overall_birads`):
            //     overall_birads = max BI-RADS across ALL ROIs
            //     (no laterality split — these forms don't carry a side).
            //
            // BI-RADS rank: 1 < 2 < 4 < 5 (3 is intentionally absent per
            // BIEDX policy).
            const acrFieldKeys = (acrConfig?.fields || []).map(f => f.key);
            const hasR = acrFieldKeys.includes('r');
            const hasL = acrFieldKeys.includes('l');
            const hasOverall = acrFieldKeys.includes('overall_birads');
            if (!hasR && !hasL && !hasOverall) {
              return;
            }

            const BIRADS_RANK: Record<string, number> = { '1': 1, '2': 2, '4': 3, '5': 4 };
            const measurements =
              servicesManager.services.measurementService.getMeasurements?.() || [];

            const getLat = (m: any): 'L' | 'R' | null => {
              if (!m) {
                return null;
              }
              try {
                const instance = DicomMetadataStore.getInstance(
                  m.referenceStudyUID,
                  m.referenceSeriesUID,
                  m.SOPInstanceUID
                );
                const lat = String((instance as any)?.ImageLaterality || '').toUpperCase();
                if (lat === 'L' || lat === 'R') {
                  return lat;
                }
              } catch {
                /* fall through */
              }
              return null;
            };

            // Collect existing ROIs (skipping the one currently being
            // edited, so we don't double-count its stale value alongside
            // the fresh `savedForm`).
            const editedUid = currentMeasurementUid;
            const collected: Array<{ biRads: string; lat: 'L' | 'R' | null }> = [];
            (roiFormDataList || []).forEach((f, idx) => {
              if (!f) {
                return;
              }
              const m = measurements[idx];
              if (m && m.uid === editedUid) {
                return;
              }
              const biRads = (f as Record<string, unknown>).biRads;
              if (typeof biRads !== 'string' || !(biRads in BIRADS_RANK)) {
                return;
              }
              collected.push({ biRads, lat: getLat(m) });
            });

            // Add the fresh submission. For RL modalities we need its
            // laterality, looked up from currentMeasurementUid's series.
            const freshBiRads = savedForm.biRads;
            if (typeof freshBiRads === 'string' && freshBiRads in BIRADS_RANK) {
              const editedMeas = editedUid
                ? servicesManager.services.measurementService.getMeasurement?.(editedUid)
                : null;
              collected.push({ biRads: freshBiRads, lat: getLat(editedMeas) });
            }

            if (collected.length === 0) {
              return;
            }

            const maxRank = (vals: string[]) =>
              vals.reduce((max, cur) => (BIRADS_RANK[cur] > BIRADS_RANK[max] ? cur : max), vals[0]);

            setStudentAcrValues(prev => {
              const next = { ...prev };
              if (hasR || hasL) {
                const rs = collected.filter(c => c.lat === 'R').map(c => c.biRads);
                const ls = collected.filter(c => c.lat === 'L').map(c => c.biRads);
                if (hasR && rs.length > 0) {
                  next.r = maxRank(rs);
                }
                if (hasL && ls.length > 0) {
                  next.l = maxRank(ls);
                }
              }
              if (hasOverall) {
                const all = collected.map(c => c.biRads);
                if (all.length > 0) {
                  next.overall_birads = maxRank(all);
                }
              }
              return next;
            });
          }}
          annotationIndex={currentAnnotationIndex}
        />
      )}

      {currentViewType === 'screening' && (
        <RecallModal
          open={showRecallModal}
          onClose={() => setShowRecallModal(false)}
          servicesManager={servicesManager}
          measurementUid={currentMeasurementUid}
          annotationData={annotationData}
        />
      )}
      {/* Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-popover max-w-[450px] rounded-lg p-6 text-white">
            <div className="mb-4 text-center">
              <p className="text-xl font-medium">{validationMessage}</p>
            </div>
            <div className="flex justify-center gap-4 pt-4">
              <Button
                variant="ghost"
                className="h-auto min-w-[70px] rounded px-4 py-2 font-medium text-white"
                style={{
                  backgroundColor: 'hsl(var(--highlight))',
                }}
                onClick={() => setShowValidationModal(false)}
              >
                No
              </Button>
              <Button
                variant="default"
                className="h-auto min-w-[70px] rounded px-4 py-2 font-medium text-white"
                style={{
                  backgroundColor: 'hsl(var(--highlight))',
                }}
                onClick={handleFinalSubmit}
              >
                Yes, Finish
              </Button>
            </div>
          </div>
        </div>
      )}

      <InstructionModal
        open={showInstructionsModal}
        onClose={() => setShowInstructionsModal(false)}
      />

      {/*
        OverlayFieldsModal is gated by `userType !== 'student'` via the
        menu entry above, so students can't open it. On close (admin/faculty
        only), we upsert the latest selection to
        /admin/viewport-overlay-config for the case's (subspec, modality)
        so it persists for every future student/admin who opens a case in
        that combination — same data the admin panel's Configure Overlay
        modal writes to.
       */}
      <OverlayFieldsModal
        open={showOverlayFieldsModal}
        onClose={() => {
          setShowOverlayFieldsModal(false);
          if (userType === 'student') return;
          if (!subSpecialitySlug || !modalitySlug) return;
          const fields = useOverlayFieldsStore.getState().selectedFields;
          apiCall(() =>
            apiService.post('/admin/viewport-overlay-config', {
              sub_speciality_slug: subSpecialitySlug,
              modality_slug: modalitySlug,
              fields,
            })
          ).catch(err => {
            // Non-fatal — the user's local picks still apply for this
            // session (Zustand state). They'll just need to re-toggle to
            // persist again. Logging suffices; no toast spam.
            console.warn('Overlay config save failed:', err);
          });
        }}
      />

      {/* CaseHistoryModal — commented out along with its bottom-bar button.
          Uncomment both to restore the feature. */}
      {/*
      <CaseHistoryModal
        open={showCaseHistoryModal}
        onClose={() => setShowCaseHistoryModal(false)}
        initialValue={caseHistoryText}
        onSave={
          userType === 'student'
            ? undefined
            : async (value: string) => {
                setCaseHistoryText(value);
                if (caseId) {
                  try {
                    await apiCall(() =>
                      apiService.patch(`/admin/cases/${caseId}/case-history`, {
                        case_history: value,
                      })
                    );
                  } catch (error) {
                    console.error('Error saving case history:', error);
                  }
                }
              }
        }
        readOnly={userType === 'student'}
      />
      */}

      {/* LexaReportingPanel — commented out along with its bottom-bar buttons.
          Uncomment both to restore the feature. */}
      {/*
      <LexaReportingPanel
        open={lexaPanelMode !== null}
        mode={lexaPanelMode || 'generate'}
        onClose={() => setLexaPanelMode(null)}
        userType={userType as string}
        modalitySlug={modalitySlug}
        defaultKeyFindings={lexaKeyFindings}
        defaultAdditionalDetails={caseHistoryText}
        defaultScenario={lexaDefaultScenario}
        defaultCaseName={lexaCaseName}
        defaultPatientAge={patientInfo.age}
        defaultPatientSex={patientInfo.sex}
        courseId={courseId}
        moduleId={moduleId}
        caseId={caseId}
        isFellowship={isFellowship}
        programId={programId}
        phaseId={phaseId}
      />
      */}
    </div>
  );
}

export default ViewerLayout;
