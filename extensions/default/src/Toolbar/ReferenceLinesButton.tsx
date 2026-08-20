import React, { useCallback, useEffect } from 'react';
import { ToolButton } from '@ohif/ui-next';
import { useViewportLinkStore } from '../stores/useViewportLinkStore';

/**
 * @author Sanjay Balai
 * MRI-only "Reference Lines" toggle for the top toolbar (companion to the Image
 * Slice Sync button). ON = the active pane's slice plane is drawn as a locator
 * line in every other pane (axial ↔ coronal ↔ sagittal) and moves as you scroll;
 * OFF = no lines. Rendered ONLY for MR studies (returns null otherwise).
 *
 * PERSISTENCE: intent is kept in `useViewportLinkStore`, and on a hanging-protocol
 * switch (VIEWPORTS_READY) we re-enable the tool and re-point it at the active
 * viewport — so "on stays on" across HP changes. The source viewport is also kept
 * in sync with the active pane (ACTIVE_VIEWPORT_ID_CHANGED), so the lines always
 * originate from the pane the reader is scrolling.
 *
 * `enforceSameFrameOfReference: false` is set defensively so lines draw across all
 * panes even if any series slips past the per-study FrameOfReferenceUID
 * normalization (see [MR-FOR-SYNC] in extensions/default/src/init.ts).
 */
const TOOL_NAME = 'ReferenceLines';

function ReferenceLinesButton({ servicesManager }: withAppTypes) {
  const { displaySetService, toolGroupService, viewportGridService, cornerstoneViewportService } =
    servicesManager.services;

  const activeDisplaySets = displaySetService.getActiveDisplaySets?.() || [];
  const isMR = activeDisplaySets.some((ds: { Modality?: string }) => ds.Modality === 'MR');

  const on = useViewportLinkStore(s => s.referenceLinesOn);
  const setOn = useViewportLinkStore(s => s.setReferenceLinesOn);

  // Enable/disable the ReferenceLines tool on every tool group that has it, and
  // (when enabling) point it at the active pane so the lines originate there.
  const apply = useCallback(
    (enabled: boolean) => {
      try {
        const { activeViewportId, viewports } = viewportGridService.getState();
        const done = new Set<string>();
        for (const vp of viewports.values()) {
          const viewportId = vp?.viewportOptions?.viewportId;
          if (!viewportId) {
            continue;
          }
          const tg = toolGroupService.getToolGroupForViewport(viewportId);
          if (!tg || done.has(tg.id) || !tg.hasTool?.(TOOL_NAME)) {
            continue;
          }
          done.add(tg.id);
          if (enabled) {
            const prev = (tg.getToolConfiguration?.(TOOL_NAME) || {}) as Record<string, unknown>;
            tg.setToolConfiguration?.(
              TOOL_NAME,
              { ...prev, sourceViewportId: activeViewportId || viewportId, enforceSameFrameOfReference: false },
              true
            );
            tg.setToolEnabled?.(TOOL_NAME);
          } else {
            tg.setToolDisabled?.(TOOL_NAME);
          }
        }
        cornerstoneViewportService.getRenderingEngine?.()?.render?.();
      } catch {
        /* ignore */
      }
    },
    [cornerstoneViewportService, toolGroupService, viewportGridService]
  );

  // Enforce the user's intent on EVERY viewport change (debounced), gated to MR.
  // This both (a) keeps an enabled tool pointed at the active pane across HP stage
  // switches and (b) ENFORCES OFF by default — the ReferenceLines tool ships in the
  // tool group's "enabled" list, so without this it would draw before the user ever
  // toggles it. So we always push the tool to exactly match the toggle state.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const enforce = () => {
      const mr = (displaySetService.getActiveDisplaySets?.() || []).some(
        (ds: { Modality?: string }) => ds.Modality === 'MR'
      );
      if (!mr) {
        return;
      }
      apply(useViewportLinkStore.getState().referenceLinesOn);
    };
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(enforce, 150);
    };
    debounced(); // initial — turns the default-enabled tool OFF until toggled on
    const subs = [
      cornerstoneViewportService.subscribe(cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED, debounced),
      viewportGridService.subscribe(viewportGridService.EVENTS.VIEWPORTS_READY, debounced),
      viewportGridService.subscribe(viewportGridService.EVENTS.GRID_STATE_CHANGED, debounced),
      viewportGridService.subscribe(viewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED, debounced),
    ];
    return () => {
      clearTimeout(timer);
      subs.forEach(s => s?.unsubscribe?.());
    };
  }, [cornerstoneViewportService, viewportGridService, displaySetService, apply]);

  if (!isMR) {
    return null;
  }

  const handleToggle = () => {
    apply(!on);
    setOn(!on);
  };

  return (
    <ToolButton
      id="ReferenceLinesMR"
      icon="tool-referenceLines"
      label="Reference Lines"
      tooltip={
        on
          ? 'Reference Lines: ON — showing slice-locator lines (click to hide)'
          : 'Reference Lines: OFF (click to show slice-locator lines)'
      }
      isActive={on}
      onInteraction={handleToggle}
    />
  );
}

export default ReferenceLinesButton;
export { ReferenceLinesButton };
