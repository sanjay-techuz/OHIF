/**
 * Case Report modal.
 *
 * One rich-text (HTML) report per case. Admin / master faculty can add/edit it; case-set faculty and
 * students see it read-only, rendered formatted. Shown for all modalities and both view types.
 *
 * Uses the react-quill `RichTextEditor` (same editor the Lexa panel uses) for editing, and renders the
 * stored HTML inside a `.ql-editor` container (quill.snow.css) for read-only so formatting shows. The
 * toolbar stays visible while the body scrolls (RichTextEditor's maxHeight).
 *
 * @author Sanjay Balai
 */

import { Button, Modal } from '@ohif/ui-next';
import React, { useEffect, useState } from 'react';
import 'react-quill/dist/quill.snow.css';
import RichTextEditor from '../LexaReportingPanel/RichTextEditor';

const MAX_CHARS = 100000;

// Report toolbar = default formatting + text alignment (left / center / right / justify) as 4 buttons.
const REPORT_TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ align: '' }, { align: 'center' }, { align: 'right' }, { align: 'justify' }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote'],
  ['clean'],
];

export interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  /** Stored report HTML. */
  initialValue?: string;
  /** When provided (editable actors only), called with the HTML to persist. */
  onSave?: (html: string) => void;
  readOnly?: boolean;
  title?: string;
}

/** True when the HTML has no visible text (Quill emits "<p><br></p>" for an empty editor). */
const isEmptyHtml = (html: string): boolean => {
  const text = (html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return text.length === 0;
};

const ReportModal: React.FC<ReportModalProps> = ({
  open,
  onClose,
  initialValue = '',
  onSave,
  readOnly = false,
  title = 'Report',
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
    if (value.length > MAX_CHARS) {
      setError(`Maximum ${MAX_CHARS} characters allowed`);
      return;
    }
    onSave?.(isEmptyHtml(value) ? '' : value);
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      containerClassName="max-w-[960px] w-[92vw] !rounded-2xl p-10 max-h-[92vh] overflow-auto !bg-[rgba(11,10,10,0.95)] !border !border-[#4F4F4F]"
    >
      <div className="mb-6">
        <h2 className="text-primary-light text-2xl font-bold leading-tight">{title}</h2>
      </div>

      <div className="space-y-2">
        {readOnly ? (
          <div
            className="report-readonly overflow-auto rounded-lg border border-[#4F4F4F] bg-transparent text-white"
            style={{ maxHeight: '62vh' }}
          >
            <style>{`
              .report-readonly .ql-editor { min-height: 200px; color: #FFFFFF; font-family: inherit; }
              .report-readonly .ql-editor a { color: #FF2768; }
              .report-readonly .ql-editor blockquote { border-left: 4px solid #4F4F4F; }
            `}</style>
            {isEmptyHtml(value) ? (
              <div className="px-4 py-6 text-white/40">No report available.</div>
            ) : (
              <div className="ql-editor" dangerouslySetInnerHTML={{ __html: value }} />
            )}
          </div>
        ) : (
          <>
            <RichTextEditor
              value={value}
              onChange={html => {
                setValue(html);
                setError('');
              }}
              placeholder="Write the report..."
              minHeight={320}
              // Cap the body height so only the text scrolls and the toolbar stays visible.
              maxHeight={typeof window !== 'undefined' ? Math.max(320, Math.round(window.innerHeight * 0.55)) : 480}
              toolbar={REPORT_TOOLBAR}
            />
            {error ? <span className="text-sm text-[#FF2768]">{error}</span> : null}
          </>
        )}
      </div>

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

export default ReportModal;
