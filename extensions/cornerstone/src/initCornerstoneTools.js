import { LabelmapSlicePropagationTool, MarkerLabelmapTool } from '@cornerstonejs/ai';
import * as polySeg from '@cornerstonejs/polymorphic-segmentation';
import {
  addTool,
  AdvancedMagnifyTool,
  AngleTool,
  annotation,
  ArrowAnnotateTool,
  BidirectionalTool,
  BrushTool,
  CircleROITool,
  CircleScissorsTool,
  CobbAngleTool,
  CrosshairsTool,
  DragProbeTool,
  EllipticalROITool,
  init,
  LengthTool,
  LivewireContourTool,
  MagnifyTool,
  MIPJumpToClickTool,
  OrientationMarkerTool,
  PaintFillTool,
  PanTool,
  PlanarFreehandContourSegmentationTool,
  PlanarFreehandROITool,
  ProbeTool,
  RectangleROIThresholdTool,
  RectangleROITool,
  RectangleScissorsTool,
  ReferenceLinesTool,
  RegionSegmentPlusTool,
  SegmentBidirectionalTool,
  SegmentSelectTool,
  SphereScissorsTool,
  SplineROITool,
  StackScrollTool,
  TrackballRotateTool,
  UltrasoundDirectionalTool,
  VolumeRotateTool,
  WindowLevelRegionTool,
  WindowLevelTool,
  ZoomTool,
} from '@cornerstonejs/tools';

import CalibrationLineTool from './tools/CalibrationLineTool';
import ImageOverlayViewerTool from './tools/ImageOverlayViewerTool';
import {
  CustomCircleROITool,
  CustomEllipticalROITool,
  CustomRectangleROITool,
} from './tools/CustomRoiHitTesting';
import { CustomLengthTool } from './tools/CustomLengthTool';

export default function initCornerstoneTools(configuration = {}) {
  CrosshairsTool.isAnnotation = false;
  LabelmapSlicePropagationTool.isAnnotation = false;
  MarkerLabelmapTool.isAnnotation = false;
  ReferenceLinesTool.isAnnotation = false;
  AdvancedMagnifyTool.isAnnotation = false;
  PlanarFreehandContourSegmentationTool.isAnnotation = false;

  init({
    addons: {
      polySeg,
    },
    computeWorker: {
      autoTerminateOnIdle: {
        enabled: false,
      },
    },
  });
  addTool(PanTool);
  addTool(SegmentBidirectionalTool);
  addTool(WindowLevelTool);
  addTool(StackScrollTool);
  addTool(VolumeRotateTool);
  addTool(ZoomTool);
  addTool(ProbeTool);
  addTool(MIPJumpToClickTool);
  // UX fix: subclass repositions the textbox so the mm label lands near the
  // line midpoint instead of 25px off the right endpoint. Same toolName so
  // existing measurements + LengthTool config (textBoxVisibility: true,
  // textBoxLinkLineWidth: '0') still apply. See CustomLengthTool.ts.
  addTool(CustomLengthTool);
  // UX fix: replace stock CircleROI/RectangleROI/EllipticalROI with subclasses
  // that add a visible move handle and a border-resize affordance. See
  // CustomRoiHitTesting.ts. The subclasses keep the same static toolName
  // ('CircleROI' etc.) so saved measurements + measurement-service mappings
  // keep working untouched.
  addTool(CustomRectangleROITool);
  addTool(RectangleROIThresholdTool);
  addTool(CustomEllipticalROITool);
  addTool(CustomCircleROITool);
  addTool(BidirectionalTool);
  addTool(ArrowAnnotateTool);
  addTool(DragProbeTool);
  addTool(AngleTool);
  addTool(CobbAngleTool);
  addTool(MagnifyTool);
  addTool(CrosshairsTool);
  addTool(RectangleScissorsTool);
  addTool(SphereScissorsTool);
  addTool(CircleScissorsTool);
  addTool(BrushTool);
  addTool(PaintFillTool);
  addTool(ReferenceLinesTool);
  addTool(CalibrationLineTool);
  addTool(TrackballRotateTool);
  addTool(ImageOverlayViewerTool);
  addTool(AdvancedMagnifyTool);
  addTool(UltrasoundDirectionalTool);
  addTool(PlanarFreehandROITool);
  addTool(SplineROITool);
  addTool(LivewireContourTool);
  addTool(OrientationMarkerTool);
  addTool(WindowLevelRegionTool);
  addTool(PlanarFreehandContourSegmentationTool);
  addTool(SegmentSelectTool);
  addTool(LabelmapSlicePropagationTool);
  addTool(MarkerLabelmapTool);
  addTool(RegionSegmentPlusTool);
  // Modify annotation tools to use dashed lines on SR
  const annotationStyle = {
    textBoxFontSize: '15px',
    lineWidth: '1.5',
    textBoxVisibility: false, // Hide text boxes for all annotation tools
  };

  const defaultStyles = annotation.config.style.getDefaultToolStyles();
  annotation.config.style.setDefaultToolStyles({
    global: {
      ...defaultStyles.global,
      ...annotationStyle,
    },
    // Per-tool override: Length tool should show its textbox so the line
    // length (mm) is rendered next to the line. Other tools stay hidden via
    // the global `textBoxVisibility: false` above.
    //
    // `textBoxLinkLineWidth: '0'` hides the dashed connector. Must be the
    // STRING '0' — `drawLine` does `strokeWidth = lineWidth || width`, so a
    // numeric 0 is falsy and falls back to the default 2px (which made the
    // line thicker, not invisible). '0' is a truthy string, so it survives
    // the fallback and ends up as `stroke-width="0"` → invisible.
    [LengthTool.toolName]: {
      textBoxVisibility: true,
      textBoxLinkLineWidth: '0',
    },
  });
}

const toolNames = {
  Pan: PanTool.toolName,
  ArrowAnnotate: ArrowAnnotateTool.toolName,
  WindowLevel: WindowLevelTool.toolName,
  StackScroll: StackScrollTool.toolName,
  Zoom: ZoomTool.toolName,
  VolumeRotate: VolumeRotateTool.toolName,
  MipJumpToClick: MIPJumpToClickTool.toolName,
  Length: LengthTool.toolName,
  DragProbe: DragProbeTool.toolName,
  Probe: ProbeTool.toolName,
  RectangleROI: RectangleROITool.toolName,
  RectangleROIThreshold: RectangleROIThresholdTool.toolName,
  EllipticalROI: EllipticalROITool.toolName,
  CircleROI: CircleROITool.toolName,
  Bidirectional: BidirectionalTool.toolName,
  Angle: AngleTool.toolName,
  CobbAngle: CobbAngleTool.toolName,
  Magnify: MagnifyTool.toolName,
  Crosshairs: CrosshairsTool.toolName,
  Brush: BrushTool.toolName,
  PaintFill: PaintFillTool.toolName,
  ReferenceLines: ReferenceLinesTool.toolName,
  CalibrationLine: CalibrationLineTool.toolName,
  TrackballRotateTool: TrackballRotateTool.toolName,
  CircleScissors: CircleScissorsTool.toolName,
  RectangleScissors: RectangleScissorsTool.toolName,
  SphereScissors: SphereScissorsTool.toolName,
  ImageOverlayViewer: ImageOverlayViewerTool.toolName,
  AdvancedMagnify: AdvancedMagnifyTool.toolName,
  UltrasoundDirectional: UltrasoundDirectionalTool.toolName,
  SplineROI: SplineROITool.toolName,
  LivewireContour: LivewireContourTool.toolName,
  PlanarFreehandROI: PlanarFreehandROITool.toolName,
  OrientationMarker: OrientationMarkerTool.toolName,
  WindowLevelRegion: WindowLevelRegionTool.toolName,
  PlanarFreehandContourSegmentation: PlanarFreehandContourSegmentationTool.toolName,
  SegmentBidirectional: SegmentBidirectionalTool.toolName,
  SegmentSelect: SegmentSelectTool.toolName,
  LabelmapSlicePropagation: LabelmapSlicePropagationTool.toolName,
  MarkerLabelmap: MarkerLabelmapTool.toolName,
  RegionSegmentPlus: RegionSegmentPlusTool.toolName,
};

export { toolNames };
