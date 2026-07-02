import { Enums as coreEnums, eventTarget, getEnabledElement, triggerEvent } from '@cornerstonejs/core';
import { Enums, annotation } from '@cornerstonejs/tools';
import React, { useEffect, useRef, useState } from 'react';

const csToolsEvents = Enums.Events;

type CustomLabel = {
  id: string;
  text: string;
  fontSize: number;
  color: string;
  worldPos?: [number, number, number];
};

type RenderedLabel = {
  annotationUID: string;
  label: CustomLabel;
  canvasX: number;
  canvasY: number;
};

/**
 * Per-viewport overlay that renders the multi-label feature.
 *
 * Each annotation can carry an optional `data.customLabels` array. This
 * component renders every label whose annotation belongs to a viewport
 * pane (we filter by referencedImageId), positions it via worldToCanvas,
 * and supports drag-to-move. On drop, the new world position is written
 * back to the label and an ANNOTATION_MODIFIED event is fired so the
 * existing save flow (BIEDX `annotationToMeasurement(isUpdate=true)`)
 * persists the change.
 *
 * Style is sourced from the label itself (font size, color). The drag
 * uses pointer events so it works for mouse + touch + pen.
 */
const CustomLabelsOverlay = ({ element, viewportId }: { element: any; viewportId: string }) => {
  const [rendered, setRendered] = useState<RenderedLabel[]>([]);
  // True while the user is actively zooming/panning — labels are hidden during
  // the interaction and re-shown (repositioned) once it settles.
  const [interacting, setInteracting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    annotationUID: string;
    labelId: string;
    startCanvas: [number, number];
    startWorld: [number, number, number] | null;
    startCanvasOffset: [number, number]; // pointer offset from label top-left
  } | null>(null);

  useEffect(() => {
    if (!element || !viewportId) {
      return;
    }

    // Timer to detect when a zoom/pan interaction has settled.
    let interactionTimer: ReturnType<typeof setTimeout> | null = null;

    function recompute() {
      const enabledElement = getEnabledElement(element);
      if (!enabledElement) {
        return;
      }
      const { viewport } = enabledElement as any;

      const allAnnotations = annotation.state.getAllAnnotations();
      const next: RenderedLabel[] = [];

      for (const ann of allAnnotations) {
        const labels: CustomLabel[] | undefined = (ann as any)?.data?.customLabels;
        if (!labels || !labels.length) {
          continue;
        }
        // Only render labels for annotations whose referenced image is in
        // this viewport. Matches AnnotationTooltipsOverlay's filter.
        if (!viewport?.imageIds?.includes(ann.metadata?.referencedImageId)) {
          continue;
        }
        // Default anchor: first handle point so a fresh label appears next
        // to the annotation when worldPos hasn't been set yet.
        const handles = (ann as any)?.data?.handles?.points;
        const anchor = handles?.[0] || [0, 0, 0];

        for (let i = 0; i < labels.length; i++) {
          const l = labels[i];
          // Default offset stacks new labels under each other so a brand-
          // new add doesn't pile on top of the previous one.
          const defaultPos: [number, number, number] = l.worldPos
            ? l.worldPos
            : [anchor[0] + 10, anchor[1] + 10 + i * 18, anchor[2]];
          try {
            const [cx, cy] = viewport.worldToCanvas(defaultPos);
            next.push({
              annotationUID: ann.annotationUID,
              label: { ...l, worldPos: defaultPos },
              canvasX: cx,
              canvasY: cy,
            });
          } catch {
            /* viewport not painted yet; skip */
          }
        }
      }
      setRendered(next);
    }

    // While the camera is actively changing (zoom / pan) HIDE all labels so
    // they don't lag or flicker mid-interaction, then recompute their positions
    // and SHOW them once it settles (~150ms after the last CAMERA_MODIFIED).
    // CAMERA_MODIFIED is a CORE event fired on the viewport ELEMENT (not the
    // tools eventTarget), so we listen on `element` with the core Enums — the
    // previous `eventTarget.addEventListener(csToolsEvents.CAMERA_MODIFIED, …)`
    // was a no-op (tools' Enums.Events has no CAMERA_MODIFIED), which is also
    // why labels never repositioned during zoom before.
    function onCameraModified() {
      setInteracting(true);
      if (interactionTimer) {
        clearTimeout(interactionTimer);
      }
      interactionTimer = setTimeout(() => {
        recompute();
        setInteracting(false);
      }, 150);
    }

    recompute();
    eventTarget.addEventListener(csToolsEvents.ANNOTATION_ADDED, recompute);
    eventTarget.addEventListener(csToolsEvents.ANNOTATION_MODIFIED, recompute);
    eventTarget.addEventListener(csToolsEvents.ANNOTATION_REMOVED, recompute);
    element.addEventListener(coreEnums.Events.CAMERA_MODIFIED, onCameraModified);
    // Cornerstone's low-level `annotationManager.addAnnotation` (the path
    // BIEDX uses to load saved annotations from the API) does NOT fire
    // ANNOTATION_ADDED. `initMeasurementService.ts` dispatches a plain
    // `annotation-load-complete` window event after each successful load
    // — listen for it here so labels appear immediately when fetched,
    // not only after the next CAMERA_MODIFIED forces a recompute.
    if (typeof window !== 'undefined') {
      window.addEventListener('annotation-load-complete', recompute);
    }

    return () => {
      eventTarget.removeEventListener(csToolsEvents.ANNOTATION_ADDED, recompute);
      eventTarget.removeEventListener(csToolsEvents.ANNOTATION_MODIFIED, recompute);
      eventTarget.removeEventListener(csToolsEvents.ANNOTATION_REMOVED, recompute);
      element.removeEventListener(coreEnums.Events.CAMERA_MODIFIED, onCameraModified);
      if (interactionTimer) {
        clearTimeout(interactionTimer);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('annotation-load-complete', recompute);
      }
    };
  }, [element, viewportId]);

  // Drag handlers (pointer events → works for mouse / touch / pen).
  const onPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    annotationUID: string,
    label: CustomLabel
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) {
      return;
    }
    dragRef.current = {
      pointerId: e.pointerId,
      annotationUID,
      labelId: label.id,
      startCanvas: [e.clientX - containerRect.left, e.clientY - containerRect.top],
      startWorld: label.worldPos || null,
      startCanvasOffset: [e.clientX - rect.left, e.clientY - rect.top],
    };
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Snapshot the drag state into a local. The `setRendered` updater below
    // runs asynchronously (on the next render), but must NOT reference
    // `dragRef.current` — dragging a label out of the viewport fires
    // pointercancel/up which sets `dragRef.current = null`, so by the time
    // React runs the queued updater it could be null → "Cannot read properties
    // of null (reading 'annotationUID')". Reading from the captured `drag`
    // local keeps the update crash-safe and correct.
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) {
      return;
    }
    // Clamp the label inside the viewport pane: it can be dragged up to the
    // border but never beyond, so a label can't go off-screen (and can't hit
    // the drag-out-of-viewport crash path). The container is the viewport pane
    // (100% x 100%), so we bound the label's top-left to keep the whole label
    // visible.
    const labelW = e.currentTarget.offsetWidth || 0;
    const labelH = e.currentTarget.offsetHeight || 0;
    const cx = Math.max(
      0,
      Math.min(e.clientX - containerRect.left - drag.startCanvasOffset[0], containerRect.width - labelW)
    );
    const cy = Math.max(
      0,
      Math.min(e.clientY - containerRect.top - drag.startCanvasOffset[1], containerRect.height - labelH)
    );
    const { annotationUID: dragUID, labelId: dragLabelId } = drag;
    // Live-update the canvas position locally; don't recompute world yet
    // (avoids flicker on every move). World coords are written on drop.
    setRendered(curr =>
      curr.map(r =>
        r && r.annotationUID === dragUID && r.label.id === dragLabelId
          ? { ...r, canvasX: cx, canvasY: cy }
          : r
      )
    );
  };

  // Delete a single label from an annotation (the × button on the label).
  // Mutate the annotation's customLabels array, then dispatch
  // ANNOTATION_MODIFIED on the SAME eventTarget the overlay listens on,
  // so the overlay refreshes immediately AND the BIEDX save flow runs.
  const deleteLabel = (annotationUID: string, labelId: string) => {
    const ann: any = annotation.state.getAnnotation(annotationUID);
    if (!ann?.data?.customLabels) {
      return;
    }
    ann.data.customLabels = ann.data.customLabels.filter((l: CustomLabel) => l.id !== labelId);
    try {
      const enabled = getEnabledElement(element);
      const re = (enabled as any)?.renderingEngine;
      triggerEvent(eventTarget, csToolsEvents.ANNOTATION_MODIFIED, {
        annotation: ann,
        viewportId,
        renderingEngineId: re?.id,
      });
    } catch {
      /* event dispatch failed — overlay falls back to next CAMERA_MODIFIED */
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) {
      return;
    }
    const { annotationUID, labelId } = dragRef.current;
    const enabledElement = getEnabledElement(element);
    if (enabledElement) {
      const { viewport } = enabledElement as any;
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect && viewport?.canvasToWorld) {
        // Clamp the drop position inside the viewport too, so the world coord
        // we persist matches the on-screen (in-bounds) label — the label can
        // never be saved off-screen.
        const labelW = e.currentTarget.offsetWidth || 0;
        const labelH = e.currentTarget.offsetHeight || 0;
        const cx = Math.max(
          0,
          Math.min(
            e.clientX - containerRect.left - dragRef.current.startCanvasOffset[0],
            containerRect.width - labelW
          )
        );
        const cy = Math.max(
          0,
          Math.min(
            e.clientY - containerRect.top - dragRef.current.startCanvasOffset[1],
            containerRect.height - labelH
          )
        );
        try {
          const world = viewport.canvasToWorld([cx, cy]);
          // Mutate the annotation's customLabels in place. Then fire
          // ANNOTATION_MODIFIED so the BIEDX save flow picks it up.
          const ann: any = annotation.state.getAnnotation(annotationUID);
          if (ann?.data?.customLabels) {
            const idx = ann.data.customLabels.findIndex((l: CustomLabel) => l.id === labelId);
            if (idx >= 0) {
              ann.data.customLabels[idx] = {
                ...ann.data.customLabels[idx],
                worldPos: [world[0], world[1], world[2]],
              };
              try {
                triggerEvent(eventTarget, csToolsEvents.ANNOTATION_MODIFIED, {
                  annotation: ann,
                  viewportId,
                  renderingEngineId: viewport.getRenderingEngine?.()?.id,
                });
              } catch {
                /* event dispatch failed — local move still visible */
              }
            }
          }
        } catch {
          /* canvasToWorld failed (no image data); leave label at last canvas pos */
        }
      }
    }
    try {
      e.currentTarget.releasePointerCapture(dragRef.current.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = null;
  };

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
        zIndex: 21, // above AnnotationTooltipsOverlay (zIndex 20)
        overflow: 'hidden',
      }}
    >
      {!interacting &&
        rendered.map(r => (
        <div
          key={`${r.annotationUID}:${r.label.id}`}
          onPointerDown={e => onPointerDown(e, r.annotationUID, r.label)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: 'absolute',
            left: r.canvasX,
            top: r.canvasY,
            color: r.label.color,
            fontSize: `${r.label.fontSize}px`,
            lineHeight: 1.2,
            fontWeight: 600,
            letterSpacing: '0.2px',
            background: 'rgba(0,0,0,0.55)',
            padding: '2px 22px 2px 6px',
            borderRadius: 3,
            cursor: 'move',
            userSelect: 'none',
            touchAction: 'none',
            pointerEvents: 'auto',
            whiteSpace: 'nowrap',
            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
          }}
        >
          {r.label.text}
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              deleteLabel(r.annotationUID, r.label.id);
            }}
            title="Remove label"
            style={{
              position: 'absolute',
              top: '50%',
              right: 3,
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              padding: 0,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              lineHeight: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.9)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default CustomLabelsOverlay;
