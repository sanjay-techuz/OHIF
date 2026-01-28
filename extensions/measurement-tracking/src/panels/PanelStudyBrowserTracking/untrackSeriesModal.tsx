import React from 'react';
import { FooterAction } from '@ohif/ui-next';

export function UntrackSeriesModal({ hide, onConfirm, message }) {
  return (
    <>
      <div>
        <p className="mb-2 text-left font-medium text-white">{message}</p>
        <p className="mb-4 text-left font-medium text-white">
          This action cannot be undone and will delete all your existing measurements.
        </p>
      </div>
      <FooterAction className="grid grid-cols-2 gap-4">
        <FooterAction.Secondary
          onClick={hide}
          className="hover:bg-primary/25 h-auto rounded-[8px] bg-[#2E2E2E] px-4 py-2 text-xl font-medium text-white"
        >
          Cancel
        </FooterAction.Secondary>
        <FooterAction.Primary
          className="h-auto rounded-[8px] bg-[#f24064] px-4 py-2 text-xl font-medium text-white hover:bg-[#f24064]/90"
          onClick={() => {
            onConfirm();
            hide();
          }}
        >
          Untrack
        </FooterAction.Primary>
      </FooterAction>
    </>
  );
}
