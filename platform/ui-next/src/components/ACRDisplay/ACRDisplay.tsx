// ACRDisplay component
import { useCustomParams } from '@ohif/app/src/hooks/useCustomParams';
import { apiCall, apiService } from '@ohif/core';
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
        className={`rounded-lg border ${className}`}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: 'rgba(11, 10, 10, 0.95)',
          border: '1px solid #6B6C6E',
          position: 'relative',
        }}
      >
        <div className="flex items-center gap-4">
          {/* ACR Section */}
          <div className="flex-raw flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-300">Breast Density</span>
            <button
              onClick={handleButtonClick}
              className="rounded-md px-4 py-1 text-center text-sm font-medium text-white transition-colors"
              style={{
                backgroundColor: '#232323',
              }}
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
              {studentValues.acr || '-'}
            </button>
          </div>

          {/* R Section */}
          <div className="flex-raw flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-300">R</span>
            <button
              onClick={handleButtonClick}
              className="rounded-md px-4 py-0.5 text-center text-sm font-medium text-white transition-colors"
              style={{
                backgroundColor: '#232323',
              }}
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
              {studentValues.r || '-'}
            </button>
          </div>

          {/* L Section */}
          <div className="flex-raw flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-300">L</span>
            <button
              onClick={handleButtonClick}
              className="rounded-md px-4 py-0.5 text-center text-sm font-medium text-white transition-colors"
              style={{
                backgroundColor: '#232323',
              }}
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
              {studentValues.l || '-'}
            </button>
          </div>

          {/* Hamburger Menu Icon */}
          {/* <button
            onClick={handleButtonClick}
            className="ml-auto p-1 text-gray-300 transition-colors hover:text-white"
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
          </button> */}
        </div>
      </div>

      {isPreview && (
        <div
          className={`rounded-lg border ${className}`}
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(4, 74, 28, 0.95)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            position: 'relative',
            marginTop: '0.5rem',
          }}
        >
          <div className="flex items-center gap-6">
            {/* ACR Section */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-300">Breast Density</span>
              <button
                onClick={handleButtonClick}
                className="min-w-[60px] rounded-md px-3 py-1.5 text-center text-sm font-medium text-white transition-colors"
                style={{
                  backgroundColor: '#232323',
                }}
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
                {facultyValues.acr || '-'}
              </button>
            </div>

            {/* R Section */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-300">R</span>
              <button
                onClick={handleButtonClick}
                className="min-w-[60px] rounded-md px-3 py-1.5 text-center text-sm font-medium text-white transition-colors"
                style={{
                  backgroundColor: '#232323',
                }}
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
                {facultyValues.r || '-'}
              </button>
            </div>

            {/* L Section */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-300">L</span>
              <button
                onClick={handleButtonClick}
                className="min-w-[60px] rounded-md px-3 py-1.5 text-center text-sm font-medium text-white transition-colors"
                style={{
                  backgroundColor: '#232323',
                }}
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
                {facultyValues.l || '-'}
              </button>
            </div>

            {/* Hamburger Menu Icon */}
            <button
              onClick={handleButtonClick}
              className="ml-auto p-1 text-gray-300 transition-colors hover:text-white"
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
            </button>
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
