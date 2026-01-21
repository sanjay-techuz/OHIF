import { Icons, ToggleGroup, ToggleGroupItem } from '@ohif/ui-next';
import React from 'react';
import { actionIcon, viewPreset } from './types';

function PanelStudyBrowserHeader({
  viewPresets,
  updateViewPresetValue,
  actionIcons,
  updateActionIconValue,
  onClose,
}: {
  viewPresets: viewPreset[];
  updateViewPresetValue: (viewPreset: viewPreset) => void;
  actionIcons: actionIcon[];
  updateActionIconValue: (actionIcon: actionIcon) => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-[10px] pr-2">
      {/* Studies text on the left */}
      <div className="flex shrink-0 items-center justify-center">
        <span className="text-[14px] font-medium text-white">Studies</span>
      </div>
      {/* Filter icons in the middle */}
      {actionIcons && actionIcons.length > 0 && (
        <div className="flex shrink-0 items-center justify-center">
          <div className="flex items-center space-x-1">
            {actionIcons.map((icon: actionIcon, index) =>
              React.createElement(Icons[icon.iconName] || Icons.MissingIcon, {
                key: index,
                onClick: () => updateActionIconValue(icon),
                className: `cursor-pointer text-white hover:text-highlight`,
                style: { width: '20px', height: '20px', flexShrink: 0, color: 'white' },
              })
            )}
          </div>
        </div>
      )}
      {/* View preset buttons on the right */}
      {viewPresets && viewPresets.length > 0 && (
        <div className="ml-auto flex shrink-0 items-center justify-center">
          <ToggleGroup
            type="single"
            value={viewPresets.filter(preset => preset.selected)[0]?.id || viewPresets[0]?.id}
            onValueChange={value => {
              const selectedViewPreset = viewPresets.find(preset => preset.id === value);
              if (selectedViewPreset) {
                updateViewPresetValue(selectedViewPreset);
              }
            }}
          >
            {viewPresets.map((viewPreset: viewPreset, index) => (
              <ToggleGroupItem
                key={index}
                aria-label={viewPreset.id}
                value={viewPreset.id}
                className="text-white"
              >
                {React.createElement(Icons[viewPreset.iconName] || Icons.MissingIcon, {
                  style: { width: '20px', height: '20px', flexShrink: 0 },
                })}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
    </div>
  );
}

export { PanelStudyBrowserHeader };
