import {
  Button,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ohif/ui-next';
import React, { useEffect, useState } from 'react';

interface ACRSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: ACRValues) => void;
  initialValues?: ACRValues;
}

export interface ACRValues {
  acr: string;
  r: string;
  l: string;
}

const ACR_OPTIONS = ['A', 'B', 'C', 'D'];
const R_OPTIONS = ['1', '2', '4a', '4b', '5'];
const L_OPTIONS = ['1', '2', '4a', '4b', '5'];

const ACRSelectorModal: React.FC<ACRSelectorModalProps> = ({
  open,
  onClose,
  onSave,
  initialValues = { acr: '', r: '', l: '' },
}) => {
  const [values, setValues] = useState<ACRValues>(initialValues);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
    }
  }, [open, initialValues]);

  const handleSave = () => {
    console.log('ACRSelectorModal - Saving values:', values);
    onSave(values);
    onClose();
  };

  const handleCancel = () => {
    console.log('ACRSelectorModal - Canceling');
    setValues(initialValues);
    onClose();
  };

  console.log('ACRSelectorModal render - open:', open, 'values:', values);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      containerClassName="max-w-md"
    >
      <div className="bg-bkg-primary border-primary-dark rounded-lg border p-6 shadow-lg">
        <div className="mb-6">
          <h2 className="text-primary-light mb-2 text-xl font-semibold">ACR Classification</h2>
          <p className="text-primary-light text-sm opacity-80">
            Select values for ACR, Right (R), and Left (L) classifications
          </p>
        </div>

        <div className="space-y-4">
          {/* ACR Selection */}
          <div className="space-y-2">
            <label className="text-primary-light text-sm font-medium">ACR (Breast Density)</label>
            <Select
              value={values.acr}
              onValueChange={value => setValues(prev => ({ ...prev, acr: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select ACR density" />
              </SelectTrigger>
              <SelectContent>
                {ACR_OPTIONS.map(option => (
                  <SelectItem
                    key={option}
                    value={option}
                  >
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* R (Right) Selection */}
          <div className="space-y-2">
            <label className="text-primary-light text-sm font-medium">R (Right Breast)</label>
            <Select
              value={values.r}
              onValueChange={value => setValues(prev => ({ ...prev, r: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Right classification" />
              </SelectTrigger>
              <SelectContent>
                {R_OPTIONS.map(option => (
                  <SelectItem
                    key={option}
                    value={option}
                  >
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* L (Left) Selection */}
          <div className="space-y-2">
            <label className="text-primary-light text-sm font-medium">L (Left Breast)</label>
            <Select
              value={values.l}
              onValueChange={value => setValues(prev => ({ ...prev, l: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Left classification" />
              </SelectTrigger>
              <SelectContent>
                {L_OPTIONS.map(option => (
                  <SelectItem
                    key={option}
                    value={option}
                  >
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="text-primary-light hover:bg-primary-dark"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary-light text-bkg-primary hover:bg-primary-dark"
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ACRSelectorModal;
