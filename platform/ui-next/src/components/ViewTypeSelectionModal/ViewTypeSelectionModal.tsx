import { Button, Modal } from '@ohif/ui-next';
import React, { useEffect, useRef } from 'react';

export interface ViewTypeSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectViewType: (viewType: 'diagnostic' | 'screening') => void;
}

const ViewTypeSelectionModal: React.FC<ViewTypeSelectionModalProps> = ({
  open,
  onClose,
  onSelectViewType,
}) => {
  const diagnosticButtonRef = useRef<HTMLButtonElement>(null);
  const screeningButtonRef = useRef<HTMLButtonElement>(null);
  const [focusedButton, setFocusedButton] = React.useState<'diagnostic' | 'screening'>(
    'diagnostic'
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
          event.preventDefault();
          setFocusedButton(prev => (prev === 'diagnostic' ? 'screening' : 'diagnostic'));
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          onSelectViewType(focusedButton);
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, focusedButton, onSelectViewType, onClose]);

  // Focus the appropriate button when modal opens
  useEffect(() => {
    if (open) {
      setFocusedButton('diagnostic');
      setTimeout(() => {
        diagnosticButtonRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleDiagnosticClick = () => {
    onSelectViewType('diagnostic');
  };

  const handleScreeningClick = () => {
    onSelectViewType('screening');
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Select View Type"
      containerClassName="bg-popover shadow-lg p-10 max-w-[500px] !rounded-2xl"
    >
      <p className="mb-4 text-left font-medium text-white">How would you like to view this case?</p>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="ghost"
          ref={diagnosticButtonRef}
          onClick={handleDiagnosticClick}
          className="h-auto rounded-[8px] bg-[#2E2E2E] px-4 py-2 text-xl font-medium text-white"
        >
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Diagnostic</span>
          </div>
        </Button>

        <Button
          ref={screeningButtonRef}
          onClick={handleScreeningClick}
          className="h-auto rounded-[8px] px-4 py-2 text-xl font-medium text-white"
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
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span>Screening</span>
          </div>
        </Button>
      </div>

      <div className="mt-8 text-left text-xs font-medium text-white/70">
        * Use arrow keys to navigate, Enter to select, or Escape to cancel
      </div>
    </Modal>
  );
};

export default ViewTypeSelectionModal;
