import {
  Button,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ohif/ui-next';
import React, { useEffect, useMemo, useState } from 'react';
import type { ACRFieldConfig } from './modalityConfigs';
import { getBiradsChipColor, getModalityConfig } from './modalityConfigs';

interface ACRSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: ACRValues) => void;
  initialValues?: ACRValues;
  modalitySlug?: string | null;
  subSpecialitySlug?: string | null;
}

export type ACRValues = Record<string, string>;

/** Renders a single chip/tab button for BI-RADS selection */
const BiRadsChip: React.FC<{
  option: string;
  selected: boolean;
  onClick: () => void;
}> = ({ option, selected, onClick }) => {
  const color = getBiradsChipColor(option);
  const borderColor = color === 'green' ? '#16a34a' : '#dc2626';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md px-3 py-1.5 text-center text-sm font-medium transition-all"
      style={{
        backgroundColor: selected
          ? color === 'green'
            ? 'rgba(22, 163, 98, 0.15)'
            : 'rgba(220, 38, 38, 0.15)'
          : '#1a1a1a',
        border: selected ? `2px solid ${borderColor}` : '1px solid #4F4F4F',
        color: selected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
      }}
    >
      {option}
    </button>
  );
};

const ACRSelectorModal: React.FC<ACRSelectorModalProps> = ({
  open,
  onClose,
  onSave,
  initialValues,
  modalitySlug,
  subSpecialitySlug,
}) => {
  const config = useMemo(
    () => getModalityConfig(subSpecialitySlug, modalitySlug),
    [subSpecialitySlug, modalitySlug]
  );

  const safeInitial = initialValues ?? config.defaultValues;
  const [values, setValues] = useState<ACRValues>(safeInitial);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? config.defaultValues);
    }
  }, [open, initialValues, config.defaultValues]);

  const handleSave = () => {
    onSave(values);
    onClose();
  };

  const handleCancel = () => {
    setValues(safeInitial);
    onClose();
  };

  const renderField = (field: ACRFieldConfig) => {
    if (field.type === 'chips') {
      return (
        <div
          key={field.key}
          className="space-y-2"
        >
          <label className="text-primary-light text-base">{field.label}</label>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${field.options.length}, 1fr)` }}
          >
            {field.options.map(option => (
              <BiRadsChip
                key={option}
                option={option}
                selected={values[field.key] === option}
                onClick={() => setValues(prev => ({ ...prev, [field.key]: option }))}
              />
            ))}
          </div>
        </div>
      );
    }

    // Default: dropdown
    return (
      <div
        key={field.key}
        className="space-y-1.5"
      >
        <label className="text-primary-light text-base">{field.label}</label>
        <Select
          value={values[field.key] || ''}
          onValueChange={value => setValues(prev => ({ ...prev, [field.key]: value }))}
        >
          <SelectTrigger
            className="w-full"
            style={{
              borderRadius: '8px',
              border: '1px solid #4F4F4F',
              boxShadow: '0 1px 2px 0 rgba(10, 13, 18, 0.05)',
            }}
          >
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map(option => (
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
    );
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      containerClassName="max-w-[480px] !rounded-2xl p-10 !bg-[rgba(11,10,10,0.95)] !border !border-[#4F4F4F]"
    >
      <div className="mb-10 grid gap-2">
        <h2 className="text-primary-light text-2xl font-bold leading-tight">{config.modalTitle}</h2>
        <p className="text-primary-light text-xl opacity-80">{config.modalSubtitle}</p>
      </div>

      <div className="space-y-4">{config.fields.map(renderField)}</div>

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
    </Modal>
  );
};

export default ACRSelectorModal;
