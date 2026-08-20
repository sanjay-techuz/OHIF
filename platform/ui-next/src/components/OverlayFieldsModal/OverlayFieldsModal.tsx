/**
 * Customize DICOM Header Overlay modal.
 *
 * Lets the user pick which DICOM fields appear on every viewport's
 * top-left overlay. Selection cap is 3 — a 4th pick evicts the
 * earliest-selected field (FIFO), mirroring the behaviour radiologists
 * are used to in commercial PACS viewers.
 *
 * State lives in `useOverlayFieldsStore` (Zustand, persisted to
 * localStorage). The modal is dumb UI; it doesn't know about Cornerstone
 * or DICOM metadata. The matching value extractors live alongside the
 * viewport-overlay customization in the cornerstone extension.
 *
 * @author Sanjay Balai
 */

import { Button, Modal } from '@ohif/ui-next';
import React, { useMemo, useState } from 'react';
import {
  MAX_OVERLAY_FIELDS,
  OVERLAY_FIELD_CATALOG,
  OVERLAY_FIELD_GROUPS,
  useOverlayFieldsStore,
  type OverlayCatalogEntry,
  type OverlayFieldGroup,
} from '../../../../../extensions/default/src/stores/useOverlayFieldsStore';

export interface OverlayFieldsModalProps {
  open: boolean;
  onClose: () => void;
}

const OverlayFieldsModal: React.FC<OverlayFieldsModalProps> = ({ open, onClose }) => {
  const selectedFields = useOverlayFieldsStore(s => s.selectedFields);
  const toggleField = useOverlayFieldsStore(s => s.toggleField);
  const resetToDefaults = useOverlayFieldsStore(s => s.resetToDefaults);
  const overlayHidden = useOverlayFieldsStore(s => s.overlayHidden);
  const setOverlayHidden = useOverlayFieldsStore(s => s.setOverlayHidden);

  const [search, setSearch] = useState('');

  /** Filter + bucket the catalog into ordered groups for rendering. */
  const groupedEntries = useMemo<
    Array<{ group: OverlayFieldGroup; entries: OverlayCatalogEntry[] }>
  >(() => {
    const needle = search.trim().toLowerCase();
    const matches = (entry: OverlayCatalogEntry) =>
      !needle ||
      entry.label.toLowerCase().includes(needle) ||
      entry.id.toLowerCase().includes(needle) ||
      entry.group.toLowerCase().includes(needle);

    return OVERLAY_FIELD_GROUPS.map(group => ({
      group,
      entries: OVERLAY_FIELD_CATALOG.filter(e => e.group === group && matches(e)),
    })).filter(g => g.entries.length > 0);
  }, [search]);

  const selectedCount = selectedFields.length;
  const totalMatches = groupedEntries.reduce((n, g) => n + g.entries.length, 0);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      containerClassName="max-w-[680px] !rounded-2xl p-8 !bg-[rgba(11,10,10,0.95)] !border !border-[#4F4F4F]"
    >
      {/* Title */}
      <div className="mb-2">
        <h2 className="text-primary-light text-2xl font-bold leading-tight">
          Customize Viewport Overlay
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Choose up to {MAX_OVERLAY_FIELDS} DICOM fields to show on every viewport (top-left).
          Picking a {MAX_OVERLAY_FIELDS + 1}th field will remove the one you selected first. Tags
          not present in the current image are silently hidden.
        </p>
      </div>

      {/* Global show/hide for the whole info overlay */}
      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#4F4F4F] px-3 py-2.5">
        <span className="text-sm text-white">
          Show overlay on viewports
          <span className="mt-0.5 block text-xs text-white/50">
            Turn off to hide all overlay text (Age, View, WW/WL, Zoom, Instance) on every viewport.
          </span>
        </span>
        <input
          type="checkbox"
          checked={!overlayHidden}
          onChange={e => setOverlayHidden(!e.target.checked)}
          className="h-5 w-5 shrink-0 cursor-pointer accent-[#FF2768]"
        />
      </label>

      {/* Search + counter row */}
      <div
        className={`mt-4 mb-3 flex items-center gap-3 ${
          overlayHidden ? 'pointer-events-none opacity-40' : ''
        }`}
      >
        <input
          type="text"
          placeholder="Search fields…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-[#4F4F4F] bg-transparent px-3 py-2 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none"
        />
        <span className="whitespace-nowrap text-sm text-white/80">
          Selected:{' '}
          <span
            className={
              selectedCount >= MAX_OVERLAY_FIELDS
                ? 'font-semibold text-[#fbbf24]'
                : 'font-semibold text-white'
            }
          >
            {selectedCount} / {MAX_OVERLAY_FIELDS}
          </span>
        </span>
        <button
          type="button"
          onClick={resetToDefaults}
          className="shrink-0 whitespace-nowrap text-xs text-white/60 underline-offset-2 hover:text-white hover:underline"
        >
          Reset
        </button>
      </div>

      {/*
        Scrollable grouped field list.

        The shadcn Dialog wraps children in a plain block-level div, which
        breaks any `flex-1 min-h-0` chain on this scroll area. We instead
        give the list a direct viewport-relative cap (`max-h: 55vh`) so it
        always scrolls regardless of how the dialog lays out its children.
      */}
      <div
        className={`-mr-2 overflow-y-auto pr-2 ${
          overlayHidden ? 'pointer-events-none opacity-40' : ''
        }`}
        style={{ maxHeight: '55vh' }}
      >
        {totalMatches === 0 ? (
          <div className="py-10 text-center text-sm text-white/40">No fields match “{search}”.</div>
        ) : (
          groupedEntries.map(({ group, entries }) => (
            <section
              key={group}
              className="mb-4"
            >
              <div className="sticky top-0 z-10 -mx-1 mb-1 bg-[rgba(11,10,10,0.95)] px-1 py-1 text-xs font-semibold uppercase tracking-wider text-white/40">
                {group}
              </div>
              <ul className="space-y-1">
                {entries.map(field => {
                  const isSelected = selectedFields.includes(field.id);
                  const selectionOrder = isSelected ? selectedFields.indexOf(field.id) + 1 : null;
                  return (
                    <li key={field.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                          isSelected
                            ? 'border-[#FF2768]/60 bg-[#FF2768]/10'
                            : 'border-transparent hover:border-white/10 hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleField(field.id)}
                          className="h-4 w-4 cursor-pointer accent-[#FF2768]"
                        />
                        <span className="flex-1 text-sm text-white">{field.label}</span>
                        {selectionOrder !== null && (
                          <span className="rounded-full bg-[#FF2768]/20 px-2 py-0.5 text-xs font-medium text-[#FF8FB3]">
                            #{selectionOrder}
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-5 flex justify-end gap-3 border-t border-white/10 pt-4">
        <Button
          onClick={onClose}
          className="rounded-lg bg-[#FF2768] px-5 py-2 font-medium text-white hover:bg-[#FF2768]/90"
        >
          Done
        </Button>
      </div>
    </Modal>
  );
};

export default OverlayFieldsModal;
