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

// ---------------------------------------------------------------------------
// Fix Cornerstone3D WindowLevelTool drag for SIGMOID-windowed images (common on
// mammography). The stock tool recomputes the VOI range on every mouse move by
// round-tripping through cornerstone's windowLevel helpers:
//     { ww, wc } = toWindowLevel(lower, upper)       // linear: ww = upper-lower+1
//     ww += dx; wc += dy
//     return toLowHighRange(ww, wc, VOILUTFunction)   // sigmoid: logit(0.01/0.99)
// toWindowLevel and toLowHighRange are exact inverses ONLY for LINEAR. For
// SIGMOID (VOILUTFunction === 'SIGMOID') toLowHighRange uses logit, producing a
// range ~2.3x wider than `ww`. So each event re-reads an inflated width and
// writes an even wider range — the window width compounds ~2.3x per mouse move
// and explodes to 1e+200+ within a single drag (image blows out, dragging feels
// random). This is a stock OHIF/cs3d issue, not a BIEDX change.
//
// Fix: apply the delta DIRECTLY to the range's width/center instead of
// round-tripping through the VOILUTFunction. This is VOILUTFunction-agnostic and
// perfectly stable; the renderer still applies the image's own (sigmoid)
// transfer curve over the adjusted range, so images keep their look while Window
// Level stays smooth on every modality — matching other viewers. We patch the
// original tool's own method rather than adding a separate tool.
//
// Guarded for cornerstone version upgrades: if the private helper
// `_getMultiplierFromDynamicRange` is ever renamed/removed, fall back to a fixed
// multiplier instead of throwing, so Window Level dragging degrades gracefully
// rather than crashing.
const _WL_DEFAULT_MULTIPLIER = 4;
WindowLevelTool.prototype.getNewRange = function ({
  viewport,
  deltaPointsCanvas,
  volumeId,
  lower,
  upper,
}) {
  let multiplier = _WL_DEFAULT_MULTIPLIER;
  if (typeof this._getMultiplierFromDynamicRange === 'function') {
    multiplier = this._getMultiplierFromDynamicRange(viewport, volumeId) || _WL_DEFAULT_MULTIPLIER;
  }
  const width = Math.max(upper - lower + deltaPointsCanvas[0] * multiplier, 1);
  const center = (upper + lower) / 2 + deltaPointsCanvas[1] * multiplier;
  return { lower: center - width / 2, upper: center + width / 2 };
};

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
