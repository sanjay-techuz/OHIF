import { create } from 'zustand';

/**
 * @author Sanjay Balai
 * Persistent user intent for the two MRI viewport-linking toggles:
 *   - Image Slice Sync (scroll all panes together)
 *   - Reference Lines (cross-plane locator lines)
 *
 * WHY a store: both features are tied to the *current* viewports. When the user
 * switches hanging protocol the viewports are rebuilt, and Cornerstone's
 * `toggleSynchronizer` only flips an existing synchronizer's enabled flag — it
 * never re-adds the new viewports — so the toolbar button stayed "active" while
 * the feature silently died. Keeping the intent here (not derived from the live
 * synchronizer state) lets the MRI toolbar buttons RE-APPLY the feature to the
 * rebuilt viewports on VIEWPORTS_READY, so "on stays on" until the user turns it
 * off. See ImageSliceSyncButton.tsx / ReferenceLinesButton.tsx.
 */
type ViewportLinkState = {
  imageSliceSyncOn: boolean;
  referenceLinesOn: boolean;
  // [CROSS-REF-POINT] draggable cross-plane reference point toggle.
  crossReferencePointOn: boolean;
  setImageSliceSyncOn: (value: boolean) => void;
  setReferenceLinesOn: (value: boolean) => void;
  setCrossReferencePointOn: (value: boolean) => void;
};

export const useViewportLinkStore = create<ViewportLinkState>(set => ({
  imageSliceSyncOn: false,
  referenceLinesOn: false,
  crossReferencePointOn: false,
  setImageSliceSyncOn: value => set({ imageSliceSyncOn: value }),
  setReferenceLinesOn: value => set({ referenceLinesOn: value }),
  setCrossReferencePointOn: value => set({ crossReferencePointOn: value }),
}));
