import { CommandsManager, ServicesManager } from '@ohif/core';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@ohif/ui-next';
import React, { useCallback, useEffect, useState } from 'react';
import HPALL from '../../assets/images/HP-ALL.png';
import LCCLMLO from '../../assets/images/LCC-LMLO.png';
import RCCRMLO from '../../assets/images/RCC-RMLO.png';
import RLCC from '../../assets/images/RL-CC.png';
import RLMLO from '../../assets/images/RL-MLO.png';

interface HangingProtocolDropdownProps {
  id: string;
  options: {
    icon: string;
    label: string;
    stageIndex: number;
  }[];
  commandsManager: CommandsManager;
  servicesManager: ServicesManager;
}

const VIEW_OPTIONS = [
  { label: 'All', stageIndex: 2, icon: HPALL },
  { label: 'Right-Left CC', stageIndex: 3, icon: RLMLO },
  { label: 'Right-Left MLO', stageIndex: 4, icon: RLCC },
  { label: 'Right CC-Right MLO', stageIndex: 5, icon: RCCRMLO },
  { label: 'Left CC-Left MLO', stageIndex: 6, icon: LCCLMLO },
];

// Extended stages for keyboard navigation (includes hidden stages)
const MAMMOGRAPHY_STAGES = [
  { label: 'All', stageIndex: 2 },
  { label: 'Right-Left CC', stageIndex: 3 },
  { label: 'Right-Left MLO', stageIndex: 4 },
  { label: 'Right CC-Right MLO', stageIndex: 5 },
  { label: 'Left CC-Left MLO', stageIndex: 6 },
  // New hidden stages for keyboard navigation (not in dropdown)
  { label: 'RCC-LCC-TOP', stageIndex: 7 },
  { label: 'RCC-LCC-BOTTOM', stageIndex: 8 },
  { label: 'RMLO-LMLO-TOP', stageIndex: 9 },
  { label: 'RMLO-LMLO-BOTTOM', stageIndex: 10 },
];

const HangingProtocolDropdown: React.FC<HangingProtocolDropdownProps> = ({
  commandsManager,
  servicesManager,
}) => {
  const { displaySetService } = servicesManager.services;

  // Check if any active display set is mammography (MG)
  const activeDisplaySets = displaySetService.getActiveDisplaySets();
  const isMammo = activeDisplaySets.some(ds => ds.Modality === 'MG');

  const [selected, setSelected] = useState(VIEW_OPTIONS[0].stageIndex);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    if (isMammo) {
      setTimeout(() => {
        commandsManager.run({
          commandName: 'setHangingProtocol',
          commandOptions: {
            protocolId: '@ohif/hpMammo',
            stageIndex: VIEW_OPTIONS[0].stageIndex,
          },
        });
        // Apply zoom immediately after hanging protocol change
        setTimeout(() => {
          commandsManager.run({
            commandName: 'setMammographyZoomConditional',
            commandOptions: {},
          });
        }, 100);
      }, 1000);
    }
  }, [isMammo]);

  const handleChange = useCallback(
    event => {
      const stageIndex = parseInt(event, 10);
      setSelected(stageIndex);
      // Update currentStageIndex to match the selected stage
      const stageIndexInArray = VIEW_OPTIONS.findIndex(option => option.stageIndex === stageIndex);
      setCurrentStageIndex(stageIndexInArray);
      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMammo',
          stageIndex,
        },
      });

      // Apply zoom immediately after hanging protocol change
      setTimeout(() => {
        commandsManager.run({
          commandName: 'setMammographyZoomConditional',
          commandOptions: {},
        });
      }, 100);
    },
    [commandsManager]
  );

  // Keyboard navigation handlers
  const handleNextStage = useCallback(() => {
    const nextIndex = currentStageIndex + 1;
    if (nextIndex < MAMMOGRAPHY_STAGES.length) {
      setCurrentStageIndex(nextIndex);
      const stage = MAMMOGRAPHY_STAGES[nextIndex];
      setSelected(stage.stageIndex);

      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMammo',
          stageIndex: stage.stageIndex,
        },
      });

      // Apply zoom immediately after hanging protocol change
      setTimeout(() => {
        commandsManager.run({
          commandName: 'setMammographyZoomConditional',
          commandOptions: {},
        });
      }, 100);
    } else {
      // Loop back to first stage
      setCurrentStageIndex(0);
      const stage = MAMMOGRAPHY_STAGES[0];
      setSelected(stage.stageIndex);
      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMammo',
          stageIndex: stage.stageIndex,
        },
      });

      // Apply zoom immediately after hanging protocol change
      setTimeout(() => {
        commandsManager.run({
          commandName: 'setMammographyZoomConditional',
          commandOptions: {},
        });
      }, 100);
    }
  }, [currentStageIndex, commandsManager]);

  const handlePreviousStage = useCallback(() => {
    const prevIndex = currentStageIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStageIndex(prevIndex);
      const stage = MAMMOGRAPHY_STAGES[prevIndex];
      setSelected(stage.stageIndex);

      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMammo',
          stageIndex: stage.stageIndex,
        },
      });

      // Apply zoom immediately after hanging protocol change
      setTimeout(() => {
        commandsManager.run({
          commandName: 'setMammographyZoomConditional',
          commandOptions: {},
        });
      }, 100);
    } else {
      // Loop to last stage
      const lastIndex = MAMMOGRAPHY_STAGES.length - 1;
      setCurrentStageIndex(lastIndex);
      const stage = MAMMOGRAPHY_STAGES[lastIndex];
      setSelected(stage.stageIndex);
      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMammo',
          stageIndex: stage.stageIndex,
        },
      });

      // Apply zoom immediately after hanging protocol change
      setTimeout(() => {
        commandsManager.run({
          commandName: 'setMammographyZoomConditional',
          commandOptions: {},
        });
      }, 100);
    }
  }, [currentStageIndex, commandsManager]);

  // Keyboard shortcuts for stage navigation (only for mammography)
  useEffect(() => {
    if (!isMammo) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if no modifier keys are pressed
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePreviousStage();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNextStage();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMammo, handleNextStage, handlePreviousStage]);

  if (!isMammo) {
    return null; // Hide the dropdown if not a mammography study
  }

  const defaultOption = selected => {
    return (
      <div className="flex items-center">
        <img
          src={VIEW_OPTIONS.find(option => option.stageIndex === selected)?.icon || HPALL}
          alt="Selected Hanging Protocol"
          className="w-15 h-8"
        />
      </div>
    );
  };

  return (
    <Select
      onValueChange={handleChange}
      value={`${selected}`}
    >
      <SelectTrigger className="h-10 w-20 py-0">
        {/* <SelectValue placeholder="Select a series" />   */}
        {selected ? defaultOption(selected) : 'Select Hanging Protocol'}
      </SelectTrigger>
      <SelectContent>
        {VIEW_OPTIONS.map(option => (
          <SelectItem
            key={option.stageIndex}
            value={`${option.stageIndex}`}
          >
            {defaultOption(option.stageIndex)}
            {/* {option.label} */}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default HangingProtocolDropdown;
