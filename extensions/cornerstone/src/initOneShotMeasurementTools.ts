import { eventTarget } from '@cornerstonejs/core';
import { Enums as csToolsEnums } from '@cornerstonejs/tools';

/**
 * "One-shot" behavior for measurement-style tools: after a single annotation
 * is completed, the toolGroup's Mouse_Primary binding is restored to the
 * fallback default (Zoom — matches the longitudinal mode's initial Primary
 * binding). The user must re-pick the measurement tool from the toolbar to
 * draw another one.
 *
 * Rationale: prevents the easy-to-miss "I just drew a circle but the tool
 * stayed active, so my next click drew another circle by accident". This is
 * a common UX pattern in clinical viewers.
 *
 * Hooked to `csTools.Enums.Events.ANNOTATION_COMPLETED` — fires when the
 * user finishes drawing (mouseUp on the second point for line tools, mouseUp
 * on the perimeter handle for CircleROI, etc.). We restore the Primary tool
 * only if the just-completed tool is still the active Primary at that moment
 * (defends against stale events).
 */

// Tools that should auto-deactivate after one drawing operation. Names match
// the cornerstone3D `static toolName` of each tool class.
const ONE_SHOT_MEASUREMENT_TOOLS = new Set([
  'CircleROI',
  'Length',
  'Bidirectional',
  'ArrowAnnotate',
  'EllipticalROI',
  'RectangleROI',
  'PlanarFreehandROI',
  'SplineROI',
  'LivewireContour',
  'Angle',
  'CobbAngle',
  'CalibrationLine',
  'Probe',
  'UltrasoundDirectionalTool',
]);

// Fallback Mouse_Primary tool to restore after a one-shot measurement.
// Matches longitudinal mode's initial Mouse_Primary binding (see
// `modes/longitudinal/src/initToolGroups.js` — Zoom is bound to Primary at
// toolGroup creation). If a mode uses a different Mouse_Primary default,
// the second tool in this list is tried as a backup before giving up.
const FALLBACK_PRIMARY_TOOLS = ['Zoom', 'WindowLevel', 'Pan'];

export default function initOneShotMeasurementTools({
  toolGroupService,
  viewportGridService,
}: {
  toolGroupService: any;
  viewportGridService: any;
}) {
  eventTarget.addEventListener(csToolsEnums.Events.ANNOTATION_COMPLETED, (evt: any) => {
    try {
      const toolName: string | undefined = evt?.detail?.annotation?.metadata?.toolName;
      if (!toolName || !ONE_SHOT_MEASUREMENT_TOOLS.has(toolName)) {
        return;
      }

      const activeViewportId = viewportGridService.getActiveViewportId();
      if (!activeViewportId) {
        return;
      }
      const toolGroup = toolGroupService.getToolGroupForViewport(activeViewportId);
      if (!toolGroup) {
        return;
      }

      // Guard against stale events — if the just-finished tool isn't the
      // current Primary tool anymore (e.g. user already switched), no-op.
      const activeName = toolGroup.getActivePrimaryMouseButtonTool?.();
      if (activeName !== toolName) {
        return;
      }

      // Set the measurement tool Passive and restore the fallback Primary.
      toolGroup.setToolPassive(toolName);
      for (const fallback of FALLBACK_PRIMARY_TOOLS) {
        if (toolGroup.hasTool(fallback)) {
          toolGroup.setToolActive(fallback, {
            bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
          });
          return;
        }
      }
      // No fallback found — leave the tool Passive (Primary will be unbound).
    } catch {
      /* never break the annotation flow if this UX helper throws */
    }
  });
}
