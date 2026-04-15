/**
 * Case History / Description modal for faculty users.
 * Allows faculty to add a free-text case history (max 1000 chars).
 *
 * @author Sanjay Balai
 */

import { Button, Modal } from '@ohif/ui-next';
import React, { useEffect, useState } from 'react';

const MAX_CHARS = 2000;

export interface CaseHistoryModalProps {
  open: boolean;
  onClose: () => void;
  initialValue?: string;
  onSave?: (value: string) => void;
  readOnly?: boolean;
}

const CaseHistoryModal: React.FC<CaseHistoryModalProps> = ({
  open,
  onClose,
  initialValue = '',
  onSave,
  readOnly = false,
}) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError('');
    }
  }, [open, initialValue]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed.length > MAX_CHARS) {
      setError(`Maximum ${MAX_CHARS} characters allowed`);
      return;
    }
    onSave?.(trimmed);
    onClose();
  };

  const remaining = MAX_CHARS - value.length;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      containerClassName="max-w-[520px] !rounded-2xl p-10 max-h-[90vh] overflow-auto !bg-[rgba(11,10,10,0.95)] !border !border-[#4F4F4F]"
    >
      {/* Title */}
      <div className="mb-6">
        <h2 className="text-primary-light text-2xl font-bold leading-tight">Case History</h2>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {readOnly ? (
          <div
            className="w-full whitespace-pre-wrap rounded-lg border border-[#4F4F4F] bg-transparent px-3 py-3 text-white"
            style={{ fontFamily: 'inherit', fontSize: '1rem', minHeight: '200px' }}
          >
            {value || <span className="text-white/40">No case history available.</span>}
          </div>
        ) : (
          <>
            <textarea
              value={value}
              onChange={e => {
                setValue(e.target.value);
                setError('');
              }}
              maxLength={MAX_CHARS}
              className="w-full resize-none rounded-lg border border-[#4F4F4F] bg-transparent px-3 py-3 text-white placeholder-white/40 focus:border-white/50 focus:outline-none focus:ring-0"
              rows={8}
              placeholder="Enter case history or description..."
              style={{ fontFamily: 'inherit', fontSize: '1rem' }}
            />
            <div className="flex items-center justify-between">
              {error ? <span className="text-sm text-[#FF2768]">{error}</span> : <span />}
              <span
                className="text-xs"
                style={{ color: remaining < 50 ? '#FF2768' : 'rgba(255,255,255,0.4)' }}
              >
                {value.length}/{MAX_CHARS}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex justify-end gap-3 pt-2">
        <Button
          variant="ghost"
          type="button"
          onClick={onClose}
          className="min-w-28 h-auto rounded-[8px] px-4 py-2 text-xl font-medium text-white"
          style={{ backgroundColor: readOnly ? '#2E2E2E' : 'transparent' }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#2E2E2E';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = readOnly ? '#2E2E2E' : 'transparent';
          }}
        >
          {readOnly ? 'Close' : 'Cancel'}
        </Button>
        {!readOnly && (
          <Button
            type="button"
            onClick={handleSave}
            className="min-w-28 h-auto rounded-[8px] px-4 py-2 text-xl font-medium text-white"
            style={{ backgroundColor: 'hsl(var(--highlight))' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--highlight) / 0.9)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--highlight))';
            }}
          >
            Save
          </Button>
        )}
      </div>
    </Modal>
  );
};

export default CaseHistoryModal;
