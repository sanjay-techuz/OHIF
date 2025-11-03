import { CommandsManager, ServicesManager } from '@ohif/core';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@ohif/ui-next';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import HPALL from '../../assets/images/HP-ALL.png';
import LCCLMLO from '../../assets/images/LCC-LMLO.png';
import RCCRMLO from '../../assets/images/RCC-RMLO.png';
import RLCC from '../../assets/images/RL-CC.png';
import RLMLO from '../../assets/images/RL-MLO.png';

import HPALLCP from '../../assets/images/HP-ALL-CP.png';
import HPLCCP from '../../assets/images/HP-LCC-P.png';
import HPLMLOP from '../../assets/images/HP-LMLO-P.png';
import HPRCCP from '../../assets/images/HP-RCC-P.png';
import HPRMLOP from '../../assets/images/HP-RMLO-P.png';

import HPLCC3D from '../../assets/images/HP-LCC-3D.png';
import HPLMLO3D from '../../assets/images/HP-LMLO-3D.png';
import HPRCC3D from '../../assets/images/HP-RCC-3D.png';
import HPRMLO3D from '../../assets/images/HP-RMLO-3D.png';

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

// Base view options (always shown, without prior stages)
const BASE_VIEW_OPTIONS = [
  { label: 'All Current', stageIndex: 2, icon: HPALL },
  { label: 'Right-Left CC', stageIndex: 3, icon: RLMLO },
  { label: 'Right-Left MLO', stageIndex: 6, icon: RLCC },
  { label: 'Right CC-Right MLO', stageIndex: 9, icon: RCCRMLO },
  { label: 'Left CC-Left MLO', stageIndex: 10, icon: LCCLMLO },
];

const DBT_VIEW_OPTIONS = [
  { label: 'DBT All', stageIndex: 11, icon: HPALL },
  { label: 'DBT Right CC', stageIndex: 12, icon: HPRCC3D },
  { label: 'DBT Right MLO', stageIndex: 13, icon: HPRMLO3D },
  { label: 'DBT Left CC', stageIndex: 14, icon: HPLCC3D },
  { label: 'DBT Left MLO', stageIndex: 15, icon: HPLMLO3D },
];

// Base stages without prior (for current-only cases)
const BASE_MAMMOGRAPHY_STAGES = [
  { label: 'All Current', stageIndex: 2 },
  { label: 'Right-Left CC', stageIndex: 3 },
  { label: 'Right-Left MLO', stageIndex: 6 },
  { label: 'Right CC-Right MLO', stageIndex: 9 },
  { label: 'Left CC-Left MLO', stageIndex: 10 },
  // Hidden FFDM stages for keyboard navigation (not in dropdown)
  { label: 'RCC-LCC-TOP', stageIndex: 16 },
  { label: 'RCC-LCC-CENTER', stageIndex: 17 },
  { label: 'RCC-LCC-BOTTOM', stageIndex: 18 },
  { label: 'RMLO-LMLO-TOP', stageIndex: 19 },
  { label: 'RMLO-LMLO-CENTER', stageIndex: 20 },
  { label: 'RMLO-LMLO-BOTTOM', stageIndex: 21 },
];

// Prior-only stages (only available when prior exists)
const PRIOR_ONLY_STAGES = [
  { label: 'All Prior and Current', stageIndex: 0 },
  { label: 'Right CC Current/Prior', stageIndex: 4 },
  { label: 'Left CC Current/Prior', stageIndex: 5 },
  { label: 'Right MLO Current/Prior', stageIndex: 7 },
  { label: 'Left MLO Current/Prior', stageIndex: 8 },
];

const DBT_STAGES = [
  { label: 'DBT All', stageIndex: 11 },
  { label: 'DBT Right CC', stageIndex: 12 },
  { label: 'DBT Right MLO', stageIndex: 13 },
  { label: 'DBT Left CC', stageIndex: 14 },
  { label: 'DBT Left MLO', stageIndex: 15 },
];

const PRIOR_STAGES = [
  { label: 'All Prior and Current', stageIndex: 0, icon: HPALLCP },
  { label: 'Right CC Current/Prior', stageIndex: 4, icon: HPRCCP },
  { label: 'Left CC Current/Prior', stageIndex: 5, icon: HPLCCP },
  { label: 'Right MLO Current/Prior', stageIndex: 7, icon: HPRMLOP },
  { label: 'Left MLO Current/Prior', stageIndex: 8, icon: HPLMLOP },
];

const HangingProtocolDropdown: React.FC<HangingProtocolDropdownProps> = ({
  commandsManager,
  servicesManager,
}) => {
  const { displaySetService, hangingProtocolService } = servicesManager.services;

  // Check if any active display set is mammography (MG)
  const activeDisplaySets = displaySetService.getActiveDisplaySets();
  const isMammo = activeDisplaySets.some(ds => ds.Modality === 'MG');

  // Check if it's DBT case by looking for DBT-specific series descriptions or SOP Class UID
  const isDBT = activeDisplaySets.some(ds => {
    if (ds.Modality !== 'MG') {
      return false;
    }

    // Check for DBT-specific series descriptions
    const dsAny = ds as { numImageFrames?: number; sopClassUids?: string[] };
    const isDBTSeries =
      (dsAny.numImageFrames && dsAny.numImageFrames > 1) ||
      (dsAny.sopClassUids && dsAny.sopClassUids.includes('1.2.840.10008.5.1.4.1.1.13.1.3'));

    return isDBTSeries;
  });

  // Function to check if prior exists
  const checkForPrior = useCallback(() => {
    if (!hangingProtocolService) {
      return false;
    }

    // Check if hangingProtocolService has multiple studies (prior exists)
    // studies[0] = current study (studyInstanceUIDsIndex === 0)
    // studies[1] = prior study (studyInstanceUIDsIndex === 1)
    const studies = hangingProtocolService.studies || [];

    if (studies.length > 1) {
      return true;
    }

    // Check for Prior display set selectors that were matched
    // Prior selectors (RCCPrior, LCCPrior, RMLOPrior, LMLOPrior) match when studyInstanceUIDsIndex === 1
    const displaySetMatchDetails = hangingProtocolService.displaySetMatchDetails;
    const priorMatched =
      displaySetMatchDetails?.has('RCCPrior') ||
      displaySetMatchDetails?.has('LCCPrior') ||
      displaySetMatchDetails?.has('RMLOPrior') ||
      displaySetMatchDetails?.has('LMLOPrior');

    if (priorMatched) {
      return true;
    }

    // Check active display sets to see if any belong to prior study
    // Prior studies would be indexed at 1 in the studies array
    if (studies.length > 1) {
      const priorStudy = studies[1];
      const hasPriorDisplaySets = activeDisplaySets.some(
        ds => ds.Modality === 'MG' && ds.StudyInstanceUID === priorStudy?.StudyInstanceUID
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
    if (!hangingProtocolService || !isMammo) {
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
      // subscription.unsubscribe();
      // clearInterval(intervalId);
    };
  }, [hangingProtocolService, isMammo, checkForPrior, activeDisplaySets]);

  // Determine which view options to use based on case type and prior availability
  const currentViewOptions = useMemo(() => {
    let options = [...BASE_VIEW_OPTIONS];

    // Add PRIOR_STAGES to dropdown only if prior exists (to avoid blank viewports)
    if (hasPrior) {
      // Combine and sort by stageIndex to ensure correct order
      options = [...PRIOR_STAGES, ...options].sort((a, b) => a.stageIndex - b.stageIndex);
    }

    // Add DBT stages if DBT case
    if (isDBT) {
      options = [...options, ...DBT_VIEW_OPTIONS].sort((a, b) => a.stageIndex - b.stageIndex);
    }

    return options;
  }, [isDBT, hasPrior]);

  // Determine which stages are available for keyboard navigation
  const currentMammographyStages = useMemo(() => {
    let stages = [...BASE_MAMMOGRAPHY_STAGES];

    // Add PRIOR_ONLY_STAGES only if prior exists (to avoid blank viewports)
    if (hasPrior) {
      // Insert PRIOR_ONLY_STAGES in the correct order based on stageIndex
      // Stage 0 should come first, then insert 4, 5, 7, 8 in their correct positions
      const priorStagesSorted = [...PRIOR_ONLY_STAGES].sort((a, b) => a.stageIndex - b.stageIndex);
      stages = [...priorStagesSorted, ...stages].sort((a, b) => a.stageIndex - b.stageIndex);
    }

    // Add DBT stages if DBT case
    if (isDBT) {
      stages = [...stages, ...DBT_STAGES].sort((a, b) => a.stageIndex - b.stageIndex);
    }

    return stages;
  }, [isDBT, hasPrior]);
  const [selected, setSelected] = useState(currentViewOptions[0].stageIndex);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    if (isMammo) {
      setTimeout(() => {
        commandsManager.run({
          commandName: 'setHangingProtocol',
          commandOptions: {
            protocolId: '@ohif/hpMammo',
            stageIndex: currentViewOptions[0].stageIndex,
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
  }, [isMammo, currentViewOptions, commandsManager]);

  // Reset currentStageIndex when case type or prior status changes
  useEffect(() => {
    setCurrentStageIndex(0);
    setSelected(currentViewOptions[0].stageIndex);
  }, [isDBT, hasPrior, currentViewOptions]);

  const handleChange = useCallback(
    event => {
      const stageIndex = parseInt(event, 10);
      setSelected(stageIndex);
      // Update currentStageIndex to match the selected stage
      const stageIndexInArray = currentViewOptions.findIndex(
        option => option.stageIndex === stageIndex
      );
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
    [commandsManager, currentViewOptions]
  );

  // Keyboard navigation handlers
  const handleNextStage = useCallback(() => {
    const nextIndex = currentStageIndex + 1;
    console.log('nextIndex', nextIndex);
    console.log('currentMammographyStages', currentMammographyStages);
    if (nextIndex < currentMammographyStages.length) {
      setCurrentStageIndex(nextIndex);
      const stage = currentMammographyStages[nextIndex];
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
      const stage = currentMammographyStages[0];
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
  }, [currentStageIndex, commandsManager, currentMammographyStages]);

  const handlePreviousStage = useCallback(() => {
    const prevIndex = currentStageIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStageIndex(prevIndex);
      const stage = currentMammographyStages[prevIndex];
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
      const lastIndex = currentMammographyStages.length - 1;
      setCurrentStageIndex(lastIndex);
      const stage = currentMammographyStages[lastIndex];
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
  }, [currentStageIndex, commandsManager, currentMammographyStages]);

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
          src={currentViewOptions.find(option => option.stageIndex === selected)?.icon || HPALL}
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
        {selected !== undefined || selected !== null
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
            {/* {option.label} */}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default HangingProtocolDropdown;
