import { LengthTool, annotation as annotationApi } from '@cornerstonejs/tools';
import { utilities as csCoreUtilities } from '@cornerstonejs/core';

// UX: cornerstone3D's LengthTool places its textbox via `getTextBoxCoordsCanvas`
// which positions it at (rightEndpointX, midY). Then `drawTextBox` adds 25px
// of internal padding to the position before rendering the actual text — so
// the visible "mm" label ends up ~25px right and ~25px below the right end of
// the line. With the dashed link line hidden (see initCornerstoneTools.js
// `textBoxLinkLineWidth: '0'`), that gap reads as the label floating off in
// space instead of sitting near the line.
//
// This subclass:
//   1. Overrides `renderAnnotation` so that BEFORE the parent draws, we set
//      `data.handles.textBox.worldPosition` to a value that lands the VISIBLE
//      text right next to the line's midpoint (accounting for the 25px
//      padding `drawTextBox` will add). `hasMoved = true` so the parent's
//      default-position logic doesn't undo it.
//   2. Provides a custom `getTextLines` that strips cornerstone's calibration
//      suffix (e.g. "ERMF" on mammography images — Estimated Radiographic
//      Magnification Factor, DICOM 0018,1114). For teaching workflows the
//      bare "mm" value is all students need; the calibration tag adds visual
//      noise without diagnostic value here.
//
// Trade-off (#1): the textbox auto-tracks the line midpoint every render, so
// it follows when the user moves or resizes the line. The cost is that users
// can't manually drag the textbox to a custom location — it always snaps back
// to the auto-position. For measurement workflows that's the desired behavior.

const { getAnnotations } = annotationApi.state;
const { roundNumber } = csCoreUtilities;

function customGetTextLines(data: any, targetId: string): string[] | undefined {
  const stats = data?.cachedStats?.[targetId];
  if (!stats || stats.length == null || isNaN(stats.length)) {
    return undefined;
  }
  // Cornerstone builds `unit` as e.g. "mm ERMF" (or "mm USER", "mm PROJECTION"
  // — see `getCalibratedLengthUnitsAndScale` in cornerstone3D). Strip the
  // calibration suffix so only the bare unit ("mm") shows.
  const rawUnit = typeof stats.unit === 'string' ? stats.unit : 'mm';
  const baseUnit = rawUnit.split(' ')[0] || 'mm';
  return [`${roundNumber(stats.length)} ${baseUnit}`];
}

type Point2 = [number, number];

// drawTextBox's internal padding (must match cornerstone — see
// node_modules/@cornerstonejs/tools/.../drawingSvg/drawTextBox.js line 9).
const DRAW_TEXTBOX_PADDING = 25;

// Where we want the visible text to LAND relative to the line midpoint.
// Slightly above + slightly right reads naturally and stays clear of the line.
const TEXT_OFFSET_X = 8;
const TEXT_OFFSET_Y = -22;

class CustomLengthTool extends LengthTool {
  static toolName = 'Length';

  _csParentRenderAnnotation = this.renderAnnotation;

  constructor(toolProps: any = {}, defaultToolProps: any = undefined) {
    super(toolProps, defaultToolProps);
    // AnnotationTool's constructor reads `toolProps.configuration.getTextLines`
    // and copies it onto `this.configuration`, so for code paths that go
    // through the toolGroupService's addToolInstance we'd want that hookup
    // there too — but the simpler reliable path is to set it directly here
    // after super().
    this.configuration.getTextLines = customGetTextLines;
  }

  renderAnnotation = (enabledElement: any, svgDrawingHelper: any) => {
    try {
      const { viewport } = enabledElement;
      const { element } = viewport;
      const raw = getAnnotations(this.getToolName(), element) || [];
      const annotations: any[] =
        this.filterInteractableAnnotationsForElement?.(element, raw) || raw;

      for (const ann of annotations) {
        if (!ann || ann.isVisible === false) {
          continue;
        }
        const points = ann?.data?.handles?.points;
        const textBox = ann?.data?.handles?.textBox;
        if (!points || points.length < 2 || !textBox) {
          continue;
        }
        const c1 = viewport.worldToCanvas(points[0]) as Point2;
        const c2 = viewport.worldToCanvas(points[1]) as Point2;
        const mid: Point2 = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];

        // Pre-subtract drawTextBox's 25px padding so the visible text content
        // lands at `mid + (TEXT_OFFSET_X, TEXT_OFFSET_Y)`.
        const targetCanvas: Point2 = [
          mid[0] - DRAW_TEXTBOX_PADDING + TEXT_OFFSET_X,
          mid[1] - DRAW_TEXTBOX_PADDING + TEXT_OFFSET_Y,
        ];
        textBox.worldPosition = viewport.canvasToWorld(targetCanvas);
        // Bypass the parent's default-position reset (which would otherwise
        // re-place the textbox via `getTextBoxCoordsCanvas` on every render).
        textBox.hasMoved = true;
      }
    } catch {
      /* never let the textbox positioning break annotation rendering */
    }
    return this._csParentRenderAnnotation(enabledElement, svgDrawingHelper);
  };
}

export { CustomLengthTool };
