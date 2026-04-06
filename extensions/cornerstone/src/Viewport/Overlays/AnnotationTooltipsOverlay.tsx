import { eventTarget, getEnabledElement } from '@cornerstonejs/core';
import { Enums, annotation } from '@cornerstonejs/tools';
import { Icons } from '@ohif/ui-next';
import React, { useEffect, useRef, useState } from 'react';
const csToolsEvents = Enums.Events;

const LABEL_HEIGHT = 24;
const LABEL_PADDING_X = 10;
const LABEL_OFFSET_X = 30;
const VIEWPORT_MARGIN = 4;

/**
 * Always-visible tooltips for annotation labels in the viewport.
 * - Separates overlapping labels so both are readable
 * - Clamps labels within viewport bounds so they don't hide behind adjacent viewports
 */
const AnnotationTooltipsOverlay = ({ element, viewportId }) => {
  const [tooltips, setTooltips] = useState([]);
  const [hiddenUids, setHiddenUids] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

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
        if (!viewport?.imageIds?.includes(ann.metadata.referencedImageId)) {
          continue;
        }
        const label = ann.data?.label || ann.metadata?.data?.label;
        const color = ann?.color;
        if (!label) {
          continue;
        }
        let worldPos = null;
        if (ann?.data?.handles?.points?.length) {
          worldPos = ann.data.handles.points[0];
        }
        if (!worldPos) {
          continue;
        }
        const [x, y] = viewport.worldToCanvas(worldPos);
        const isStudent = label?.includes('Your Annotation');
        const isFaculty = label?.includes('Reference Annotation');
        const textColor = isStudent ? '#5cb3ff' : isFaculty ? '#4ade80' : color || '#fff';

        newTooltips.push({ label, x, y, uid: ann.annotationUID, color: textColor, isStudent });
      }
      setTooltips(newTooltips);
    }

    updateTooltips();
    eventTarget.addEventListener(csToolsEvents.ANNOTATION_ADDED, updateTooltips);
    eventTarget.addEventListener(csToolsEvents.ANNOTATION_MODIFIED, updateTooltips);
    eventTarget.addEventListener(csToolsEvents.CAMERA_MODIFIED, updateTooltips);

    return () => {
      eventTarget.removeEventListener(csToolsEvents.ANNOTATION_ADDED, updateTooltips);
      eventTarget.removeEventListener(csToolsEvents.ANNOTATION_MODIFIED, updateTooltips);
      eventTarget.removeEventListener(csToolsEvents.CAMERA_MODIFIED, updateTooltips);
    };
  }, [element, viewportId]);

  // Compute final positions: resolve overlaps and clamp to viewport
  const containerW = containerRef.current?.offsetWidth || 800;
  const containerH = containerRef.current?.offsetHeight || 600;

  // Estimate label width from text length (rough: ~8px per char + padding)
  const estimateWidth = (text: string) => text.length * 8 + LABEL_PADDING_X * 2;

  // Filter out hidden tooltips
  const visibleTooltips = tooltips.filter(t => !hiddenUids.has(t.uid));

  // Build positioned labels
  const positioned = visibleTooltips.map(t => {
    const labelW = estimateWidth(t.label);
    let left = t.x + LABEL_OFFSET_X;
    let top = t.isStudent ? t.y - LABEL_HEIGHT - 4 : t.y + 8;

    // Clamp horizontally
    if (left + labelW > containerW - VIEWPORT_MARGIN) {
      left = t.x - labelW - 10;
    }
    if (left < VIEWPORT_MARGIN) {
      left = VIEWPORT_MARGIN;
    }

    // Clamp vertically
    if (top < VIEWPORT_MARGIN) {
      top = VIEWPORT_MARGIN;
    }
    if (top + LABEL_HEIGHT > containerH - VIEWPORT_MARGIN) {
      top = containerH - LABEL_HEIGHT - VIEWPORT_MARGIN;
    }

    return { ...t, left, top, width: labelW };
  });

  // Resolve overlaps: if two labels overlap, push them apart vertically
  for (let i = 0; i < positioned.length; i++) {
    for (let j = i + 1; j < positioned.length; j++) {
      const a = positioned[i];
      const b = positioned[j];

      const overlapX = a.left < b.left + b.width && a.left + a.width > b.left;
      const overlapY = a.top < b.top + LABEL_HEIGHT && a.top + LABEL_HEIGHT > b.top;

      if (overlapX && overlapY) {
        // Push them apart: one above, one below their midpoint
        const mid = (a.top + b.top) / 2;
        const halfGap = LABEL_HEIGHT / 2 + 3;
        let newTopA = mid - halfGap - LABEL_HEIGHT / 2;
        let newTopB = mid + halfGap - LABEL_HEIGHT / 2;

        // Clamp both after adjustment
        if (newTopA < VIEWPORT_MARGIN) {
          newTopA = VIEWPORT_MARGIN;
          newTopB = newTopA + LABEL_HEIGHT + 6;
        }
        if (newTopB + LABEL_HEIGHT > containerH - VIEWPORT_MARGIN) {
          newTopB = containerH - LABEL_HEIGHT - VIEWPORT_MARGIN;
          newTopA = newTopB - LABEL_HEIGHT - 6;
        }

        positioned[i].top = newTopA;
        positioned[j].top = newTopB;
      }
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      {positioned.map(({ label, left, top, uid, color }) => (
        <div
          key={uid}
          style={{
            position: 'absolute',
            left,
            top,
            background: 'rgba(0, 0, 0, 0.85)',
            color,
            padding: '3px 24px 3px 10px',
            borderRadius: 5,
            fontSize: 13,
            lineHeight: '18px',
            pointerEvents: 'auto',
            whiteSpace: 'nowrap',
            fontWeight: 700,
            letterSpacing: '0.3px',
            border: `1px solid ${color}33`,
          }}
        >
          {label}
          <button
            onClick={() => setHiddenUids(prev => new Set(prev).add(uid))}
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#333',
              border: '1px solid #555',
              color: '#aaa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              pointerEvents: 'auto',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#555';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#333';
              e.currentTarget.style.color = '#aaa';
            }}
          >
            <Icons.Close />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AnnotationTooltipsOverlay;
