import { CommandsManager, ServicesManager } from '@ohif/core';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@ohif/ui-next';
import React, { useCallback, useState } from 'react';
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
  { label: 'Right-Left CC', stageIndex: 3, icon: RLCC },
  { label: 'Right-Left MLO', stageIndex: 4, icon: RLMLO },
  { label: 'Right CC-Right MLO', stageIndex: 5, icon: RCCRMLO },
  { label: 'Left CC-Left MLO', stageIndex: 6, icon: LCCLMLO },
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

  const handleChange = useCallback(
    event => {
      const stageIndex = parseInt(event, 10);
      setSelected(stageIndex);
      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMammo',
          stageIndex,
        },
      });
    },
    [commandsManager]
  );

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
