import PropTypes from 'prop-types';
import React, { useCallback, useEffect, useState } from 'react';

import { useCustomParams } from '@ohif/app/src/hooks/useCustomParams';
import {
  apiCall,
  apiService,
  CommandsManager,
  HangingProtocolService,
  HTTP_STATUS,
} from '@ohif/core';
import {
  ACRDisplay,
  Button,
  IconPresentationProvider,
  Icons,
  InvestigationalUseDialog,
  Onboarding,
  QuestionAnswerModal,
  RecallModal,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ToolButton,
} from '@ohif/ui-next';
import { useAppConfig } from '@state';
import SidePanelWithServices from '../Components/SidePanelWithServices';
import { Toolbar } from '../Toolbar';
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

  const { panelService, hangingProtocolService, customizationService } = servicesManager.services;
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(appConfig.showLoadingIndicator);

  const hasPanels = useCallback(
    (side): boolean => !!panelService.getPanels(side).length,
    [panelService]
  );

  const [hasRightPanels, setHasRightPanels] = useState(hasPanels('right'));
  const [hasLeftPanels, setHasLeftPanels] = useState(hasPanels('left'));
  const [leftPanelClosedState, setLeftPanelClosed] = useState(leftPanelClosed);
  const [rightPanelClosedState, setRightPanelClosed] = useState(rightPanelClosed);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [currentMeasurementUid, setCurrentMeasurementUid] = useState<string | null>(null);
  const [studentAcrValues, setStudentAcrValues] = useState({ acr: '', r: '', l: '' });
  const [facultyAcrValues, setFacultyAcrValues] = useState({ acr: '', r: '', l: '' });
  const [currentFormData, setCurrentFormData] = useState<any>(null);
  // ViewType management
  const [currentViewType, setCurrentViewType] = useState<'diagnostic' | 'screening'>('diagnostic');
  const [showRecallModal, setShowRecallModal] = useState(false);

  // Case navigation state
  const [caseList, setCaseList] = useState([]);
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [caseListError, setCaseListError] = useState(null);
  const { courseId, moduleId, caseId, studentId, viewType, userType, facultyId, isPreview } =
    useCustomParams();
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
    leftPanelClosed,
    setLeftPanelClosed,
    rightPanelClosed,
    setRightPanelClosed,
    hasLeftPanels,
    hasRightPanels
  );

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

  const getComponent = id => {
    const entry = extensionManager.getModuleEntry(id);

    if (!entry || !entry.component) {
      throw new Error(
        `${id} is not valid for an extension module or no component found from extension ${id}. Please verify your configuration or ensure that the extension is properly registered. It's also possible that your mode is utilizing a module from an extension that hasn't been included in its dependencies (add the extension to the "extensionDependencies" array in your mode's index.js file). Check the reference string to the extension in your Mode configuration`
      );
    }

    return { entry };
  };

  useEffect(() => {
    const { unsubscribe } = hangingProtocolService.subscribe(
      HangingProtocolService.EVENTS.PROTOCOL_CHANGED,

      // Todo: right now to set the loading indicator to false, we need to wait for the
      // hangingProtocolService to finish applying the viewport matching to each viewport,
      // however, this might not be the only approach to set the loading indicator to false. we need to explore this further.
      () => {
        setShowLoadingIndicator(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [hangingProtocolService]);

  const getViewportComponentData = viewportComponent => {
    const { entry } = getComponent(viewportComponent.namespace);

    return {
      component: entry.component,
      isReferenceViewable: entry.isReferenceViewable,
      displaySetsToDisplay: viewportComponent.displaySetsToDisplay,
    };
  };

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

        let result = null;
        if (userType === 'student') {
          result = await apiCall(() =>
            apiService.get(`/student/question-answer/${data.measurementUid}`)
          );
        } else {
          result = await apiCall(() =>
            apiService.get(`/faculty/question-answer/${data.measurementUid}`)
          );
        }

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
    );
    return () => unsubscribe();
  }, [servicesManager.services.measurementService, currentViewType]);

  useEffect(() => {
    const { measurementService } = servicesManager.services;
    const { unsubscribe } = measurementService.subscribe(
      measurementService.EVENTS.SHOW_RECALL_MODAL,
      (data: { measurementUid: string }) => {
        setCurrentMeasurementUid(data.measurementUid);
        console.log('SHOW_RECALL_MODAL event received in ViewerLayout', data);
        setShowRecallModal(true);
      }
    );
    return () => unsubscribe();
  }, [servicesManager.services.measurementService, currentViewType]);

  useEffect(() => {
    const getToolMapping = async () => {
      let result = null;

      if (isPreview) {
        result = await apiCall(() =>
          apiService.get(
            `/evaluation/preview-measurements/${courseId}/${moduleId}/${caseId}/${studentId}`
          )
        );
      } else {
        if (userType === 'student') {
          result = await apiCall(() =>
            apiService.get(
              `/student/annotation-measurements/${courseId}/${moduleId}/${caseId}/${studentId}`
            )
          );
        } else {
          result = await apiCall(() =>
            apiService.get(
              `/faculty/annotation-measurements/${courseId}/${moduleId}/${caseId}/${facultyId}`
            )
          );
        }
      }

      if (result.success) {
        const { data } = result.data as any;
        console.log('data--------------', data);
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
    };

    const getAcrValues = async () => {
      if (userType === 'student' || isPreview) {
        const result = await apiCall(() =>
          apiService.get(`/student/acr-values/${courseId}/${moduleId}/${caseId}`)
        );
        if (
          result.success &&
          (result.status === HTTP_STATUS.OK || result.status === HTTP_STATUS.CREATED)
        ) {
          const { data } = result.data as any;
          if (data) {
            setStudentAcrValues(data.result_data || { acr: '', r: '', l: '' });
          }
        } else {
          setStudentAcrValues({ acr: '', r: '', l: '' });
        }
      }
      if (userType === 'faculty' || isPreview) {
        const result = await apiCall(() =>
          apiService.get(`/faculty/acr-values/${courseId}/${moduleId}/${caseId}`)
        );
        if (
          result.success &&
          (result.status === HTTP_STATUS.OK || result.status === HTTP_STATUS.CREATED)
        ) {
          const { data } = result.data as any;
          if (data) {
            if (isPreview) {
              setFacultyAcrValues(data.result_data || { acr: '', r: '', l: '' });
            } else {
              setStudentAcrValues(data.result_data || { acr: '', r: '', l: '' });
            }
          }
        } else {
          if (isPreview) {
            setFacultyAcrValues({ acr: '', r: '', l: '' });
          } else {
            setStudentAcrValues({ acr: '', r: '', l: '' });
          }
        }
      }
    };

    setTimeout(() => {
      getToolMapping();
      getAcrValues();
    }, 1000);
  }, []);

  // Fetch case list for navigation
  const fetchCaseList = async () => {
    if (!courseId || !moduleId) {
      return;
    }

    setIsLoadingCases(true);
    setCaseListError(null);

    try {
      const result = await apiCall(() => apiService.get(`/cases/${courseId}/${moduleId}`));
      console.log('result--------------', result);
      if (result.success) {
        const cases = result.data.cases || [];
        setCaseList(cases);
        console.log('cases--------------', cases);

        // Find current case index
        const currentIndex = cases.findIndex(c => c.case_id === caseId);
        setCurrentCaseIndex(currentIndex >= 0 ? currentIndex : 0);

        console.log('Case list loaded:', cases);
        console.log('Current case index:', currentIndex);
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

    // Update URL parameters to trigger OHIF reload
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('caseId', targetCase.case_id);
    currentUrl.searchParams.set('StudyInstanceUIDs', targetCase.study_instance_uid);

    // Navigate to new URL (this will trigger OHIF to reload all data)
    window.location.href = currentUrl.toString();
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

  // Fetch case list on mount
  useEffect(() => {
    fetchCaseList();
  }, [courseId, moduleId]);

  const viewportComponents = viewports.map(getViewportComponentData);

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
      />
      <div
        className="relative flex w-full flex-row flex-nowrap items-stretch overflow-hidden bg-black"
        style={{ height: 'calc(100vh - 110px' }}
      >
        <React.Fragment>
          {showLoadingIndicator && <LoadingIndicatorProgress className="h-full w-full bg-black" />}
          <ResizablePanelGroup {...resizablePanelGroupProps}>
            {/* LEFT SIDEPANELS */}
            {hasLeftPanels ? (
              <>
                <ResizablePanel {...resizableLeftPanelProps}>
                  <SidePanelWithServices
                    side="left"
                    isExpanded={!leftPanelClosedState}
                    servicesManager={servicesManager}
                    {...leftPanelProps}
                  />
                </ResizablePanel>
                <ResizableHandle
                  onDragging={onHandleDragging}
                  disabled={!leftPanelResizable}
                  className={resizableHandleClassName}
                />
              </>
            ) : null}
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
                <ResizableHandle
                  onDragging={onHandleDragging}
                  disabled={!rightPanelResizable}
                  className={resizableHandleClassName}
                />
                <ResizablePanel {...resizableRightPanelProps}>
                  <SidePanelWithServices
                    side="right"
                    isExpanded={!rightPanelClosedState}
                    servicesManager={servicesManager}
                    {...rightPanelProps}
                  />
                </ResizablePanel>
              </>
            ) : null}
          </ResizablePanelGroup>
        </React.Fragment>
      </div>
      <IconPresentationProvider
        size="large"
        IconContainer={ToolButton}
      >
        {/* Main Toolbar */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 transform">
          <div className="flex items-center justify-center space-x-2">
            <div className="bg-bkg-full relative flex items-center justify-center gap-3 rounded-lg px-4 py-2 shadow-lg">
              <Toolbar buttonSection="primary" />
            </div>
          </div>
        </div>

        {/* ACR Display Component - Only visible in diagnostic mode */}
        {currentViewType === 'diagnostic' && (
          <div
            className="fixed bottom-0"
            style={{ right: '13rem' }}
          >
            <ACRDisplay
              studentValues={studentAcrValues}
              facultyValues={facultyAcrValues}
              onValuesChange={setStudentAcrValues}
            />
          </div>
        )}

        {/* Undo/Redo Buttons */}
        <div className="fixed right-10 bottom-1 flex select-none items-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="bg-bkg-full relative flex items-center justify-center gap-3 rounded-lg px-4 py-2 shadow-lg">
              <Button
                variant="ghost"
                className="hover:bg-primary-dark"
                onClick={() => {
                  commandsManager.run('undo');
                }}
              >
                <Icons.Undo className="" />
              </Button>
              <Button
                variant="ghost"
                className="hover:bg-primary-dark"
                onClick={() => {
                  commandsManager.run('redo');
                }}
              >
                <Icons.Redo className="" />
              </Button>
            </div>
          </div>
        </div>
      </IconPresentationProvider>
      <Onboarding tours={customizationService.getCustomization('ohif.tours')} />
      <InvestigationalUseDialog dialogConfiguration={appConfig?.investigationalUseDialog} />

      {/* Conditional Modal Rendering */}
      {currentViewType === 'diagnostic' && (
        <QuestionAnswerModal
          formData={currentFormData}
          measurementUid={currentMeasurementUid}
          servicesManager={servicesManager}
          open={showMeasurementModal}
          onClose={() => setShowMeasurementModal(false)}
        />
      )}

      {currentViewType === 'screening' && (
        <RecallModal
          open={showRecallModal}
          onClose={() => setShowRecallModal(false)}
        />
      )}
    </div>
  );
}

ViewerLayout.propTypes = {
  // From extension module params
  extensionManager: PropTypes.shape({
    getModuleEntry: PropTypes.func.isRequired,
  }).isRequired,
  commandsManager: PropTypes.instanceOf(CommandsManager),
  servicesManager: PropTypes.object.isRequired,
  // From modes
  leftPanels: PropTypes.array,
  rightPanels: PropTypes.array,
  leftPanelClosed: PropTypes.bool.isRequired,
  rightPanelClosed: PropTypes.bool.isRequired,
  /** Responsible for rendering our grid of viewports; provided by consuming application */
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
  viewports: PropTypes.array,
};

export default ViewerLayout;
