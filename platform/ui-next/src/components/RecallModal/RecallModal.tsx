import { useCustomParams } from '@ohif/app/src/hooks/useCustomParams';
import { apiService, buildFellowshipBody } from '@ohif/core';
import { Button, Modal } from '@ohif/ui-next';
import React from 'react';
import { useUIStateStore } from '../../../../../extensions/default/src/stores/useUIStateStore';

export interface RecallModalProps {
  open: boolean;
  onClose: () => void;
  servicesManager: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  measurementUid?: string; // Changed from currentMeasurement to measurementUid
  annotationData?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  /**
   * Faculty-dashboard (user) flow only: fires when the faculty confirms Recall. The case-level
   * recall decision isn't saved to the backend during drawing in this flow — it's sent per course
   * at Submit — so the parent records it here until then.
   */
  onUserFacultyRecall?: () => void;
}

const RecallModal: React.FC<RecallModalProps> = ({
  open,
  onClose,
  servicesManager,
  measurementUid,
  annotationData,
  onUserFacultyRecall,
}) => {
  const { displaySetService, measurementService } = servicesManager.services;
  const {
    courseId,
    caseId,
    studentId,
    viewType,
    moduleId,
    userType,
    facultyId,
    answerAuth,
    isPreview,
    isFellowship,
    programId,
    phaseId,
  } = useCustomParams();

  const handleRecall = async () => {
    console.log('Recall button clicked - action needed');
    // Add any recall logic here

    const measurement = measurementService?.getMeasurement(measurementUid);
    if (measurement) {
      const displaySetInstanceUID = measurement.displaySetInstanceUID;
      const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);

      const body: Record<string, unknown> = {
        ...(isFellowship
          ? buildFellowshipBody({ isFellowship, programId, phaseId, moduleId })
          : { course_id: courseId, module_id: moduleId }),
        case_id: caseId,
        view_type: viewType,
        study_instance_uid: measurement.referenceStudyUID,
        measurement_uid: measurement.uid,
        tool_name: measurement.toolName,
        measurement_data: measurement,
        annotation_data: annotationData,
        modality: displaySet?.Modality || '',
        student_id: '',
        faculty_id: '',
        is_recall: true,
      };
      if (userType === 'student') {
        body.student_id = studentId;
        delete body.faculty_id;
        await apiService.post('/user/cases/annotation-measurements', body);
      } else {
        body.faculty_id = facultyId;
        delete body.student_id;
        const isAddAnswerClicked = !!useUIStateStore.getState().uiState.addAnswerClicked;
        const isUserFacultyAnswer = userType === 'faculty' && answerAuth === 'user';
        if (isUserFacultyAnswer) {
          // Faculty-dashboard (user) flow: don't save to admin — record the recall decision in
          // the parent; it's sent per course (with the annotation) from the Submit Answer picker.
          onUserFacultyRecall?.();
        } else if (isAddAnswerClicked) {
          await apiService.post('/admin/cases/annotation-measurements', body);
        }
      }
    }
    onClose();
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
