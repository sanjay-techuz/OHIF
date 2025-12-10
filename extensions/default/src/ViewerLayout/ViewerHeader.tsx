import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { preserveQueryParameters } from '@ohif/app';
import { getCustomParams, Types, useSystem } from '@ohif/core';
import { Button, Header, useModal } from '@ohif/ui-next';
import { useUIStateStore } from '../stores/useUIStateStore';
import { Toolbar } from '../Toolbar/Toolbar';
import HeaderPatientInfo from './HeaderPatientInfo';
import { PatientInfoVisibility } from './HeaderPatientInfo/HeaderPatientInfo';

interface ViewerHeaderProps {
  appConfig: AppTypes.Config;
  acrValues: { acr: string; r: string; l: string };
  caseNavigation?: {
    currentIndex: number;
    totalCases: number;
    canGoNext: boolean;
    canGoPrevious: boolean;
    isLoading: boolean;
    currentCase: any;
    error: string | null;
  };
  onNextCase?: () => void;
  onPreviousCase?: () => void;
}

function ViewerHeader({
  appConfig,
  acrValues,
  caseNavigation,
  onNextCase,
  onPreviousCase,
}: ViewerHeaderProps) {
  const { servicesManager, extensionManager } = useSystem();
  const { customizationService } = servicesManager.services;
  const { setUIState } = useUIStateStore();
  const isAddAnswerClicked = useUIStateStore(state => !!state.uiState.addAnswerClicked);

  const navigate = useNavigate();
  const location = useLocation();

  const onClickReturnButton = () => {
    const { pathname } = location;
    const dataSourceIdx = pathname.indexOf('/', 1);

    const dataSourceName = pathname.substring(dataSourceIdx + 1);
    const existingDataSource = extensionManager.getDataSources(dataSourceName);

    const searchQuery = new URLSearchParams();
    if (dataSourceIdx !== -1 && existingDataSource) {
      searchQuery.append('datasources', pathname.substring(dataSourceIdx + 1));
    }
    preserveQueryParameters(searchQuery);

    navigate({
      pathname: '/',
      search: decodeURIComponent(searchQuery.toString()),
    });
  };

  const { t } = useTranslation();
  const { show } = useModal();
  const { isPreview, userType } = getCustomParams();

  // Add state for validation modal
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

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

  const AboutModal = customizationService.getCustomization(
    'ohif.aboutModal'
  ) as Types.MenuComponentCustomization;

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

  return (
    <>
      <Header
        menuOptions={menuOptions}
        isReturnEnabled={!!appConfig.showStudyList}
        onClickReturnButton={onClickReturnButton}
        WhiteLabeling={appConfig.whiteLabeling}
        Secondary={<Toolbar buttonSection="secondary" />}
        PatientInfo={
          appConfig.showPatientInfo !== PatientInfoVisibility.DISABLED && (
            <HeaderPatientInfo
              servicesManager={servicesManager}
              appConfig={appConfig}
            />
          )
        }
        UndoRedo={
          <></>
          // <div className="text-primary flex cursor-pointer items-center">
          //   <Button
          //     variant="ghost"
          //     className="hover:bg-primary-dark"
          //     onClick={() => {
          //       commandsManager.run('undo');
          //     }}
          //   >
          //     <Icons.Undo className="" />
          //   </Button>
          //   <Button
          //     variant="ghost"
          //     className="hover:bg-primary-dark"
          //     onClick={() => {
          //       commandsManager.run('redo');
          //     }}
          //   >
          //     <Icons.Redo className="" />
          //   </Button>
          // </div>
        }
        SubmitButton={
          <div className="flex items-center space-x-2">
            {/* Case Navigation Buttons */}
            {caseNavigation && caseNavigation.totalCases > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  disabled={!caseNavigation.canGoPrevious || caseNavigation.isLoading}
                  onClick={onPreviousCase}
                  className="rounded-lg bg-blue-800 p-2 text-blue-300 hover:bg-blue-700 disabled:opacity-50"
                  title="Previous Case (Ctrl+Left)"
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
                  {caseNavigation.isLoading
                    ? '...'
                    : `${caseNavigation.currentIndex + 1} / ${caseNavigation.totalCases}`}
                </span>
                <Button
                  variant="ghost"
                  disabled={!caseNavigation.canGoNext || caseNavigation.isLoading}
                  onClick={onNextCase}
                  className="rounded-lg bg-blue-800 p-2 text-blue-300 hover:bg-blue-700 disabled:opacity-50"
                  title="Next Case (Ctrl+Right)"
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

            {/* Submit Button */}
            {userType === 'student' && (
              <Button
                variant="default"
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                onClick={() => {
                  // Validate ACR form before submitting
                  if (validateACRForm(acrValues)) {
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
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
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
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                onClick={() => {
                  setUIState('addAnswerClicked', false);
                }}
              >
                Submit Answer
              </Button>
            )}
          </div>
        }
      >
        {/* <div className="relative flex justify-center gap-[4px]">
          <Toolbar buttonSection="primary" />
        </div> */}
      </Header>

      {/* Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-muted rounded-lg p-6 text-white">
            <div className="mb-4 text-center">
              <p className="text-lg">{validationMessage}</p>
            </div>
            <div className="flex justify-center gap-4">
              <Button
                variant="ghost"
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                onClick={() => setShowValidationModal(false)}
              >
                No
              </Button>
              <Button
                variant="default"
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
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
    </>
  );
}

export default ViewerHeader;
