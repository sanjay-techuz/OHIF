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
      containerClassName="max-w-[640px] !rounded-2xl p-10"
    >
      {/* <div className="bg-bkg-primary border-primary-dark rounded-lg border p-6 shadow-lg"> */}
      <div className="mb-10 grid gap-2">
        <h2 className="text-primary-light text-2xl font-bold leading-tight">ACR Classification</h2>
        <p className="text-primary-light text-xl opacity-80">
          Select values for Breast Density, Right (R), and Left (L) classifications
        </p>
      </div>

      <div className="space-y-4">
        {/* ACR Selection */}
        <div className="space-y-1.5">
          <label className="text-primary-light text-base">ACR (Breast Density)</label>
          <Select
            value={values.acr}
            onValueChange={value => setValues(prev => ({ ...prev, acr: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Breast Density" />
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
        <div className="space-y-1.5">
          <label className="text-primary-light text-base">R (Right Breast)</label>
          <Select
            value={values.r}
            onValueChange={value => setValues(prev => ({ ...prev, r: value }))}
          >
            <SelectTrigger
              className="w-full"
              style={{
                borderRadius: '8px',
                border: '1px solid #4F4F4F',
                boxShadow: '0 1px 2px 0 rgba(10, 13, 18, 0.05)',
              }}
            >
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
        <div className="space-y-1.5">
          <label className="text-primary-light text-base">L (Left Breast)</label>
          <Select
            value={values.l}
            onValueChange={value => setValues(prev => ({ ...prev, l: value }))}
          >
            <SelectTrigger
              className="w-full"
              style={{
                borderRadius: '8px',
                border: '1px solid #4F4F4F',
                boxShadow: '0 1px 2px 0 rgba(10, 13, 18, 0.05)',
              }}
            >
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
      <div className="mt-8 flex justify-end space-x-3">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="min-w-28 h-auto rounded-[8px] px-4 py-2 text-xl font-medium text-white"
          style={{
            backgroundColor: 'transparent',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#2E2E2E';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="min-w-28 h-auto rounded-[8px] px-4 py-2 text-xl font-medium text-white"
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
          Save
        </Button>
      </div>
      {/* </div> */}
    </Modal>
  );
};

export default ACRSelectorModal;
