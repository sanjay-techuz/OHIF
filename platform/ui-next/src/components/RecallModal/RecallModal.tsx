import { Button, Modal } from '@ohif/ui-next';
import React from 'react';

export interface RecallModalProps {
  open: boolean;
  onClose: () => void;
}

const RecallModal: React.FC<RecallModalProps> = ({ open, onClose }) => {
  const handleRecall = () => {
    console.log('Recall button clicked - action needed');
    // Add any recall logic here
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Screening Recall"
      containerClassName="bg-popover shadow-lg p-10 max-w-[460px] !rounded-2xl"
    >
      <p className="mb-6 text-left font-medium text-white">
        Do you want to recall this case for further review?
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="ghost"
          onClick={onClose}
          className="h-auto rounded-[8px] bg-[#2E2E2E] px-4 py-2 text-xl font-medium text-white"
        >
          Close
        </Button>

        <Button
          onClick={handleRecall}
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
          Recall
        </Button>
      </div>
    </Modal>
  );
};

export default RecallModal;
