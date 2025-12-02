import { CommandsManager, ServicesManager } from '@ohif/core';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@ohif/ui-next';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import HPALL from '../../assets/images/HP-ALL.png';

// Placeholder icons - replace with actual MR-specific icons when available
const MRALL = HPALL;
const MRT2 = HPALL;
const MRT1PRE = HPALL;
const MRDCEPOST1 = HPALL;
const MRDCEPOST2 = HPALL;
const MRSUB = HPALL;
const MRDWI = HPALL;
const MRMIP = HPALL;
const MRT1NFS = HPALL;

interface MrHangingProtocolDropdownProps {
  id: string;
  options: {
    icon: string;
    label: string;
    stageIndex: number;
  }[];
  commandsManager: CommandsManager;
  servicesManager: ServicesManager;
}

// Base view options (always shown, without prior stages)
const BASE_VIEW_OPTIONS = [
  { label: 'All Current', stageIndex: 2, icon: MRALL },
  { label: 'T2 Axial', stageIndex: 3, icon: MRT2 },
  { label: 'T1 Pre Axial', stageIndex: 5, icon: MRT1PRE },
  { label: 'DCE Post1 Axial', stageIndex: 7, icon: MRDCEPOST1 },
  { label: 'DCE Post2 Axial', stageIndex: 9, icon: MRDCEPOST2 },
  { label: 'Subtraction Post1 Axial', stageIndex: 11, icon: MRSUB },
  { label: 'DWI Axial', stageIndex: 13, icon: MRDWI },
  { label: 'MIP Axial', stageIndex: 15, icon: MRMIP },
  { label: 'T1 Non-Fat-Sat Axial', stageIndex: 17, icon: MRT1NFS },
  { label: 'T2-T1 Pre-DCE Post1-DCE Post2', stageIndex: 18, icon: MRALL },
  { label: 'T1 Pre-DCE Post1-DCE Post2-Sub', stageIndex: 19, icon: MRALL },
];

// Base stages without prior (for current-only cases)
const BASE_MR_STAGES = [
  { label: 'All Current', stageIndex: 2 },
  { label: 'T2 Axial', stageIndex: 3 },
  { label: 'T1 Pre Axial', stageIndex: 5 },
  { label: 'DCE Post1 Axial', stageIndex: 7 },
  { label: 'DCE Post2 Axial', stageIndex: 9 },
  { label: 'Subtraction Post1 Axial', stageIndex: 11 },
  { label: 'DWI Axial', stageIndex: 13 },
  { label: 'MIP Axial', stageIndex: 15 },
  { label: 'T1 Non-Fat-Sat Axial', stageIndex: 17 },
  { label: 'T2-T1 Pre-DCE Post1-DCE Post2', stageIndex: 18 },
  { label: 'T1 Pre-DCE Post1-DCE Post2-Sub', stageIndex: 19 },
];

// Prior-only stages (only available when prior exists)
const PRIOR_ONLY_STAGES = [
  { label: 'All Prior and Current', stageIndex: 0 },
  { label: 'T2 Compare', stageIndex: 1 },
  { label: 'T1 Pre Current/Prior', stageIndex: 4 },
  { label: 'DCE Post1 Current/Prior', stageIndex: 6 },
  { label: 'DCE Post2 Current/Prior', stageIndex: 8 },
  { label: 'Subtraction Post1 Current/Prior', stageIndex: 10 },
  { label: 'DWI Current/Prior', stageIndex: 12 },
  { label: 'MIP Current/Prior', stageIndex: 14 },
  { label: 'T1 Non-Fat-Sat Current/Prior', stageIndex: 16 },
];

const PRIOR_STAGES = [
  { label: 'All Prior and Current', stageIndex: 0, icon: MRALL },
  { label: 'T2 Compare', stageIndex: 1, icon: MRT2 },
  { label: 'T1 Pre Current/Prior', stageIndex: 4, icon: MRT1PRE },
  { label: 'DCE Post1 Current/Prior', stageIndex: 6, icon: MRDCEPOST1 },
  { label: 'DCE Post2 Current/Prior', stageIndex: 8, icon: MRDCEPOST2 },
  { label: 'Subtraction Post1 Current/Prior', stageIndex: 10, icon: MRSUB },
  { label: 'DWI Current/Prior', stageIndex: 12, icon: MRDWI },
  { label: 'MIP Current/Prior', stageIndex: 14, icon: MRMIP },
  { label: 'T1 Non-Fat-Sat Current/Prior', stageIndex: 16, icon: MRT1NFS },
];

const MrHangingProtocolDropdown: React.FC<MrHangingProtocolDropdownProps> = ({
  commandsManager,
  servicesManager,
}) => {
  console.log('MrHangingProtocolDropdown component is rendering');
  console.log('servicesManager', servicesManager);
  console.log('commandsManager', commandsManager);

  if (!servicesManager || !servicesManager.services) {
    console.error('MrHangingProtocolDropdown: servicesManager or services is missing');
    return null;
  }

  const { displaySetService, hangingProtocolService } = servicesManager.services;

  if (!displaySetService) {
    console.error('MrHangingProtocolDropdown: displaySetService is missing');
    return null;
  }

  // Check if any active display set is MR
  const activeDisplaySets = displaySetService.getActiveDisplaySets();
  console.log('MrHangingProtocolDropdown: activeDisplaySets', activeDisplaySets);
  const isMR = activeDisplaySets.some(ds => ds.Modality === 'MR');
  console.log('MrHangingProtocolDropdown: isMR', isMR);

  // Function to check if prior exists
  const checkForPrior = useCallback(() => {
    if (!hangingProtocolService) {
      return false;
    }

    // Check if hangingProtocolService has multiple studies (prior exists)
    const studies = hangingProtocolService.studies || [];

    if (studies.length > 1) {
      return true;
    }

    // Check for Prior display set selectors that were matched
    const displaySetMatchDetails = hangingProtocolService.displaySetMatchDetails;
    const priorMatched =
      displaySetMatchDetails?.has('T2AxialPrior') ||
      displaySetMatchDetails?.has('T1PreAxialPrior') ||
      displaySetMatchDetails?.has('DCEPost1AxialPrior') ||
      displaySetMatchDetails?.has('DCEPost2AxialPrior') ||
      displaySetMatchDetails?.has('SubPost1AxialPrior') ||
      displaySetMatchDetails?.has('DWIAxialPrior') ||
      displaySetMatchDetails?.has('MIPAxialPrior') ||
      displaySetMatchDetails?.has('T1NonFatSatAxialPrior');

    if (priorMatched) {
      return true;
    }

    // Check active display sets to see if any belong to prior study
    if (studies.length > 1) {
      const priorStudy = studies[1];
      const hasPriorDisplaySets = activeDisplaySets.some(
        ds => ds.Modality === 'MR' && ds.StudyInstanceUID === priorStudy?.StudyInstanceUID
      );

      if (hasPriorDisplaySets) {
        return true;
      }
    }

    return false;
  }, [hangingProtocolService, activeDisplaySets]);

  // State to track if prior exists
  const [hasPrior, setHasPrior] = useState(false);

  // Check for prior when component mounts and when protocol/studies change
  useEffect(() => {
    if (!hangingProtocolService || !isMR) {
      setHasPrior(false);
      return;
    }

    // Initial check with delay to allow protocol to initialize
    const initialCheck = setTimeout(() => {
      const priorExists = checkForPrior();
      setHasPrior(priorExists);
    }, 500);

    return () => {
      clearTimeout(initialCheck);
    };
  }, [hangingProtocolService, isMR, checkForPrior, activeDisplaySets]);

  // Determine which view options to use based on prior availability
  const currentViewOptions = useMemo(() => {
    let options = [...BASE_VIEW_OPTIONS];

    // Add PRIOR_STAGES to dropdown only if prior exists (to avoid blank viewports)
    if (hasPrior) {
      // Combine and sort by stageIndex to ensure correct order
      options = [...PRIOR_STAGES, ...options].sort((a, b) => a.stageIndex - b.stageIndex);
    }

    return options;
  }, [hasPrior]);

  // Determine which stages are available for keyboard navigation
  const currentMRStages = useMemo(() => {
    let stages = [...BASE_MR_STAGES];

    // Add PRIOR_ONLY_STAGES only if prior exists (to avoid blank viewports)
    if (hasPrior) {
      // Insert PRIOR_ONLY_STAGES in the correct order based on stageIndex
      const priorStagesSorted = [...PRIOR_ONLY_STAGES].sort((a, b) => a.stageIndex - b.stageIndex);
      stages = [...priorStagesSorted, ...stages].sort((a, b) => a.stageIndex - b.stageIndex);
    }

    return stages;
  }, [hasPrior]);

  const [selected, setSelected] = useState(currentViewOptions[0]?.stageIndex ?? 2);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    if (isMR) {
      setTimeout(() => {
        commandsManager.run({
          commandName: 'setHangingProtocol',
          commandOptions: {
            protocolId: '@ohif/hpMR',
            stageIndex: currentViewOptions[0]?.stageIndex ?? 2,
          },
        });
      }, 1000);
    }
  }, [isMR, currentViewOptions, commandsManager]);

  // Reset currentStageIndex when prior status changes
  useEffect(() => {
    setCurrentStageIndex(0);
    setSelected(currentViewOptions[0]?.stageIndex ?? 2);
  }, [hasPrior, currentViewOptions]);

  const handleChange = useCallback(
    event => {
      const stageIndex = parseInt(event, 10);
      setSelected(stageIndex);
      // Update currentStageIndex to match the selected stage
      const stageIndexInArray = currentViewOptions.findIndex(
        option => option.stageIndex === stageIndex
      );
      setCurrentStageIndex(stageIndexInArray >= 0 ? stageIndexInArray : 0);
      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMR',
          stageIndex,
        },
      });
    },
    [commandsManager, currentViewOptions]
  );

  // Keyboard navigation handlers
  const handleNextStage = useCallback(() => {
    const nextIndex = currentStageIndex + 1;
    if (nextIndex < currentMRStages.length) {
      setCurrentStageIndex(nextIndex);
      const stage = currentMRStages[nextIndex];
      setSelected(stage.stageIndex);

      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMR',
          stageIndex: stage.stageIndex,
        },
      });
    } else {
      // Loop back to first stage
      setCurrentStageIndex(0);
      const stage = currentMRStages[0];
      setSelected(stage.stageIndex);
      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMR',
          stageIndex: stage.stageIndex,
        },
      });
    }
  }, [currentStageIndex, commandsManager, currentMRStages]);

  const handlePreviousStage = useCallback(() => {
    const prevIndex = currentStageIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStageIndex(prevIndex);
      const stage = currentMRStages[prevIndex];
      setSelected(stage.stageIndex);

      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMR',
          stageIndex: stage.stageIndex,
        },
      });
    } else {
      // Loop to last stage
      const lastIndex = currentMRStages.length - 1;
      setCurrentStageIndex(lastIndex);
      const stage = currentMRStages[lastIndex];
      setSelected(stage.stageIndex);
      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMR',
          stageIndex: stage.stageIndex,
        },
      });
    }
  }, [currentStageIndex, commandsManager, currentMRStages]);

  // Keyboard shortcuts for stage navigation (only for MR)
  useEffect(() => {
    console.log('isMR', isMR);
    if (!isMR) {
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
  }, [isMR, handleNextStage, handlePreviousStage]);

  if (!isMR) {
    return null; // Hide the dropdown if not an MR study
  }

  const defaultOption = selected => {
    return (
      <div className="flex items-center">
        <img
          src={currentViewOptions.find(option => option.stageIndex === selected)?.icon || MRALL}
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
        {selected !== undefined && selected !== null
          ? defaultOption(selected)
          : 'Select Hanging Protocol'}
      </SelectTrigger>
      <SelectContent>
        {currentViewOptions.map(option => (
          <SelectItem
            key={option.stageIndex}
            value={`${option.stageIndex}`}
          >
            {defaultOption(option.stageIndex)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default MrHangingProtocolDropdown;
