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
      containerClassName="rounded-lg bg-popover shadow-lg max-w-md"
    >
      <div className="p-6">
        <p className="mb-6 text-white">Do you want to recall this case for further review?</p>
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="px-6 py-2 text-base font-semibold"
          >
            Close
          </Button>
          <Button
            onClick={handleRecall}
            className="px-6 py-2 text-base font-semibold"
          >
            Recall
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RecallModal;
