import { IconPresentationProvider } from '@ohif/ui-next';
import classNames from 'classnames';
import React, { ReactNode } from 'react';
import { Icons, ToolButton } from '../';

import NavBar from '../NavBar';

// Todo: we should move this component to composition and remove props base

interface HeaderProps {
  children?: ReactNode;
  // menuOptions: Array<{
  //   title: string;
  //   icon?: string;
  //   onClick: () => void;
  // }>;
  isReturnEnabled?: boolean;
  onClickReturnButton?: () => void;
  isSticky?: boolean;
  WhiteLabeling?: {
    createLogoComponentFn?: (React: any, props: any) => ReactNode;
  };
  PatientInfo?: ReactNode;
  Secondary?: ReactNode;
  UndoRedo?: ReactNode;
  StudiesToggle?: ReactNode;
}

function Header({
  children,
  // menuOptions,
  isReturnEnabled = true,
  onClickReturnButton,
  isSticky = false,
  WhiteLabeling,
  PatientInfo,
  UndoRedo,
  Secondary,
  StudiesToggle,
  ...props
}: HeaderProps): ReactNode {
  const onClickReturn = () => {
    if (isReturnEnabled && onClickReturnButton) {
      onClickReturnButton();
    }
  };

  return (
    <IconPresentationProvider
      size="large"
      IconContainer={ToolButton}
    >
      <NavBar
        isSticky={isSticky}
        {...props}
      >
        <div className="relative flex h-16 items-center justify-between px-7 py-2">
          <div className="flex items-center gap-6">
            <div
              className={classNames(
                'inline-flex items-center',
                isReturnEnabled && 'cursor-pointer'
              )}
              onClick={onClickReturn}
              data-cy="return-to-work-list"
            >
              {/* {isReturnEnabled && <Icons.ArrowLeft className="text-primary ml-1 h-7 w-7" />} */}
              <div>
                {WhiteLabeling?.createLogoComponentFn?.(React, props) || <Icons.OHIFLogo />}
              </div>
            </div>
            {StudiesToggle}
            {Secondary}
          </div>
          {/* <div className="absolute top-1/2 left-[250px] flex h-8 -translate-y-1/2 items-center gap-2">
            {StudiesToggle}
            {Secondary}
          </div> */}
          <div className="flex select-none items-center">
            <div className="transform">
              <div className="flex items-center justify-center space-x-2">{children}</div>
            </div>
            <div className="flex select-none items-center">
              {UndoRedo}
              <div className="border-primary-dark mx-1.5 h-[25px] border-r"></div>
              {PatientInfo}
              <div className="border-primary-dark mx-1.5 h-[25px] border-r"></div>
              {/* <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary hover:bg-primary-dark mt-2 h-full w-full"
                  >
                    <Icons.GearSettings />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
            </div> */}
            </div>
          </div>
        </div>
      </NavBar>
    </IconPresentationProvider>
  );
}

export default Header;
