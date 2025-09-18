import { useCustomParams } from '@ohif/app/src/hooks/useCustomParams';
import { apiCall, apiService } from '@ohif/core';
import { Button, Modal } from '@ohif/ui-next';
import React, { useEffect, useState } from 'react';
import MammographyQuestions from './MammographyQuestions';
import MRIQuestion from './MRIQuestion';
import USQuestion from './USQuestion';

export interface QuestionAnswerModalProps {
  open: boolean;
  formData: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  onClose: () => void;
  servicesManager: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  measurementUid?: string; // Changed from currentMeasurement to measurementUid
}

// Initial states for both forms
const mammographyInitialState = {
  breastDensity: '',
  definition: '',
  mass: '',
  microlcalcification: '',
  asymmetry: '',
  architecturalDistortion: '',
  associatedAbnormalitySkin: '',
  associatedAbnormalityNipple: '',
  associatedAbnormalityLymphNode: '',
  biRads: '',
  remarks: '',
};

const mriInitialState = {
  fgt: '',
  bpe: '',
  definition: '',
  mass: '',
  nme: '',
  associatedAbnormalitySkin: '',
  associatedAbnormalityNipple: '',
  associatedAbnormalityLymphNode: '',
  associatedAbnormalityChestWall: '',
  biRads: '',
  remarks: '',
};

const usgInitialState = {
  definition: '',
  cryst: '',
  solid: '',
  nonMassLesion: '',
  associatedAbnormalitySkin: '',
  associatedAbnormalityNipple: '',
  associatedAbnormalityLymphNode: '',
  biRads: '',
  remarks: '',
};

function getQuestionTypeFromModality(modality: string): 'mammography' | 'mri' | 'usg' | undefined {
  const mammographyModalities = ['MG', 'MMG', 'DBT', '2D MG', '3D MG'];
  const mriModalities = ['MR', 'MRI'];
  const usgModalities = ['US', 'USG'];

  if (mammographyModalities.includes(modality)) {
    return 'mammography';
  }
  if (mriModalities.includes(modality)) {
    return 'mri';
  }
  if (usgModalities.includes(modality)) {
    return 'usg';
  }
  return 'mammography';
}

const QuestionAnswerModal = ({
  formData,
  measurementUid,
  servicesManager,
  open,
  onClose,
}: QuestionAnswerModalProps) => {
  const { displaySetService, measurementService } = servicesManager.services;
  const { courseId, moduleId, caseId, studentId, userType, facultyId, isPreview } =
    useCustomParams();

  // Get form data from MeasurementService using measurementUid
  const [formType, setFormType] = useState<'mammography' | 'mri' | 'usg'>('mammography');
  const [form, setForm] = useState<Record<string, unknown>>(formData || {});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Helper functions for MeasurementService
  // const getFormDataFromMeasurement = (uid: string) => {
  //   try {
  //     const measurement = measurementService?.getMeasurement(uid);
  //     console.log('measurement--------------', measurement);
  //     return measurement?.formData || null;
  //   } catch (error) {
  //     console.warn('Failed to load form data from measurement:', error);
  //     return null;
  //   }
  // };

  // const saveFormDataToMeasurement = (
  //   uid: string,
  //   formType: string,
  //   formData: Record<string, unknown>
  // ) => {
  //   try {
  //     const measurement = measurementService?.getMeasurement(uid);
  //     if (measurement) {
  //       // Store form data directly in the measurement object
  //       measurement.formData = {
  //         formType,
  //         formData,
  //         lastModified: Date.now(),
  //         measurementUid: uid,
  //       };

  //       // Update the measurement in the service
  //       measurementService.updateMeasurement(uid, measurement);

  //       console.log(`Form data saved for measurement ${uid}:`, measurement.formData);
  //     }
  //   } catch (error) {
  //     console.warn('Failed to save form data to measurement:', error);
  //   }
  // };

  // Load form data when measurementUid changes
  useEffect(() => {
    if (measurementUid) {
      // const storedFormData = getFormDataFromMeasurement(measurementUid);
      console.log('formData--------------', formData);
      const measurement = measurementService?.getMeasurement(measurementUid);
      if (measurement) {
        const displaySetInstanceUID = measurement.displaySetInstanceUID;
        let currentModality;

        if (displaySetInstanceUID) {
          const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
          currentModality = displaySet?.Modality;
        }

        const detectedType = getQuestionTypeFromModality(currentModality);
        setFormType(detectedType);
        if (formData) {
          // Use stored form type and data
          setForm(formData);
        } else {
          // No stored data, try to detect from measurement

          // Initialize form data for this measurement
          // saveFormDataToMeasurement(measurementUid, detectedType, {});

          // Set initial form state based on form type
          const initialState =
            detectedType === 'mri'
              ? mriInitialState
              : detectedType === 'usg'
                ? usgInitialState
                : mammographyInitialState;

          setForm(initialState);
        }
      }
    }
  }, [measurementUid, formData]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Validation for each form
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (formType === 'mammography') {
      if (!form.breastDensity) {
        newErrors.breastDensity = 'Required';
      }
      if (!form.definition) {
        newErrors.definition = 'Required';
      }
      if (form.definition === 'AbNormal') {
        if (!form.mass) {
          newErrors.mass = 'Required';
        }
        if (!form.microlcalcification) {
          newErrors.microlcalcification = 'Required';
        }
        if (!form.asymmetry) {
          newErrors.asymmetry = 'Required';
        }
        if (!form.architecturalDistortion) {
          newErrors.architecturalDistortion = 'Required';
        }
        if (!form.associatedAbnormalitySkin) {
          newErrors.associatedAbnormalitySkin = 'Required';
        }
        if (!form.associatedAbnormalityNipple) {
          newErrors.associatedAbnormalityNipple = 'Required';
        }
        if (!form.associatedAbnormalityLymphNode) {
          newErrors.associatedAbnormalityLymphNode = 'Required';
        }
      }
      if (!form.biRads) {
        newErrors.biRads = 'Required';
      }
    } else if (formType === 'mri') {
      if (!form.fgt) {
        newErrors.fgt = 'Required';
      }
      if (!form.bpe) {
        newErrors.bpe = 'Required';
      }
      if (!form.definition) {
        newErrors.definition = 'Required';
      }
      if (form.definition === 'Abnormal') {
        if (!form.mass) {
          newErrors.mass = 'Required';
        }
        if (!form.nme) {
          newErrors.nme = 'Required';
        }
        if (!form.associatedAbnormalitySkin) {
          newErrors.associatedAbnormalitySkin = 'Required';
        }
        if (!form.associatedAbnormalityNipple) {
          newErrors.associatedAbnormalityNipple = 'Required';
        }
        if (!form.associatedAbnormalityLymphNode) {
          newErrors.associatedAbnormalityLymphNode = 'Required';
        }
        if (!form.associatedAbnormalityChestWall) {
          newErrors.associatedAbnormalityChestWall = 'Required';
        }
      }
      if (!form.biRads) {
        newErrors.biRads = 'Required';
      }
    } else if (formType === 'usg') {
      if (!form.definition) {
        newErrors.definition = 'Required';
      }
      if (form.definition === 'Abnormal') {
        if (!form.cryst) {
          newErrors.cryst = 'Required';
        }
        if (!form.solid) {
          newErrors.solid = 'Required';
        }
        if (!form.nonMassLesion) {
          newErrors.nonMassLesion = 'Required';
        }
        if (!form.associatedAbnormalitySkin) {
          newErrors.associatedAbnormalitySkin = 'Required';
        }
        if (!form.associatedAbnormalityNipple) {
          newErrors.associatedAbnormalityNipple = 'Required';
        }
        if (!form.associatedAbnormalityLymphNode) {
          newErrors.associatedAbnormalityLymphNode = 'Required';
        }
      }
      if (!form.biRads) {
        newErrors.biRads = 'Required';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validate() && measurementUid) {
      console.log('Form submitted:', form);

      const measurement = measurementService?.getMeasurement(measurementUid);
      const studyInstanceUID = measurement?.referenceStudyUID;

      const body = {
        course_id: courseId,
        module_id: moduleId,
        case_id: caseId,
        study_instance_uid: studyInstanceUID,
        form_data: form,
        measurement_uid: measurementUid,
        student_id: '',
        faculty_id: '',
      };

      let result = null;
      if (userType === 'student') {
        body.student_id = studentId;
        delete body.faculty_id;
        result = await apiCall(() => apiService.post('/student/submit-form-data', body));
      } else {
        body.faculty_id = facultyId;
        delete body.student_id;
        result = await apiCall(() => apiService.post('/faculty/submit-form-data', body));
      }

      if (result.success) {
        console.log('Form data submitted successfully');
        onClose();
      } else {
        console.error('Failed to submit form data:', (result as any).error);
        // Handle error - could show notification or set error state
      }
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`${formType === 'mammography' ? 'Mammography Question' : formType === 'mri' ? 'MRI Question' : 'USG Question'}`}
      containerClassName="rounded-lg bg-gray-900 shadow-lg max-w-xl"
    >
      <form
        className="space-y-5 overflow-y-auto p-6"
        style={{ maxHeight: '80vh' }}
        onSubmit={e => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {formType === 'mammography' && (
          <MammographyQuestions
            form={form}
            errors={errors}
            handleChange={handleChange}
          />
        )}
        {formType === 'mri' && (
          <MRIQuestion
            form={form}
            errors={errors}
            handleChange={handleChange}
          />
        )}
        {formType === 'usg' && (
          <USQuestion
            form={form}
            errors={errors}
            handleChange={handleChange}
          />
        )}
        {/* Buttons */}
        {!isPreview && (
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="submit"
              className="px-6 py-2 text-base font-semibold"
            >
              Save
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-base font-semibold"
            >
              Close
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default QuestionAnswerModal;
