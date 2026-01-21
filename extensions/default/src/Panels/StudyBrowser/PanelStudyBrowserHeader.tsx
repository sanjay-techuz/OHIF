import { Icons } from '@ohif/ui-next';
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
  // Find the currently selected view preset
  const currentViewPreset = viewPresets?.find(preset => preset.selected) || viewPresets?.[0];

  // Find the other view preset (the one that's not currently selected)
  const otherViewPreset = viewPresets?.find(preset => preset.id !== currentViewPreset?.id);

  // Handle toggle click - switch to the other view
  const handleToggleClick = () => {
    if (otherViewPreset) {
      updateViewPresetValue(otherViewPreset);
    }
  };

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
      {/* Single toggle button on the right */}
      {currentViewPreset && (
        <div className="ml-auto flex shrink-0 items-center justify-center">
          <button
            onClick={handleToggleClick}
            aria-label={`Switch to ${otherViewPreset?.id || 'other'} view`}
            className="flex h-8 w-8 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
            style={{ backgroundColor: '#232323' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#2E2E2E';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#232323';
            }}
          >
            {React.createElement(Icons[currentViewPreset.iconName] || Icons.MissingIcon, {
              style: { width: '20px', height: '20px', flexShrink: 0 },
            })}
          </button>
        </div>
      )}
    </div>
  );
}

export { PanelStudyBrowserHeader };
