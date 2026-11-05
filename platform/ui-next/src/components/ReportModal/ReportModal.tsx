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

// Brand-first color palette, used for BOTH text color and highlight (background). The order is the
// swatch-grid order: BIEDX pink shades first, then mustard shades, then white / neutrals + a few
// general colors. All are picked for good contrast on the viewer's black background so report text —
// especially MRI case-report headings — stays clearly visible.
const BRAND_COLORS = [
  // Pinks — BIEDX brand #FF2768 first, then lighter and darker shades.
  '#FF2768', '#FF5C87', '#FF8FAC', '#FFB3CC', '#D11E52', '#A3173F', '#73102C',
  // Mustards — #FFC000 first, then lighter and darker shades.
  '#FFC000', '#FFCF33', '#FFDD70', '#FFE9A6', '#CC9A00', '#997300', '#664D00',
  // Neutrals + a few general colors (all readable on black).
  '#FFFFFF', '#D9D9D9', '#A6A6A6', '#00B0F0', '#00B050', '#ED7D31', '#B15EFF',
];

// Report toolbar = formatting + font/highlight color + text alignment. color = text color,
// background = text highlight, both using the brand palette above. A "+ Custom colour" row is
// injected at the bottom of each color dropdown (see RichTextEditor) that opens the OS color picker,
// so any shade can be chosen beyond the brand swatches — no separate toolbar buttons needed.
// All colors are stored as inline styles, so no backend/DB change is needed.
const REPORT_TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: BRAND_COLORS }, { background: BRAND_COLORS }],
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
