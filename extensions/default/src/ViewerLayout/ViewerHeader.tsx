import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { preserveQueryParameters } from '@ohif/app';
import { useSystem } from '@ohif/core';
import { Button, Header } from '@ohif/ui-next';
import { Toolbar } from '../Toolbar/Toolbar';
import HeaderPatientInfo from './HeaderPatientInfo';
import { PatientInfoVisibility } from './HeaderPatientInfo/HeaderPatientInfo';

interface ViewerHeaderProps {
  appConfig: AppTypes.Config;
  onToggleStudiesPanel?: () => void;
  hasLeftPanels?: boolean;
  leftPanelClosedState?: boolean;
  moduleTitle?: string;
}

function ViewerHeader({
  appConfig,
  onToggleStudiesPanel,
  hasLeftPanels = false,
  leftPanelClosedState = false,
  moduleTitle = '',
}: ViewerHeaderProps) {
  const { servicesManager, extensionManager } = useSystem();
  const { customizationService } = servicesManager.services;

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

  // const { t } = useTranslation();
  // const { show } = useModal();

  // const AboutModal = customizationService.getCustomization(
  //   'ohif.aboutModal'
  // ) as Types.MenuComponentCustomization;

  // const UserPreferencesModal = customizationService.getCustomization(
  //   'ohif.userPreferencesModal'
  // ) as Types.MenuComponentCustomization;

  // const menuOptions = [
  //   // {
  //   //   title: AboutModal?.menuTitle ?? t('Header:About'),
  //   //   icon: 'info',
  //   //   onClick: () =>
  //   //     show({
  //   //       content: AboutModal,
  //   //       title: AboutModal?.title ?? t('AboutModal:About OHIF Viewer'),
  //   //       containerClassName: AboutModal?.containerClassName ?? 'max-w-md',
  //   //     }),
  //   // },
  //   {
  //     title: UserPreferencesModal.menuTitle ?? t('Header:Preferences'),
  //     icon: 'settings',
  //     onClick: () =>
  //       show({
  //         content: UserPreferencesModal,
  //         title: UserPreferencesModal.title ?? t('UserPreferencesModal:User preferences'),
  //         containerClassName:
  //           UserPreferencesModal?.containerClassName ?? 'flex max-w-4xl p-6 flex-col',
  //       }),
  //   },
  // ];

  // if (appConfig.oidc) {
  //   menuOptions.push({
  //     title: t('Header:Logout'),
  //     icon: 'power-off',
  //     onClick: async () => {
  //       navigate(`/logout?redirect_uri=${encodeURIComponent(window.location.href)}`);
  //     },
  //   });
  // }

  return (
    <>
      <Header
        // menuOptions={menuOptions}
        isReturnEnabled={!!appConfig.showStudyList}
        onClickReturnButton={onClickReturnButton}
        WhiteLabeling={appConfig.whiteLabeling}
        Secondary={<Toolbar buttonSection="secondary" />}
        ModuleTitle={moduleTitle}
        StudiesToggle={
          hasLeftPanels && onToggleStudiesPanel ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary h-8 w-8"
              onClick={onToggleStudiesPanel}
              title="Toggle Studies Panel"
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* <Icons.ByName
                name="MenuHamburger"
                className="h-5 w-8"
              /> */}
              {leftPanelClosedState ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="17"
                  viewBox="0 0 25 17"
                  fill="none"
                >
                  <path
                    d="M1 8.5H23.5M1 1H23.5M1 16H23.5"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                >
                  <path
                    d="M30 10L10 30M10 10L30 30"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </Button>
          ) : null
        }
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
      >
        <div className="relative flex justify-center gap-4">
          <Toolbar buttonSection="primary" />
        </div>
      </Header>
    </>
  );
}

export default ViewerHeader;
