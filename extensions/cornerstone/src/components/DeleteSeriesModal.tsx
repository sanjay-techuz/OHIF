/**
 * @author Sanjay Balai
 * @description Confirmation shown before an admin / master-faculty permanently
 * deletes one series from a case. The actual delete (Orthanc + annotation cleanup
 * + count refresh) runs in the `deleteCaseSeries` command via `onConfirm`.
 *
 * Styled to match the other BIEDX viewer modals (e.g. RecallModal): two-up button
 * grid, rounded-[8px] buttons, neutral Cancel + coloured action with hover.
 */
import React, { useState } from 'react';
import { Button } from '@ohif/ui-next';

function DeleteSeriesModal({
  seriesLabel,
  onConfirm,
  onCancel,
}: {
  seriesLabel?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="text-white">
      <p className="mb-2 font-medium text-white">
        Permanently delete this series{seriesLabel ? `: ${seriesLabel}` : ''}?
      </p>
      <p className="text-muted-foreground mb-6 text-sm">
        This cannot be undone. The series is removed from storage, and any saved annotations and
        answers for it are discarded.
      </p>

      {/* Inline error — the modal stays open on a failed delete (e.g. the last remaining
          series) so the reason is shown right here instead of only a transient toast. */}
      {error && (
        <p
          className="mb-6 rounded-[8px] px-3 py-2 text-sm"
          style={{
            color: 'hsl(var(--destructive))',
            backgroundColor: 'hsl(var(--destructive) / 0.12)',
          }}
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="ghost"
          disabled={busy}
          onClick={onCancel}
          className="h-auto rounded-[8px] bg-[#2E2E2E] px-4 py-2 text-xl font-medium text-white"
        >
          Cancel
        </Button>

        <Button
          disabled={busy}
          onClick={async () => {
            setError(null);
            setBusy(true);
            try {
              await onConfirm();
            } catch (e: any) {
              // Keep the modal open and show WHY the delete failed (e.g. last remaining series),
              // then re-enable so the user can read it and cancel or retry.
              setError(e?.message || 'Could not delete the series.');
              setBusy(false);
            }
          }}
          className="h-auto rounded-[8px] px-4 py-2 text-xl font-medium text-white"
          style={{ backgroundColor: 'hsl(var(--destructive))' }}
          onMouseEnter={e => {
            if (!busy) {
              e.currentTarget.style.backgroundColor = 'hsl(var(--destructive) / 0.9)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'hsl(var(--destructive))';
          }}
        >
          {busy ? 'Deleting…' : 'Delete series'}
        </Button>
      </div>
    </div>
  );
}

export default DeleteSeriesModal;
