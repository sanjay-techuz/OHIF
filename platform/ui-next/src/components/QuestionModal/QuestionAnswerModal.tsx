/**
 * Config-driven question/annotation modal for all modalities.
 * Renders fields dynamically from questionModalConfigs.ts.
 *
 * @author Sanjay Balai
 */

import { useCustomParams } from '@ohif/app/src/hooks/useCustomParams';
import { apiCall, apiService } from '@ohif/core';
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
import { useUIStateStore } from '../../../../../extensions/default/src/stores/useUIStateStore';
import type { QuestionFieldConfig, QuestionModalityConfig } from './questionModalConfigs';
import {
  getBiradsChipColor,
  getQuestionModalConfig,
  normalizeFormData,
  validateNumberField,
} from './questionModalConfigs';

// ---------- Props ----------

export interface QuestionAnswerModalProps {
  open: boolean;
  formData: any;
  onClose: () => void;
  servicesManager: any;
  measurementUid?: string;
  onBreastDensityChange?: (value: string) => void;
  /** 1-based annotation index for the title (ROI - 1, Lesion - 2, etc.) */
  annotationIndex?: number;
}

// ---------- Chip component ----------

const QuestionChip: React.FC<{
  option: string;
  selected: boolean;
  onClick: () => void;
  colorMode?: 'birads' | 'neutral';
}> = ({ option, selected, onClick, colorMode = 'neutral' }) => {
  let bgColor: string;
  let borderColor: string;
  let textColor: string;

  if (colorMode === 'birads') {
    const color = getBiradsChipColor(option);
    borderColor = selected ? (color === 'green' ? '#16a34a' : '#dc2626') : '#4F4F4F';
    bgColor = selected
      ? color === 'green'
        ? 'rgba(22, 163, 98, 0.15)'
        : 'rgba(220, 38, 38, 0.15)'
      : '#1a1a1a';
    textColor = selected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
  } else {
    borderColor = selected ? '#ffffff' : '#4F4F4F';
    bgColor = selected ? 'rgba(255, 255, 255, 0.08)' : '#1a1a1a';
    textColor = selected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md px-3 py-1.5 text-center text-sm font-medium transition-all"
      style={{
        backgroundColor: bgColor,
        border: selected ? `2px solid ${borderColor}` : `1px solid ${borderColor}`,
        color: textColor,
      }}
    >
      {option}
    </button>
  );
};

// ---------- Segmented toggle for Yes/No fields ----------

const SegmentedToggle: React.FC<{
  options: string[];
  value: string;
  onChange: (value: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="inline-flex overflow-hidden rounded-lg border border-[#4F4F4F]">
    {options.map((option, idx) => {
      const isSelected = value === option;
      const isFirst = idx === 0;
      const isLast = idx === options.length - 1;

      return (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className="px-5 py-1.5 text-sm font-medium transition-all"
          style={{
            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
            color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
            borderLeft: !isFirst ? '1px solid #4F4F4F' : 'none',
            borderRadius: isFirst ? '7px 0 0 7px' : isLast ? '0 7px 7px 0' : '0',
          }}
        >
          {option}
        </button>
      );
    })}
  </div>
);

// ---------- Single field renderers ----------

const renderChipsField = (
  field: QuestionFieldConfig,
  value: string,
  handleChange: (key: string, value: string) => void,
  error?: string
) => {
  const labelClass = field.small ? 'text-primary-light text-sm' : 'text-primary-light text-base';

  return (
    <div
      key={field.key}
      className="space-y-1.5"
    >
      <label className={labelClass}>{field.label}</label>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${field.options?.length || 1}, 1fr)` }}
      >
        {field.options?.map(option => (
          <QuestionChip
            key={option}
            option={option}
            selected={value === option}
            onClick={() => handleChange(field.key, option)}
            colorMode={field.chipColorMode}
          />
        ))}
      </div>
      {error && <span className="mt-1 text-sm text-[#FF2768]">{error}</span>}
    </div>
  );
};

const renderDropdownField = (
  field: QuestionFieldConfig,
  value: string,
  handleChange: (key: string, value: string) => void,
  error?: string
) => {
  const labelClass = field.small ? 'text-primary-light text-sm' : 'text-primary-light text-base';

  return (
    <div
      key={field.key}
      className="space-y-1.5"
    >
      <label className={labelClass}>{field.label}</label>
      <Select
        value={value || undefined}
        onValueChange={v => handleChange(field.key, v)}
      >
        <SelectTrigger
          className="w-full"
          style={{
            borderRadius: '8px',
            border: '1px solid #4F4F4F',
            boxShadow: '0 1px 2px 0 rgba(10, 13, 18, 0.05)',
          }}
        >
          <SelectValue placeholder={field.placeholder || 'Select'} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map(option => (
            <SelectItem
              key={option}
              value={option}
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <span className="mt-1 text-sm text-[#FF2768]">{error}</span>}
    </div>
  );
};

const renderToggleField = (
  field: QuestionFieldConfig,
  value: string,
  handleChange: (key: string, value: string) => void,
  error?: string
) => {
  const labelClass = field.small ? 'text-primary-light text-sm' : 'text-primary-light text-base';

  return (
    <div
      key={field.key}
      className="space-y-1.5"
    >
      <label className={labelClass}>{field.label}</label>
      <div>
        <SegmentedToggle
          options={field.options || []}
          value={value}
          onChange={v => handleChange(field.key, v)}
        />
      </div>
      {error && <span className="mt-1 text-sm text-[#FF2768]">{error}</span>}
    </div>
  );
};

const renderTextareaField = (
  field: QuestionFieldConfig,
  value: string,
  handleChange: (key: string, value: string) => void
) => (
  <div
    key={field.key}
    className="space-y-1.5"
  >
    <label className="text-primary-light text-base">{field.label}</label>
    <textarea
      value={value}
      onChange={e => handleChange(field.key, e.target.value)}
      className="mt-1.5 w-full resize-none rounded-lg border border-[#4F4F4F] bg-transparent px-3 py-3 text-white focus:outline-none focus:ring-0 focus:ring-white"
      rows={3}
      placeholder={field.placeholder}
      style={{ fontFamily: 'inherit', fontSize: '1rem' }}
    />
  </div>
);

const renderNumberField = (
  field: QuestionFieldConfig,
  value: string,
  handleChange: (key: string, value: string) => void,
  error?: string
) => {
  const labelClass = field.small ? 'text-primary-light text-sm' : 'text-primary-light text-base';

  return (
    <div
      key={field.key}
      className="space-y-1.5"
    >
      <label className={labelClass}>
        {field.label}
        {field.unit && <span className="ml-1 text-white/50">({field.unit})</span>}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={e => handleChange(field.key, e.target.value)}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          placeholder={field.placeholder}
          className="flex w-full items-center bg-transparent px-3 py-3 text-xl text-white [appearance:textfield] placeholder:text-white/30 focus:outline-none focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          style={{
            fontFamily: 'inherit',
            borderRadius: '8px',
            border: '1px solid #4F4F4F',
            boxShadow: '0 1px 2px 0 rgba(10, 13, 18, 0.05)',
          }}
        />
      </div>
      {error && <span className="mt-1 text-sm text-[#FF2768]">{error}</span>}
    </div>
  );
};

// ---------- Component ----------

const QuestionAnswerModal: React.FC<QuestionAnswerModalProps> = ({
  formData,
  measurementUid,
  servicesManager,
  open,
  onClose,
  onBreastDensityChange,
  annotationIndex,
}) => {
  const { measurementService } = servicesManager.services;
  const { courseId, moduleId, caseId, studentId, userType, facultyId, isPreview } =
    useCustomParams();
  const isAddAnswerClicked = useUIStateStore(state => !!state.uiState.addAnswerClicked);
  const modalitySlug = useUIStateStore(state => state.uiState.modalitySlug as string | null);
  const subSpecialitySlug = useUIStateStore(
    state => state.uiState.subSpecialitySlug as string | null
  );

  const config: QuestionModalityConfig = useMemo(
    () => getQuestionModalConfig(subSpecialitySlug, modalitySlug),
    [subSpecialitySlug, modalitySlug]
  );

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (measurementUid) {
      if (formData) {
        setForm(normalizeFormData(formData));
      } else {
        setForm({ ...config.defaultValues });
      }
      setErrors({});
    }
  }, [measurementUid, formData, config.defaultValues]);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  // ---------- Validation (config-driven) ----------

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of config.fields) {
      if (field.showWhen) {
        const conditionValue = form[field.showWhen.field];
        if (conditionValue !== field.showWhen.value) {
          continue;
        }
      }

      // Number fields: validate min/max bounds in addition to required
      if (field.type === 'number') {
        const numError = validateNumberField((form[field.key] as string) ?? '', field);
        if (numError) {
          newErrors[field.key] = numError;
        }
        continue;
      }

      if (!field.required) {
        continue;
      }
      if (!form[field.key]) {
        newErrors[field.key] = 'Required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------- Submit ----------

  const handleSubmit = async () => {
    if (!validate() || !measurementUid) {
      return;
    }

    const measurement = measurementService?.getMeasurement(measurementUid);
    const studyInstanceUID = measurement?.referenceStudyUID;

    const body: Record<string, unknown> = {
      course_id: courseId,
      module_id: moduleId,
      case_id: caseId,
      study_instance_uid: studyInstanceUID,
      form_data: form,
      measurement_uid: measurementUid,
    };

    let success = false;

    if (userType === 'student') {
      body.student_id = studentId;
      const result = await apiCall(() => apiService.post('/user/cases/submit-form-data', body));
      success = result.success;
      if (!success) {
        console.error('Failed to submit form data:', (result as any).error);
      }
    } else {
      body.faculty_id = facultyId;
      if (isAddAnswerClicked) {
        const result = await apiCall(() => apiService.post('/admin/cases/submit-form-data', body));
        success = result.success;
        if (!success) {
          console.error('Failed to submit form data:', (result as any).error);
        }
      }
    }

    if (success) {
      if (config.propagatesBreastDensity && onBreastDensityChange && form.breastDensity) {
        onBreastDensityChange(form.breastDensity as string);
      }
      onClose();
    }
  };

  // ---------- Title ----------

  const title = annotationIndex ? `${config.titlePrefix} - ${annotationIndex}` : config.titlePrefix;

  // ---------- Build visible field list ----------

  const visibleFields: { field: QuestionFieldConfig; hasSectionHeader: boolean }[] = [];
  for (const field of config.fields) {
    if (field.showWhen) {
      const conditionValue = form[field.showWhen.field];
      if (conditionValue !== field.showWhen.value) {
        continue;
      }
    }
    visibleFields.push({ field, hasSectionHeader: !!field.sectionHeader });
  }

  // ---------- Render a single field by type ----------

  const renderFieldByType = (
    field: QuestionFieldConfig,
    value: string,
    error?: string
  ): React.ReactNode => {
    switch (field.type) {
      case 'textarea':
        return renderTextareaField(field, value, handleChange);
      case 'dropdown':
        return renderDropdownField(field, value, handleChange, error);
      case 'toggle':
        return renderToggleField(field, value, handleChange, error);
      case 'number':
        return renderNumberField(field, value, handleChange, error);
      default:
        return renderChipsField(field, value, handleChange, error);
    }
  };

  // ---------- Render fields with 2-column / 3-column grouping ----------

  const renderFields = () => {
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < visibleFields.length) {
      const { field, hasSectionHeader } = visibleFields[i];
      const value = (form[field.key] as string) ?? '';
      const error = errors[field.key];

      // Section header
      if (hasSectionHeader) {
        elements.push(
          <label
            key={`section-${field.key}`}
            className="mb-4 mt-2 block w-full border-b border-[#4F4F4F] pb-2 text-base font-bold text-white"
          >
            {field.sectionHeader}
          </label>
        );
      }

      // Check if this starts a thirdWidth group (3-column grid)
      if (field.thirdWidth) {
        const group: { field: QuestionFieldConfig; value: string; error?: string }[] = [];
        group.push({ field, value, error });
        let j = i + 1;
        while (j < visibleFields.length) {
          const next = visibleFields[j];
          if (!next.field.thirdWidth || next.hasSectionHeader) {
            break;
          }
          group.push({
            field: next.field,
            value: (form[next.field.key] as string) ?? '',
            error: errors[next.field.key],
          });
          j++;
        }

        elements.push(
          <div
            key={`grid3-${field.key}`}
            className="grid grid-cols-3 gap-x-4 gap-y-4"
          >
            {group.map(item => renderFieldByType(item.field, item.value, item.error))}
          </div>
        );

        i = j;
        continue;
      }

      // Check if this starts a halfWidth group (2-column grid)
      if (field.halfWidth) {
        const group: { field: QuestionFieldConfig; value: string; error?: string }[] = [];
        group.push({ field, value, error });
        let j = i + 1;
        while (j < visibleFields.length) {
          const next = visibleFields[j];
          if (!next.field.halfWidth || next.hasSectionHeader) {
            break;
          }
          group.push({
            field: next.field,
            value: (form[next.field.key] as string) ?? '',
            error: errors[next.field.key],
          });
          j++;
        }

        elements.push(
          <div
            key={`grid-${field.key}`}
            className="grid grid-cols-2 gap-x-4 gap-y-4"
          >
            {group.map(item => renderFieldByType(item.field, item.value, item.error))}
          </div>
        );

        i = j;
        continue;
      }

      // Full-width field
      elements.push(renderFieldByType(field, value, error));
      i++;
    }

    return elements;
  };

  // ---------- Render ----------

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      containerClassName="max-w-[520px] !rounded-2xl p-10 max-h-[90vh] overflow-auto !bg-[rgba(11,10,10,0.95)] !border !border-[#4F4F4F]"
    >
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-primary-light text-2xl font-bold leading-tight">{title}</h2>
      </div>

      <form
        className="space-y-4"
        onSubmit={e => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {renderFields()}

        {/* Action buttons */}
        {!isPreview && (
          <div className="mt-6 flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={onClose}
              className="min-w-28 h-auto rounded-[8px] px-4 py-2 text-xl font-medium text-white"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#2E2E2E';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Close
            </Button>
            <Button
              type="submit"
              className="min-w-28 h-auto rounded-[8px] px-4 py-2 text-xl font-medium text-white"
              style={{ backgroundColor: 'hsl(var(--highlight))' }}
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
        )}
      </form>
    </Modal>
  );
};

export default QuestionAnswerModal;
