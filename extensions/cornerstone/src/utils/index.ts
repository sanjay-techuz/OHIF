import { isReferenceViewable } from './isReferenceViewable';
import promptHydrationDialog, {
  HydrationCallback,
  HydrationDialogProps,
  HydrationSRResult,
} from './promptHydrationDialog';
import {
  setupSegmentationDataModifiedHandler,
  setupSegmentationModifiedHandler,
} from './segmentationHandlers';
import { handleSegmentChange } from './segmentUtils';

// Mammography utilities
import { detectMammographyCaseType, isDBTCase, isFFDMCase } from './mammographyCaseDetector';

const utils = {
  handleSegmentChange,
  isReferenceViewable,
  setupSegmentationDataModifiedHandler,
  setupSegmentationModifiedHandler,
  promptHydrationDialog,
  // Mammography utilities
  detectMammographyCaseType,
  isDBTCase,
  isFFDMCase,
};

export type { HydrationCallback, HydrationDialogProps, HydrationSRResult };

export default utils;
