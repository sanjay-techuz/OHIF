import React, { useCallback, useEffect } from 'react';
import { ToolButton } from '@ohif/ui-next';
import { useViewportLinkStore } from '../stores/useViewportLinkStore';

/**
 * @author Sanjay Balai
 * MRI-only "Image Slice Sync" toggle for the top toolbar.
 *
 * ON = scrolling is linked across the stack panes (scroll one series, the others
 * jump to the spatially-corresponding slice); OFF = each pane scrolls on its own.
 * Rendered ONLY for MR studies (returns null otherwise) so it never clutters
 * MG/US toolbars — same modality gating as the HangingProtocolDropdown.
 *
 * PERSISTENCE (the fix): the toggle is remembered in `useViewportLinkStore`, not
 * derived from the live synchronizer. On a hanging-protocol switch the viewports
 * are rebuilt and the old synchronizer loses them; here we RE-ADD every current
 * stack viewport to the sync group on VIEWPORTS_READY whenever the user's intent
 * is ON — so "on stays on" across HP changes instead of going dead-but-highlighted.
 * We add/remove viewports on the sync group directly (the same calls the built-in
 * `toggleImageSliceSync` uses) because `toggleSynchronizer` only flips the enabled
 * flag and would NOT re-attach the rebuilt viewports.
 */
const IMAGE_SLICE_SYNC_ID = 'IMAGE_SLICE_SYNC';

function ImageSliceSyncButton({ servicesManager }: withAppTypes) {
  const { displaySetService, syncGroupService, viewportGridService, cornerstoneViewportService } =
    servicesManager.services;

  const activeDisplaySets = displaySetService.getActiveDisplaySets?.() || [];
  const isMR = activeDisplaySets.some((ds: { Modality?: string }) => ds.Modality === 'MR');

  const on = useViewportLinkStore(s => s.imageSliceSyncOn);
  const setOn = useViewportLinkStore(s => s.setImageSliceSyncOn);

  // Attach every current stack viewport to the sync group (idempotent).
  const attachAll = useCallback(() => {
    try {
      const { viewports } = viewportGridService.getState();
      for (const vp of viewports.values()) {
        const viewportId = vp?.viewportOptions?.viewportId;
        if (!viewportId || !vp?.displaySetInstanceUIDs?.length) {
          continue;
        }
        const csVp = cornerstoneViewportService.getCornerstoneViewport(viewportId);
        if (!csVp) {
          continue;
        }
        syncGroupService.addViewportToSyncGroup(viewportId, csVp.getRenderingEngine().id, {
          type: 'imageSlice',
          id: IMAGE_SLICE_SYNC_ID,
          source: true,
          target: true,
        });
      }
      (syncGroupService.getSynchronizer(IMAGE_SLICE_SYNC_ID) as { setEnabled?: (v: boolean) => void })?.setEnabled?.(
        true
      );
    } catch {
      /* ignore */
    }
  }, [cornerstoneViewportService, syncGroupService, viewportGridService]);

  // Detach the sync from every current viewport.
  const detachAll = useCallback(() => {
    try {
      const { viewports } = viewportGridService.getState();
      for (const vp of viewports.values()) {
        const viewportId = vp?.viewportOptions?.viewportId;
        if (!viewportId) {
          continue;
        }
        const csVp = cornerstoneViewportService.getCornerstoneViewport(viewportId);
        if (!csVp) {
          continue;
        }
        syncGroupService.removeViewportFromSyncGroup(
          csVp.id,
          csVp.getRenderingEngine().id,
          IMAGE_SLICE_SYNC_ID
        );
      }
    } catch {
      /* ignore */
    }
  }, [cornerstoneViewportService, syncGroupService, viewportGridService]);

  // Re-apply the user's intent whenever the viewports change — e.g. an in-study
  // hanging-protocol STAGE switch (2×3 → 2×4) rebuilds/repopulates the panes but
  // fires VIEWPORT_DATA_CHANGED / GRID_STATE_CHANGED (not always VIEWPORTS_READY),
  // and the old synchronizer loses the rebuilt viewports. Debounced so it runs
  // once after the rebuild settles. MR-gated so it never touches other modalities.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const enforce = () => {
      const mr = (displaySetService.getActiveDisplaySets?.() || []).some(
        (ds: { Modality?: string }) => ds.Modality === 'MR'
      );
      if (!mr) {
        return;
      }
      if (useViewportLinkStore.getState().imageSliceSyncOn) {
        attachAll(); // idempotent — re-attaches any newly-built viewports
      }
    };
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(enforce, 150);
    };
    debounced(); // initial (covers first paint)
    const subs = [
      cornerstoneViewportService.subscribe(cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED, debounced),
      viewportGridService.subscribe(viewportGridService.EVENTS.VIEWPORTS_READY, debounced),
      viewportGridService.subscribe(viewportGridService.EVENTS.GRID_STATE_CHANGED, debounced),
    ];
    return () => {
      clearTimeout(timer);
      subs.forEach(s => s?.unsubscribe?.());
    };
  }, [cornerstoneViewportService, viewportGridService, displaySetService, attachAll]);

  if (!isMR) {
    return null;
  }

  const handleToggle = () => {
    if (on) {
      detachAll();
      setOn(false);
    } else {
      attachAll();
      setOn(true);
    }
  };

  return (
    <ToolButton
      id="ImageSliceSyncMR"
      icon="link"
      label="Image Slice Sync"
      tooltip={
        on
          ? 'Image Slice Sync: ON — scrolling is linked (click to unsync)'
          : 'Image Slice Sync: OFF — scrolling is independent (click to sync)'
      }
      isActive={on}
      onInteraction={handleToggle}
    />
  );
}

export default ImageSliceSyncButton;
export { ImageSliceSyncButton };
