import React, { useState } from 'react';
import { ChromePicker } from 'react-color';
import { Button } from '@ohif/ui-next';

import './multiLabelDialog.css';

export type CustomLabel = {
  id: string;
  text: string;
  fontSize: number;
  color: string;
  // World coordinates [x, y, z]. When undefined the overlay places the
  // label using a default offset near the annotation handle.
  worldPos?: [number, number, number];
};

const FONT_SIZE_OPTIONS = [12, 14, 16, 20, 24, 28];

const PRESET_COLORS = [
  '#ffff00', // yellow (default)
  '#ffffff', // white
  '#4ade80', // green
  '#5cb3ff', // blue
  '#f87171', // red
  '#fb923c', // orange
  '#e879f9', // magenta
];

function genId(): string {
  // Avoid Math.random/Date.now both being unavailable in some sandboxes.
  return 'lbl_' + (typeof crypto !== 'undefined' && crypto?.randomUUID
    ? crypto.randomUUID().split('-')[0]
    : Math.random().toString(36).slice(2, 10));
}

function MultiLabelDialog({
  value,
  hide,
  onSave,
}: {
  value: CustomLabel[];
  hide: () => void;
  onSave: (labels: CustomLabel[]) => void;
}) {
  const [labels, setLabels] = useState<CustomLabel[]>(value || []);
  const [editing, setEditing] = useState<CustomLabel | null>(null);
  const [showCustomColor, setShowCustomColor] = useState(false);

  const startAdd = () => {
    setEditing({
      id: genId(),
      text: '',
      fontSize: 14,
      color: PRESET_COLORS[0],
    });
    setShowCustomColor(false);
  };

  const startEdit = (label: CustomLabel) => {
    setEditing({ ...label });
    setShowCustomColor(!PRESET_COLORS.includes(label.color));
  };

  const removeLabel = (id: string) => {
    setLabels(labels.filter(l => l.id !== id));
  };

  const commitEdit = () => {
    if (!editing) {
      return;
    }
    const trimmed = (editing.text || '').trim();
    if (!trimmed) {
      return;
    }
    const next = { ...editing, text: trimmed };
    const idx = labels.findIndex(l => l.id === next.id);
    if (idx >= 0) {
      const copy = labels.slice();
      copy[idx] = { ...labels[idx], ...next };
      setLabels(copy);
    } else {
      setLabels([...labels, next]);
    }
    setEditing(null);
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  return (
    <div className="biedx-multi-label-dialog flex flex-col gap-4 min-w-[400px]">
      {/* Existing labels list */}
      {labels.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-sm text-white/70">Existing labels ({labels.length})</div>
          <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-1">
            {labels.map(l => (
              <div
                key={l.id}
                className="flex items-center gap-2 rounded bg-white/[0.04] px-2 py-1.5 hover:bg-white/[0.08]"
              >
                <span
                  className="flex-1 truncate"
                  style={{ color: l.color, fontSize: `${l.fontSize}px`, lineHeight: 1.2 }}
                  title={l.text}
                >
                  {l.text}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(l)}
                  className="text-white/70 hover:text-white text-xs px-2 py-0.5"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeLabel(l.id)}
                  className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / edit form */}
      {editing ? (
        <div className="flex flex-col gap-3 rounded border border-white/10 p-3 bg-black/30">
          <input
            type="text"
            autoFocus
            value={editing.text}
            onChange={e => setEditing({ ...editing, text: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitEdit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
              }
            }}
            placeholder="Label text"
            className="biedx-ml-input rounded px-3 py-2 outline-none"
          />

          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70 w-20">Font size</span>
            <select
              value={editing.fontSize}
              onChange={e => setEditing({ ...editing, fontSize: Number(e.target.value) })}
              className="biedx-ml-select rounded px-3 py-1.5 outline-none cursor-pointer"
            >
              {FONT_SIZE_OPTIONS.map(s => (
                <option
                  key={s}
                  value={s}
                >
                  {s} px
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-sm text-white/70 w-20 pt-1">Color</span>
            <div className="flex flex-col gap-2">
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setEditing({ ...editing, color: c });
                      setShowCustomColor(false);
                    }}
                    className="h-6 w-6 rounded border-2"
                    style={{
                      backgroundColor: c,
                      borderColor: editing.color === c ? '#fff' : 'transparent',
                    }}
                    title={c}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setShowCustomColor(v => !v)}
                  className="h-6 px-2 rounded border border-white/30 text-white/80 hover:bg-white/10 text-xs"
                >
                  Custom
                </button>
              </div>
              {showCustomColor && (
                <div className="biedx-mini-picker">
                  <ChromePicker
                    color={editing.color}
                    onChange={c => setEditing({ ...editing, color: c.hex })}
                    presetColors={[]}
                    disableAlpha
                    width={220}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded bg-white/[0.04] px-3 py-2">
            <div className="text-xs text-white/60 mb-1">Preview</div>
            <div
              style={{
                color: editing.color,
                fontSize: `${editing.fontSize}px`,
                lineHeight: 1.2,
                fontWeight: 600,
              }}
            >
              {editing.text || 'Sample text'}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded px-3 py-1 text-white/80 hover:bg-white/10 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commitEdit}
              disabled={!editing.text.trim()}
              className="rounded px-3 py-1 text-white text-sm disabled:opacity-40"
              style={{ backgroundColor: 'hsl(var(--highlight))' }}
            >
              {labels.find(l => l.id === editing.id) ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startAdd}
          className="rounded border border-dashed border-white/30 text-white/80 hover:bg-white/10 px-3 py-2 text-sm"
        >
          + Add a label
        </button>
      )}

      {/* Bottom actions */}
      <div className="mt-2 flex w-full justify-end space-x-3">
        <Button
          variant="ghost"
          onClick={hide}
          className="min-w-28 h-auto rounded-[8px] px-4 py-2 text-base font-medium text-white"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#2E2E2E';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            hide();
            onSave(labels);
          }}
          className="min-w-28 h-auto rounded-[8px] px-4 py-2 text-base font-medium text-white"
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
      </div>
    </div>
  );
}

export default MultiLabelDialog;
