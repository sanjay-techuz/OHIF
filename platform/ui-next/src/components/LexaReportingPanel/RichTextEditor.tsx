/**
 * @author Sanjay Balai
 * @description Thin React-Quill wrapper used by the Lexa Correct flow's
 * "Report to be reviewed" field. Mirrors the admin panel's pattern (admin
 * uses react-quill 2.0 in 15+ places for description-style fields) but kept
 * minimal — no image upload, no link processing, no react-hook-form binding.
 *
 * The Lexa panel holds plain text in `reportText` (what gets submitted to
 * Gemini) and HTML in `reportHtml` (what the editor displays). Conversions
 * happen at the boundaries; this component just renders the editor.
 */

import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Min editor body height in px. Defaults to 280. */
  minHeight?: number;
}

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote'],
  ['clean'],
];

const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder, minHeight = 280 }) => {
  return (
    <div
      className="lexa-rte overflow-hidden rounded-lg border border-[#4F4F4F]"
      style={{ backgroundColor: 'rgba(11, 10, 10, 0.4)' }}
    >
      <style>{`
                .lexa-rte .ql-toolbar {
                    border: none;
                    border-bottom: 1px solid #4F4F4F;
                    background: rgba(35, 35, 35, 0.6);
                    padding: 6px 10px;
                }
                .lexa-rte .ql-toolbar .ql-stroke { stroke: #FFFFFF; opacity: 0.85; }
                .lexa-rte .ql-toolbar .ql-fill { fill: #FFFFFF; opacity: 0.85; }
                .lexa-rte .ql-toolbar .ql-picker { color: #FFFFFF; opacity: 0.85; }
                .lexa-rte .ql-toolbar button:hover .ql-stroke,
                .lexa-rte .ql-toolbar button.ql-active .ql-stroke,
                .lexa-rte .ql-toolbar .ql-picker-label:hover,
                .lexa-rte .ql-toolbar .ql-picker-label.ql-active { stroke: #FF2768; color: #FF2768; opacity: 1; }
                .lexa-rte .ql-toolbar button:hover .ql-fill,
                .lexa-rte .ql-toolbar button.ql-active .ql-fill { fill: #FF2768; opacity: 1; }
                .lexa-rte .ql-container {
                    border: none;
                    color: #FFFFFF;
                    font-family: inherit;
                    font-size: 14px;
                    line-height: 1.55;
                }
                .lexa-rte .ql-editor {
                    min-height: ${minHeight}px;
                    padding: 14px 16px;
                }
                .lexa-rte .ql-editor.ql-blank::before {
                    color: rgba(255, 255, 255, 0.4);
                    font-style: normal;
                    left: 16px;
                    right: 16px;
                }
                .lexa-rte .ql-picker-options {
                    background: #1a1a1a;
                    border: 1px solid #4F4F4F;
                }
                .lexa-rte .ql-snow .ql-picker.ql-header .ql-picker-label::before,
                .lexa-rte .ql-snow .ql-picker.ql-header .ql-picker-item::before { color: #FFFFFF; }
            `}</style>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={{ toolbar: TOOLBAR }}
      />
    </div>
  );
};

export default RichTextEditor;
