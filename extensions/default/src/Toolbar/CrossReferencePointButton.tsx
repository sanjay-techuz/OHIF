import React, { useCallback, useEffect } from 'react';
import { ToolButton } from '@ohif/ui-next';
import { useViewportLinkStore } from '../stores/useViewportLinkStore';

/**
 * @author Sanjay Balai
 * [CROSS-REF-POINT] MRI-only "Cross Reference Point" toggle for the top toolbar.
 *
 * ON  = a single draggable circle appears; drag it in any MR pane and every other
 *       pane (axial / sagittal / coronal) jumps to the slice through that point and
 *       shows the circle there. Flips/tilt are handled by the viewport transforms.
 * OFF = the circle is removed and the tool goes inert.
 *
 * Rendered ONLY for MR studies (returns null otherwise) — same modality gating as
 * ImageSliceSyncButton / ReferenceLinesButton. Intent is persisted in
 * useViewportLinkStore so a hanging-protocol stage switch (2×3 → 2×4) re-asserts the
 * tool mode on the rebuilt viewports.
 *
 * This is NOT a measurement: the CrossReferencePoint tool has no MeasurementService
 * mapping, so it is never saved, listed, or evaluated. It also never touches the
 * built-in Crosshairs tool.
 */
const TOOL_NAME = 'CrossReferencePoint';

function CrossReferencePointButton({ servicesManager, commandsManager }: withAppTypes) {
  const { displaySetService, toolGroupService, viewportGridService, cornerstoneViewportService } =
    servicesManager.services;

  const activeDisplaySets = displaySetService.getActiveDisplaySets?.() || [];
  const isMR = activeDisplaySets.some((ds: { Modality?: string }) => ds.Modality === 'MR');

  const on = useViewportLinkStore(s => s.crossReferencePointOn);
  const setOn = useViewportLinkStore(s => s.setCrossReferencePointOn);

  const setToolMode = useCallback(
    (mode: 'passive' | 'disabled') => {
      try {
        const toolGroupIds = toolGroupService.getToolGroupIds?.() || [];
        for (const id of toolGroupIds) {
          const toolGroup = toolGroupService.getToolGroup(id);
          if (!toolGroup?.hasTool?.(TOOL_NAME)) {
            continue;
          }
          if (mode === 'passive') {
            toolGroup.setToolPassive(TOOL_NAME);
          } else {
            toolGroup.setToolDisabled(TOOL_NAME);
          }
        }
      } catch {
        /* ignore */
      }
    },
    [toolGroupService]
  );

  const activate = useCallback(() => {
    setToolMode('passive');
    commandsManager.runCommand('crossReferencePointPlace');
  }, [setToolMode, commandsManager]);

  const deactivate = useCallback(() => {
    commandsManager.runCommand('crossReferencePointClear');
    setToolMode('disabled');
  }, [setToolMode, commandsManager]);

  // Re-assert the tool mode when the viewports change (e.g. a 2×3 → 2×4 stage
  // switch rebuilds the panes). The point annotation itself lives in the shared
  // Frame of Reference, so it persists; we only need to keep the tool passive.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const enforce = () => {
      const mr = (displaySetService.getActiveDisplaySets?.() || []).some(
        (ds: { Modality?: string }) => ds.Modality === 'MR'
      );
      if (mr && useViewportLinkStore.getState().crossReferencePointOn) {
        setToolMode('passive');
        // Re-attach scroll-follow listeners to the rebuilt panes (idempotent).
        commandsManager.runCommand('crossReferencePointReattach');
      }
    };
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(enforce, 150);
    };
    debounced();
    const subs = [
      cornerstoneViewportService.subscribe(
        cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
        debounced
      ),
      viewportGridService.subscribe(viewportGridService.EVENTS.VIEWPORTS_READY, debounced),
      viewportGridService.subscribe(viewportGridService.EVENTS.GRID_STATE_CHANGED, debounced),
    ];
    return () => {
      clearTimeout(timer);
      subs.forEach(s => s?.unsubscribe?.());
    };
  }, [cornerstoneViewportService, viewportGridService, displaySetService, setToolMode, commandsManager]);

  if (!isMR) {
    return null;
  }

  const handleToggle = () => {
    if (on) {
      deactivate();
      setOn(false);
    } else {
      activate();
      setOn(true);
    }
  };

  return (
    <ToolButton
      id="CrossReferencePointMR"
      icon="tool-cross-reference-point"
      label="Cross Reference Point"
      tooltip={
        on
          ? 'Cross Reference Point: ON — drag the circle to locate the same point in every plane (click to turn off)'
          : 'Cross Reference Point: OFF — click to place a draggable cross-plane reference point'
      }
      isActive={on}
      onInteraction={handleToggle}
    />
  );
}

export default CrossReferencePointButton;
export { CrossReferencePointButton };
