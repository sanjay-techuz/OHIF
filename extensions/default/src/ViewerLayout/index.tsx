import React, { useCallback, useEffect, useState } from 'react';

import { useCustomParams } from '@ohif/app/src/hooks/useCustomParams';
import {
  apiCall,
  apiService,
  decryptObject,
  encrypt,
  encryptObject,
  HangingProtocolService,
  HTTP_STATUS,
  Types,
} from '@ohif/core';
import {
  ACRDisplay,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconPresentationProvider,
  Icons,
  Onboarding,
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
  const [leftPanelClosedState, setLeftPanelClosed] = useState(true);
  const [rightPanelClosedState, setRightPanelClosed] = useState(true);
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

  // Add state for validation modal
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const { courseId, moduleId, caseId, studentId, viewType, userType, facultyId, isPreview } =
    useCustomParams();
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
      if (isPreview) {
        const result = await apiCall(() =>
          apiService.get(
            `/user/cases/evaluation/preview-measurements/${courseId}/${moduleId}/${caseId}/${studentId}`
          )
        );
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
      } else {
        if (userType === 'student') {
          const result = await apiCall(() =>
            apiService.get(
              `/user/cases/annotation-measurements/${courseId}/${moduleId}/${caseId}/${studentId}`
            )
          );
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

    const getAcrValues = async () => {
      if (userType === 'student' || isPreview) {
        const result = await apiCall(() =>
          apiService.get(`/user/cases/acr-values/${courseId}/${moduleId}/${caseId}`)
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
        if (isAddAnswerClicked) {
          const result = await apiCall(() => apiService.get(`/admin/cases/acr-values/${caseId}`));
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
      }
    };

    setTimeout(() => {
      getToolMapping();
      getAcrValues();
    }, 1000);
  }, [isAddAnswerClicked]);

  // Fetch case list for navigation
  const fetchCaseList = async () => {
    if (!courseId || !moduleId) {
      return;
    }

    setIsLoadingCases(true);
    setCaseListError(null);

    try {
      const result = await apiCall(() => apiService.get(`/user/cases/cases/${moduleId}`));
      console.log('result--------------', result);
      if (result.success) {
        const cases = result.data.data.cases || [];
        setCaseList(cases);
        console.log('cases--------------', cases);

        // Find current case index
        const currentIndex = cases.findIndex(c => c.case_id === +caseId);
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
    console.log('targetCase--------------', targetCase);

    // Update URL parameters to trigger OHIF reload
    const currentParams = new URLSearchParams(window.location.search);
    const currentUrl = new URL(window.location.href);
    const encryptedData = currentParams.get('data');
    const decryptedData = decryptObject(encryptedData);
    const data = {
      ...decryptedData,
      caseId: targetCase.case_id,
    };
    const encryptedUid = encrypt(targetCase.study_instance_uid || '');
    currentUrl.searchParams.set('data', encryptObject(data));
    currentUrl.searchParams.set('StudyInstanceUIDs', encryptedUid);

    console.log('currentUrl--------------', currentUrl.toString());
    // Navigate to new URL (this will trigger OHIF to reload all data)
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

  // Add validation function
  const validateACRForm = (acrValues: { acr: string; r: string; l: string }) => {
    if (!acrValues.acr || !acrValues.r || !acrValues.l) {
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
            UserPreferencesModal?.containerClassName ?? 'flex max-w-4xl p-6 flex-col',
        }),
    },
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

  // Fetch case list on mount
  useEffect(() => {
    if (userType === 'student') {
      fetchCaseList();
    }
  }, [courseId, moduleId, userType]);

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
        onToggleStudiesPanel={() => {
          // Use the ResizablePanel API callbacks to properly expand/collapse
          if (leftPanelClosedState) {
            onLeftPanelOpen();
          } else {
            onLeftPanelClose();
          }
        }}
        hasLeftPanels={hasLeftPanels}
      />
      <div
        className="relative flex w-full flex-row flex-nowrap items-stretch overflow-hidden bg-black"
        style={{ height: 'calc(100vh - 96px' }}
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
                {/* Hide the resize handle when left panel is closed */}
                {!leftPanelClosedState && (
                  <ResizableHandle
                    onDragging={onHandleDragging}
                    disabled={!leftPanelResizable}
                    className={resizableHandleClassName}
                  />
                )}
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
        </React.Fragment>
      </div>
      <IconPresentationProvider
        size="large"
        IconContainer={ToolButton}
      >
        {/* Bottom Bar - Fixed at bottom with proper alignment */}
        <div className="bg-bkg-full fixed bottom-0 left-0 right-0 z-50 flex h-[48px] items-center justify-between px-4 shadow-lg">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary h-8 w-8"
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
                onValuesChange={setStudentAcrValues}
              />
            )}
            {currentViewType === 'diagnostic' && userType === 'student' && (
              <ACRDisplay
                studentValues={studentAcrValues}
                facultyValues={facultyAcrValues}
                onValuesChange={setStudentAcrValues}
              />
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
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
                    backgroundColor: '#232323',
                  }}
                  onMouseEnter={e => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = '#2E2E2E';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#232323';
                  }}
                  onFocus={e => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = '#2E2E2E';
                    }
                  }}
                  onBlur={e => {
                    e.currentTarget.style.backgroundColor = '#232323';
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
                <span className="min-w-[60px] text-center text-sm text-gray-400">
                  {isLoadingCases ? '...' : `${currentCaseIndex + 1} / ${caseList.length}`}
                </span>
                <Button
                  variant="ghost"
                  disabled={currentCaseIndex === caseList.length - 1 || isLoadingCases}
                  onClick={handleNextCase}
                  className="h-8 w-8 rounded-lg p-2 text-white disabled:opacity-50"
                  title="Next Case (Ctrl+Right)"
                  style={{
                    backgroundColor: '#232323',
                  }}
                  onMouseEnter={e => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = '#2E2E2E';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#232323';
                  }}
                  onFocus={e => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = '#2E2E2E';
                    }
                  }}
                  onBlur={e => {
                    e.currentTarget.style.backgroundColor = '#232323';
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
                className="h-8 rounded px-4 py-2 text-white"
                style={{
                  backgroundColor: 'hsl(var(--highlight))',
                }}
                onClick={() => {
                  // Validate ACR form before submitting
                  if (validateACRForm(studentAcrValues)) {
                    // Proceed with submit logic and redirect to results
                    console.log('Submit button clicked - validation passed');

                    // Get current URL parameters
                    const currentParams = new URLSearchParams(window.location.search).toString();

                    // Navigate to results page with same query params
                    navigate({
                      pathname: '/results',
                      search: currentParams,
                    });
                  }
                }}
              >
                {isPreview ? 'Close' : 'Submit'}
              </Button>
            )}
            {userType === 'faculty' && !isAddAnswerClicked && (
              <Button
                variant="default"
                className="h-8 rounded px-4 py-2 text-white"
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
                className="h-8 rounded px-4 py-2 text-white"
                style={{
                  backgroundColor: 'hsl(var(--highlight))',
                }}
                onClick={() => {
                  setUIState('addAnswerClicked', false);
                }}
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
        />
      )}

      {currentViewType === 'screening' && (
        <RecallModal
          open={showRecallModal}
          onClose={() => setShowRecallModal(false)}
        />
      )}
      {/* Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-popover rounded-lg p-6 text-white">
            <div className="mb-4 text-center">
              <p className="text-lg">{validationMessage}</p>
            </div>
            <div className="flex justify-center gap-4">
              <Button
                variant="ghost"
                className="rounded px-4 py-2 text-white"
                style={{
                  backgroundColor: 'hsl(var(--highlight))',
                }}
                onClick={() => setShowValidationModal(false)}
              >
                No
              </Button>
              <Button
                variant="default"
                className="rounded px-4 py-2 text-white"
                style={{
                  backgroundColor: 'hsl(var(--highlight))',
                }}
                onClick={() => {
                  setShowValidationModal(false);

                  const currentParams = new URLSearchParams(window.location.search);

                  navigate({
                    pathname: '/results',
                    search: currentParams.toString(),
                  });
                }}
              >
                Yes, Finish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewerLayout;
