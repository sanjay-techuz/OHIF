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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Min editor body height in px. Defaults to 280. */
  minHeight?: number;
  /**
   * Max editor body height in px. When set, only the text area scrolls (overflow-y: auto) while the
   * toolbar stays fixed above it — so the formatting buttons stay visible in a long document.
   */
  maxHeight?: number;
  /** Quill toolbar config. Defaults to TOOLBAR (callers like the Report pass a richer one). */
  toolbar?: any[];
}

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote'],
  ['clean'],
];

// ---------------------------------------------------------------------------
// Color math for the in-popover custom picker (HSV ⇄ hex). The picker is built
// as plain HTML inside the dropdown so it never closes mid-selection the way the
// browser's native <input type="color"> dialog does.
// ---------------------------------------------------------------------------
const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

const hsvToHex = (h: number, s: number, v: number): string => {
  const c = v * s;
  const hh = (h % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh >= 0 && hh < 1) {
    [r, g, b] = [c, x, 0];
  } else if (hh < 2) {
    [r, g, b] = [x, c, 0];
  } else if (hh < 3) {
    [r, g, b] = [0, c, x];
  } else if (hh < 4) {
    [r, g, b] = [0, x, c];
  } else if (hh < 5) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }
  const m = v - c;
  return `#${toHex((r + m) * 255)}${toHex((g + m) * 255)}${toHex((b + m) * 255)}`;
};

const hexToHsv = (hex: string): { h: number; s: number; v: number } | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    return null;
  }
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / d) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / d + 2);
    } else {
      h = 60 * ((r - g) / d + 4);
    }
  }
  if (h < 0) {
    h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
};

const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder, minHeight = 280, maxHeight, toolbar }) => {
  const quillRef = useRef<ReactQuill>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Last real text selection in the editor. Opening a color input blurs the editor, so we remember
  // the selection as it changes and restore it before applying a custom color.
  const lastRangeRef = useRef<{ index: number; length: number } | null>(null);
  // Bumped to retry the one-time dropdown injection if the editor isn't mounted on the first pass.
  const [injectTick, setInjectTick] = useState(0);

  // Apply a chosen custom color to the remembered selection.
  const applyCustomColor = (format: 'color' | 'background', color: string) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      return;
    }
    const range = lastRangeRef.current;
    if (range) {
      editor.setSelection(range.index, range.length);
    }
    editor.format(format, color);
  };

  // Add a "+ Custom colour" row + an in-popover color picker to the bottom of the text-color and
  // highlight dropdowns. The picker is built as plain HTML (saturation/value box + hue slider + hex +
  // Apply) INSIDE the dropdown, so it stays open while the user drags to choose a shade — unlike the
  // browser's native color dialog, which closes on any focus change (including screenshots). All
  // interactions stopPropagation so Quill never treats them as an outside-click that closes the
  // dropdown. The editor selection is tracked so the picked color lands on the right text.
  useEffect(() => {
    const root = wrapperRef.current;
    const editor = quillRef.current?.getEditor();
    if (!root || !editor) {
      // The editor/toolbar mount with react-quill; retry on the next frame if not ready yet.
      const raf = requestAnimationFrame(() => setInjectTick(t => t + 1));
      return () => cancelAnimationFrame(raf);
    }

    const onSelectionChange = (range: { index: number; length: number } | null) => {
      if (range) {
        lastRangeRef.current = range;
      }
    };
    editor.on('selection-change', onSelectionChange);

    const buildPicker = (format: 'color' | 'background'): HTMLElement => {
      // Start from the brand color for that format.
      const start = hexToHsv(format === 'background' ? '#FFC000' : '#FF2768') ?? { h: 340, s: 0.8, v: 1 };
      let h = start.h;
      let s = start.s;
      let v = start.v;

      const wrap = document.createElement('div');
      wrap.className = 'rte-custom-wrap';

      const header = document.createElement('div');
      header.className = 'rte-custom-color';
      const swatch = document.createElement('span');
      swatch.className = 'rte-custom-swatch';
      header.appendChild(swatch);
      header.appendChild(document.createTextNode('+ Custom colour'));

      const panel = document.createElement('div');
      panel.className = 'rte-custom-panel';
      panel.style.display = 'none';

      const sv = document.createElement('div');
      sv.className = 'rte-sv';
      const svMarker = document.createElement('div');
      svMarker.className = 'rte-sv-marker';
      sv.appendChild(svMarker);

      const hue = document.createElement('div');
      hue.className = 'rte-hue';
      const hueMarker = document.createElement('div');
      hueMarker.className = 'rte-hue-marker';
      hue.appendChild(hueMarker);

      const foot = document.createElement('div');
      foot.className = 'rte-foot';
      const preview = document.createElement('span');
      preview.className = 'rte-preview';
      const hex = document.createElement('input');
      hex.className = 'rte-hex';
      hex.type = 'text';
      hex.spellcheck = false;
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.className = 'rte-apply';
      apply.textContent = 'Apply';
      foot.appendChild(preview);
      foot.appendChild(hex);
      foot.appendChild(apply);

      panel.appendChild(sv);
      panel.appendChild(hue);
      panel.appendChild(foot);
      wrap.appendChild(header);
      wrap.appendChild(panel);

      const render = () => {
        const hueHex = hsvToHex(h, 1, 1);
        sv.style.background = `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0)), ${hueHex}`;
        svMarker.style.left = `${s * 100}%`;
        svMarker.style.top = `${(1 - v) * 100}%`;
        hueMarker.style.left = `${(h / 360) * 100}%`;
        const hx = hsvToHex(h, s, v);
        preview.style.background = hx;
        swatch.style.background = hx;
        if (document.activeElement !== hex) {
          hex.value = hx.toUpperCase();
        }
      };

      // Dragging: listen on document for move/up so the drag continues even if the pointer leaves
      // the small box. Only mousedown starts inside the popover (and is stopPropagation'd), so Quill
      // never sees an outside-click and the dropdown stays open throughout.
      const startDrag = (moveFn: (e: MouseEvent) => void) => (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        moveFn(e);
        const onMove = (ev: MouseEvent) => moveFn(ev);
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      };
      const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
      sv.addEventListener(
        'mousedown',
        startDrag(e => {
          const rect = sv.getBoundingClientRect();
          s = clamp01((e.clientX - rect.left) / rect.width);
          v = 1 - clamp01((e.clientY - rect.top) / rect.height);
          render();
        })
      );
      hue.addEventListener(
        'mousedown',
        startDrag(e => {
          const rect = hue.getBoundingClientRect();
          h = clamp01((e.clientX - rect.left) / rect.width) * 360;
          render();
        })
      );

      // Keep every click inside the picker from bubbling out and collapsing the dropdown.
      panel.addEventListener('mousedown', e => e.stopPropagation());

      header.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
      });
      header.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const show = panel.style.display === 'none';
        panel.style.display = show ? 'block' : 'none';
        if (show) {
          render();
        }
      });

      const readHex = () => {
        const c = hexToHsv(hex.value);
        if (c) {
          h = c.h;
          s = c.s;
          v = c.v;
          render();
        }
      };
      hex.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          readHex();
        }
      });
      hex.addEventListener('change', readHex);

      apply.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        applyCustomColor(format, hsvToHex(h, s, v));
        wrap.closest('.ql-picker')?.classList.remove('ql-expanded');
        panel.style.display = 'none';
      });

      render();
      return wrap;
    };

    const addCustomRow = (pickerClass: string, format: 'color' | 'background') => {
      const options = root.querySelector(`.ql-toolbar .ql-color-picker.${pickerClass} .ql-picker-options`);
      if (!options || options.querySelector('.rte-custom-wrap')) {
        return;
      }
      options.appendChild(buildPicker(format));
    };

    addCustomRow('ql-color', 'color');
    addCustomRow('ql-background', 'background');

    return () => {
      editor.off('selection-change', onSelectionChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectTick]);

  const modules = useMemo(() => ({ toolbar: toolbar ?? TOOLBAR }), [toolbar]);

  return (
    <div
      ref={wrapperRef}
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
                ${
                  maxHeight
                    ? `
                /* Keep the toolbar fixed: only the text body scrolls. */
                .lexa-rte .ql-toolbar { position: sticky; top: 0; z-index: 2; }
                .lexa-rte .ql-container { max-height: ${maxHeight}px; overflow-y: auto; }
                `
                    : ''
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
                /* Color / background pickers: show the swatch grid clearly on the dark toolbar.
                   Width fits 7 swatches per row so the brand palette lines up (pinks row, mustards
                   row, neutrals row). */
                .lexa-rte .ql-snow .ql-color-picker .ql-picker-options,
                .lexa-rte .ql-snow .ql-background .ql-picker-options {
                    background: #141414;
                    border: 1px solid #4F4F4F;
                    border-radius: 8px;
                    padding: 8px;
                    width: 232px;
                    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.65);
                }
                .lexa-rte .ql-snow .ql-color-picker .ql-picker-item,
                .lexa-rte .ql-snow .ql-background .ql-picker-item {
                    border: 1px solid rgba(255, 255, 255, 0.25);
                }
                /* The little color square shown on the toolbar button itself. */
                .lexa-rte .ql-snow .ql-color-picker .ql-picker-label svg .ql-stroke,
                .lexa-rte .ql-snow .ql-background .ql-picker-label svg .ql-stroke { stroke: #FFFFFF; }
                /* "+ Custom colour" row + in-popover picker, injected at the bottom of each color
                   dropdown. clear:both drops the whole block below the floated swatches. */
                .lexa-rte .ql-snow .ql-color-picker .ql-picker-options .rte-custom-wrap,
                .lexa-rte .ql-snow .ql-background .ql-picker-options .rte-custom-wrap {
                    clear: both;
                    width: 100%;
                    margin-top: 6px;
                    border-top: 1px solid #4F4F4F;
                }
                .lexa-rte .rte-custom-color {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 4px 6px;
                    color: #FFFFFF;
                    font-size: 12px;
                    cursor: pointer;
                }
                .lexa-rte .rte-custom-color:hover { color: #FF2768; }
                .lexa-rte .rte-custom-swatch {
                    width: 16px;
                    height: 16px;
                    border-radius: 3px;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    background: linear-gradient(135deg, #FF2768 0%, #FFC000 100%);
                }
                .lexa-rte .rte-custom-panel { padding: 2px 2px 4px; }
                .lexa-rte .rte-sv {
                    position: relative;
                    width: 100%;
                    height: 110px;
                    border-radius: 4px;
                    cursor: crosshair;
                }
                .lexa-rte .rte-sv-marker {
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    border: 2px solid #FFFFFF;
                    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                }
                .lexa-rte .rte-hue {
                    position: relative;
                    width: 100%;
                    height: 12px;
                    margin-top: 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
                }
                .lexa-rte .rte-hue-marker {
                    position: absolute;
                    top: 50%;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    border: 2px solid #FFFFFF;
                    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                }
                .lexa-rte .rte-foot {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 10px;
                }
                .lexa-rte .rte-preview {
                    flex: none;
                    width: 22px;
                    height: 22px;
                    border-radius: 4px;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                }
                .lexa-rte .rte-hex {
                    flex: 1 1 auto;
                    min-width: 0;
                    background: #1E1E1E;
                    border: 1px solid #4F4F4F;
                    border-radius: 4px;
                    color: #FFFFFF;
                    font-size: 11px;
                    padding: 5px 6px;
                }
                /* Scoped with .ql-snow so these win over Quill's '.ql-snow .ql-toolbar button' rule,
                   which otherwise forces our Apply button to width:28px/float:left and clips it. */
                .lexa-rte .ql-snow .rte-apply {
                    flex: none;
                    float: none;
                    width: auto;
                    height: auto;
                    white-space: nowrap;
                    background: hsl(var(--highlight));
                    border: none;
                    border-radius: 6px;
                    color: #FFFFFF !important;
                    font-size: 11px;
                    font-weight: 600;
                    padding: 6px 14px;
                    cursor: pointer;
                }
                .lexa-rte .ql-snow .rte-apply:hover { background: hsl(var(--highlight) / 0.9); }
            `}</style>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
      />
    </div>
  );
};

export default RichTextEditor;
