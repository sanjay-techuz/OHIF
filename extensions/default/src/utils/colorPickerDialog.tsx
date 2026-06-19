import React, { useState } from 'react';
import { ChromePicker } from 'react-color';
import { Button } from '@ohif/ui-next';

import './colorPickerDialog.css';

function ColorPickerDialog({ value, hide, onSave }) {
  const [color, setColor] = useState(value);

  const handleChange = c => {
    setColor(c.rgb);
  };

  return (
    <div className="biedx-color-picker-dialog flex flex-col items-center">
      <div className="biedx-color-picker-wrap">
        <ChromePicker
          color={color}
          onChange={handleChange}
          presetColors={[]}
          width={280}
        />
      </div>

      <div className="mt-6 flex w-full justify-end space-x-3">
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
            onSave(color);
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

export default ColorPickerDialog;
