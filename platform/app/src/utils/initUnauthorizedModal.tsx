import { UIModalService } from '@ohif/core';
import { setShowUnauthorizedModal } from '@ohif/core/src/utils/showUnauthorizedModal';
import { Button } from '@ohif/ui-next';
import React from 'react';

/**
 * Initialize the unauthorized modal function with UIModalService
 */
export const initUnauthorizedModal = (uiModalService: UIModalService) => {
  const UnauthorizedModalContent = ({
    onLogin,
    onClose,
  }: {
    onLogin: () => void;
    onClose: () => void;
  }) => {
    return (
      <div className="p-4">
        <p className="mb-6 text-base text-white">
          You are not authorized to access the viewer. Please login to continue.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="default"
            onClick={onLogin}
            className="px-6 py-2 text-base font-medium text-white"
            style={{
              backgroundColor: 'hsl(var(--highlight))',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--highlight) / 0.9)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--highlight))';
            }}
          >
            Login
          </Button>
        </div>
      </div>
    );
  };

  const showModal = () => {
    const handleLogin = () => {
      uiModalService.hide();
      window.location.href = 'http://localhost:8081/login';
    };

    uiModalService.show({
      title: 'Unauthorized Access',
      content: UnauthorizedModalContent,
      contentProps: {
        onLogin: handleLogin,
        onClose: () => uiModalService.hide(),
      },
      containerClassName: 'max-w-md !rounded-2xl p-6',
      shouldCloseOnEsc: false,
      shouldCloseOnOverlayClick: false,
      unstyled: true,
    });
  };

  setShowUnauthorizedModal(showModal);
};
