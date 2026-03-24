import { eventTarget, getEnabledElement } from '@cornerstonejs/core';
import { Enums, annotation } from '@cornerstonejs/tools';
import React, { useEffect, useState } from 'react';
const csToolsEvents = Enums.Events;

/**
 * Always-visible tooltips for annotation labels in the viewport.
 * Props:
 *   - element: the HTML element of the Cornerstone viewport
 *   - viewportId: the Cornerstone viewport ID
 */
const AnnotationTooltipsOverlay = ({ element, viewportId }) => {
  const [tooltips, setTooltips] = useState([]);

  useEffect(() => {
    if (!element || !viewportId) {
      return;
    }

    function updateTooltips() {
      const enabledElement = getEnabledElement(element);

      if (!enabledElement) {
        return;
      }
      const { viewport } = enabledElement;
      const allAnnotations = annotation.state.getAllAnnotations();

      const newTooltips = [];
      for (const ann of allAnnotations) {
        // Only show if label is present
        if (!viewport?.imageIds?.includes(ann.metadata.referencedImageId)) {
          continue;
        }
        const label = ann.data?.label || ann.metadata?.data?.label;
        const color = ann?.color;
        if (!label) {
          continue;
        }
        // Prefer the textBox world position if available (this is where Cornerstone
        // itself renders the label), otherwise fall back to a representative handle.
        let worldPos = null;
        if (ann?.data?.handles?.points?.length) {
          worldPos = ann.data.handles.points[0];
        }
        if (!worldPos) {
          continue;
        }
        // Convert world to canvas (screen) coordinates
        const [x, y] = viewport.worldToCanvas(worldPos);
        newTooltips.push({ label, x, y, uid: ann.annotationUID, color });
      }
      setTooltips(newTooltips);
    }

    updateTooltips();
    // Recompute tooltips when annotations change or when the camera/viewport moves.
    eventTarget.addEventListener(csToolsEvents.ANNOTATION_ADDED, updateTooltips);
    eventTarget.addEventListener(csToolsEvents.ANNOTATION_MODIFIED, updateTooltips);
    eventTarget.addEventListener(csToolsEvents.CAMERA_MODIFIED, updateTooltips);

    return () => {
      eventTarget.removeEventListener(csToolsEvents.ANNOTATION_ADDED, updateTooltips);
      eventTarget.removeEventListener(csToolsEvents.ANNOTATION_MODIFIED, updateTooltips);
      eventTarget.removeEventListener(csToolsEvents.CAMERA_MODIFIED, updateTooltips);
    };
  }, [element, viewportId]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      {tooltips.map(({ label, x, y, uid, color }, index) => {
        const isStudent = label?.includes('Your Annotation');
        const isFaculty = label?.includes('Reference Annotation');

        const left = x + 40;
        const top = isStudent ? y + 10 : y - 20;
        const textColor = isStudent ? '#5cb3ff' : isFaculty ? '#4ade80' : color || '#fff';

        return (
          <div
            key={uid}
            style={{
              position: 'absolute',
              left,
              top,
              background: 'rgba(0, 0, 0, 0.7)',
              color: textColor,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 14,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
};

export default AnnotationTooltipsOverlay;
