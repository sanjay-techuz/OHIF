// ACRDisplay component
import { useCustomParams } from '@ohif/app/src/hooks/useCustomParams';
import { apiCall, apiService } from '@ohif/core';
import { Button } from '@ohif/ui-next';
import React, { useState } from 'react';
import { useUIStateStore } from '../../../../../extensions/default/src/stores/useUIStateStore';
import ACRSelectorModal, { ACRValues } from '../ACRSelectorModal';

interface ACRDisplayProps {
  studentValues?: ACRValues;
  facultyValues?: ACRValues;
  onValuesChange?: (values: ACRValues) => void;
  className?: string;
}

const ACRDisplay: React.FC<ACRDisplayProps> = ({
  studentValues = { acr: '', r: '', l: '' },
  facultyValues = { acr: '', r: '', l: '' },
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
  } = useCustomParams();
  const isAddAnswerClicked = useUIStateStore(state => !!state.uiState.addAnswerClicked);
  const handleSave = async (newValues: ACRValues) => {
    console.log('ACR values saved:', newValues);
    const body = {
      course_id: courseId,
      module_id: moduleId,
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
        // Handle error - could show notification or set error state
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
          // Handle error - could show notification or set error state
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

  console.log('ACRDisplay render - showModal:', showModal, 'values:', studentValues);

  return (
    <>
      <div
        className={`rounded-lg border shadow-lg ${className}`}
        style={{
          padding: '0.3rem 0.75rem',
          backgroundColor: 'rgba(4, 28, 74, var(--tw-bg-opacity))',
          border: '1px solid rgba(59, 130, 246, 0.5)',
          position: 'relative',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* ACR Section */}
            <div className="relative flex flex-col items-center">
              <span
                className="text-primary-light absolute px-1 text-xs font-medium"
                style={{
                  backgroundColor: 'rgba(4, 28, 74, var(--tw-bg-opacity))',
                  zIndex: 1,
                }}
              >
                ACR
              </span>
              <Button
                variant="ghost"
                className="border-primary-light text-primary-light hover:bg-primary-dark mt-2 h-8 min-w-[40px] rounded border px-2"
                style={{ backgroundColor: 'rgba(4, 28, 74, 0.8)' }}
                onClick={handleButtonClick}
              >
                {studentValues.acr || '-'}
              </Button>
            </div>

            {/* R Section */}
            <div className="relative flex flex-col items-center">
              <span
                className="text-primary-light absolute px-1 text-xs font-medium"
                style={{
                  backgroundColor: 'rgba(4, 28, 74, var(--tw-bg-opacity))',
                  zIndex: 1,
                }}
              >
                R
              </span>
              <Button
                variant="ghost"
                className="border-primary-light text-primary-light hover:bg-primary-dark mt-2 h-8 min-w-[40px] rounded border px-2"
                style={{ backgroundColor: 'rgba(4, 28, 74, 0.8)' }}
                onClick={handleButtonClick}
              >
                {studentValues.r || '-'}
              </Button>
            </div>

            {/* L Section */}
            <div className="relative flex flex-col items-center">
              <span
                className="text-primary-light absolute px-1 text-xs font-medium"
                style={{
                  backgroundColor: 'rgba(4, 28, 74, var(--tw-bg-opacity))',
                  zIndex: 1,
                }}
              >
                L
              </span>
              <Button
                variant="ghost"
                className="border-primary-light text-primary-light hover:bg-primary-dark mt-2 h-8 min-w-[40px] rounded border px-2"
                style={{ backgroundColor: 'rgba(4, 28, 74, 0.8)' }}
                onClick={handleButtonClick}
              >
                {studentValues.l || '-'}
              </Button>
            </div>
          </div>

          {/* Hamburger Menu Icon */}
          <Button
            variant="ghost"
            className="text-primary-light hover:bg-primary-dark p-1"
            onClick={handleButtonClick}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line
                x1="3"
                y1="6"
                x2="21"
                y2="6"
              />
              <line
                x1="3"
                y1="12"
                x2="21"
                y2="12"
              />
              <line
                x1="3"
                y1="18"
                x2="21"
                y2="18"
              />
            </svg>
          </Button>
        </div>
      </div>

      {isPreview && (
        <div
          className={`rounded-lg border shadow-lg ${className}`}
          style={{
            padding: '0.3rem 0.75rem',
            backgroundColor: 'rgba(4, 74, 28, var(--tw-bg-opacity))',
            border: '1px solid rgba(34, 197, 94, 0.5)',
            position: 'relative',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* ACR Section */}
              <div className="relative flex flex-col items-center">
                <span
                  className="text-primary-light absolute px-1 text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(4, 74, 28, var(--tw-bg-opacity))',
                    zIndex: 1,
                  }}
                >
                  ACR
                </span>
                <Button
                  variant="ghost"
                  className="border-primary-light text-primary-light hover:bg-primary-dark mt-2 h-8 min-w-[40px] rounded border px-2"
                  style={{ backgroundColor: 'rgba(4, 74, 28, 0.8)' }}
                  onClick={handleButtonClick}
                >
                  {facultyValues.acr || '-'}
                </Button>
              </div>

              {/* R Section */}
              <div className="relative flex flex-col items-center">
                <span
                  className="text-primary-light absolute px-1 text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(4, 74, 28, var(--tw-bg-opacity))',
                    zIndex: 1,
                  }}
                >
                  R
                </span>
                <Button
                  variant="ghost"
                  className="border-primary-light text-primary-light hover:bg-primary-dark mt-2 h-8 min-w-[40px] rounded border px-2"
                  style={{ backgroundColor: 'rgba(4, 74, 28, 0.8)' }}
                  onClick={handleButtonClick}
                >
                  {facultyValues.r || '-'}
                </Button>
              </div>

              {/* L Section */}
              <div className="relative flex flex-col items-center">
                <span
                  className="text-primary-light absolute px-1 text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(4, 74, 28, var(--tw-bg-opacity))',
                    zIndex: 1,
                  }}
                >
                  L
                </span>
                <Button
                  variant="ghost"
                  className="border-primary-light text-primary-light hover:bg-primary-dark mt-2 h-8 min-w-[40px] rounded border px-2"
                  style={{ backgroundColor: 'rgba(4, 74, 28, 0.8)' }}
                  onClick={handleButtonClick}
                >
                  {facultyValues.l || '-'}
                </Button>
              </div>
            </div>

            {/* Hamburger Menu Icon */}
            <Button
              variant="ghost"
              className="text-primary-light hover:bg-primary-dark p-1"
              onClick={handleButtonClick}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line
                  x1="3"
                  y1="6"
                  x2="21"
                  y2="6"
                />
                <line
                  x1="3"
                  y1="12"
                  x2="21"
                  y2="12"
                />
                <line
                  x1="3"
                  y1="18"
                  x2="21"
                  y2="18"
                />
              </svg>
            </Button>
          </div>
        </div>
      )}

      <ACRSelectorModal
        open={showModal}
        onClose={handleClose}
        onSave={handleSave}
        initialValues={studentValues}
      />
    </>
  );
};

export default ACRDisplay;
