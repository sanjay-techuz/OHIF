// ACRDisplay component
import { useCustomParams } from '@ohif/app/src/hooks/useCustomParams';
import { apiCall, apiService, buildFellowshipBody } from '@ohif/core';
import React, { useMemo, useState } from 'react';
import { useUIStateStore } from '../../../../../extensions/default/src/stores/useUIStateStore';
import ACRSelectorModal from '../ACRSelectorModal';
import type { ACRValues } from '../ACRSelectorModal';
import { getModalityConfig } from '../ACRSelectorModal/modalityConfigs';

interface ACRDisplayProps {
  studentValues?: ACRValues;
  facultyValues?: ACRValues;
  onValuesChange?: (values: ACRValues) => void;
  className?: string;
}

const ACRDisplay: React.FC<ACRDisplayProps> = ({
  studentValues,
  facultyValues,
  onValuesChange,
  className = '',
}) => {
  const [showModal, setShowModal] = useState(false);
  const {
    StudyInstanceUIDs,
    courseId,
    moduleId,
    caseId,
    studentId,
    viewType,
    userType,
    facultyId,
    isPreview,
    isFellowship,
    programId,
    phaseId,
  } = useCustomParams();
  const isAddAnswerClicked = useUIStateStore(state => !!state.uiState.addAnswerClicked);
  const modalitySlug = useUIStateStore(state => state.uiState.modalitySlug as string | null);
  const subSpecialitySlug = useUIStateStore(
    state => state.uiState.subSpecialitySlug as string | null
  );

  const config = useMemo(
    () => getModalityConfig(subSpecialitySlug, modalitySlug),
    [subSpecialitySlug, modalitySlug]
  );

  const safeStudentValues = studentValues ?? config.defaultValues;
  const safeFacultyValues = facultyValues ?? config.defaultValues;

  const handleSave = async (newValues: ACRValues) => {
    console.log('ACR values saved:', newValues);
    const body: Record<string, unknown> = {
      ...(isFellowship
        ? buildFellowshipBody({ isFellowship, programId, phaseId, moduleId })
        : { course_id: courseId, module_id: moduleId }),
      case_id: caseId,
      student_id: '',
      result_data: newValues,
      view_type: viewType,
      user_type: userType,
      faculty_id: '',
      study_instance_uid: StudyInstanceUIDs,
    };

    if (userType === 'student') {
      body.student_id = studentId;
      delete body.faculty_id;
      const result = await apiCall(() => apiService.post('/user/cases/case-answer', body));
      if (result.success) {
        console.log('ACR values saved successfully');
        onValuesChange?.(newValues);
      } else {
        console.error('Failed to save ACR values:', (result as any).error);
      }
    } else {
      body.faculty_id = facultyId;
      delete body.student_id;
      if (isAddAnswerClicked) {
        const result = await apiCall(() => apiService.post('/admin/cases/case-answer', body));
        if (result.success) {
          console.log('ACR values saved successfully');
          onValuesChange?.(newValues);
        } else {
          console.error('Failed to save ACR values:', (result as any).error);
        }
      }
    }
  };

  const handleButtonClick = () => {
    if (isPreview) {
      return;
    }
    console.log('ACR button clicked, opening modal...');
    setShowModal(true);
  };

  const handleClose = () => {
    console.log('ACR modal closing...');
    setShowModal(false);
  };

  console.log('ACRDisplay render - showModal:', showModal, 'values:', safeStudentValues);

  return (
    <>
      {/* Student / Active interpretation bar */}
      <div
        className={`rounded-lg border ${className}`}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: 'rgba(11, 10, 10, 0.95)',
          border: '1px solid #6B6C6E',
          position: 'relative',
        }}
      >
        <div className="flex items-center gap-4">
          {config.displaySegments.map((segment, idx) => (
            <div
              key={segment.valueKey}
              className={`flex items-center gap-3 ${idx === 0 ? 'relative' : ''}`}
            >
              {idx === 0 && (
                <span className="absolute top-[-1rem] whitespace-nowrap bg-[#0B0A0A] px-2 text-xs text-white/80">
                  Your Interpretation
                </span>
              )}
              <span className="text-base text-white/80">{segment.label}</span>
              <button
                onClick={handleButtonClick}
                className="rounded-md px-4 py-1 text-center text-base text-white/80 transition-colors"
                style={{ backgroundColor: '#232323' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#2E2E2E';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#232323';
                }}
                onFocus={e => {
                  e.currentTarget.style.backgroundColor = '#2E2E2E';
                }}
                onBlur={e => {
                  e.currentTarget.style.backgroundColor = '#232323';
                }}
              >
                {safeStudentValues[segment.valueKey] || '-'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Expert / Preview interpretation bar */}
      {isPreview && (
        <div
          className={`rounded-lg border ${className}`}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(11, 10, 10, 0.95)',
            border: '1px solid #6B6C6E',
            position: 'relative',
          }}
        >
          <div className="flex items-center gap-4">
            {config.displaySegments.map((segment, idx) => (
              <div
                key={segment.valueKey}
                className={`flex items-center gap-3 ${idx === 0 ? 'relative' : ''}`}
              >
                {idx === 0 && (
                  <span className="absolute top-[-1rem] whitespace-nowrap bg-[#0B0A0A] px-2 text-xs text-white/80">
                    Expert Interpretation
                  </span>
                )}
                <span className="text-base text-white/80">{segment.label}</span>
                <button
                  onClick={handleButtonClick}
                  className="rounded-md px-4 py-1 text-center text-base text-white/80 transition-colors"
                  style={{ backgroundColor: '#232323' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#2E2E2E';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#232323';
                  }}
                  onFocus={e => {
                    e.currentTarget.style.backgroundColor = '#2E2E2E';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.backgroundColor = '#232323';
                  }}
                >
                  {safeFacultyValues[segment.valueKey] || '-'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ACRSelectorModal
        open={showModal}
        onClose={handleClose}
        onSave={handleSave}
        initialValues={safeStudentValues}
        modalitySlug={modalitySlug}
        subSpecialitySlug={subSpecialitySlug}
      />
    </>
  );
};

export default ACRDisplay;
