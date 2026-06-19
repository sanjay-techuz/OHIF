const supportedTools = [
  'Length',
  'EllipticalROI',
  'CircleROI',
  'Bidirectional',
  'ArrowAnnotate',
  'Angle',
  'CobbAngle',
  'Probe',
  'RectangleROI',
  'PlanarFreehandROI',
  'SplineROI',
  'LivewireContour',
  'UltrasoundDirectionalTool',
  'SCOORD3DPoint',
  'SegmentBidirectional',
  // CalibrationLine extends LengthTool (same 2-handle shape). The mapping in
  // initMeasurementService.ts:148-154 already routes CalibrationLine through
  // Length.toMeasurement, but without this entry the allow-list check in
  // Length.ts throws "Tool not supported" on every first mouseDown of the
  // Calibration tool. The created measurement is immediately removed in the
  // special-case `finally` block after calibration completes (see
  // initMeasurementService.ts:233-240), so it never persists.
  'CalibrationLine',
];

export default supportedTools;
