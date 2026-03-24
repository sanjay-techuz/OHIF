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

import HPALL3D from '../../assets/images/HP-ALL-3D.png';
import HPLCC3D from '../../assets/images/HP-LCC-3D.png';
import HPLMLO3D from '../../assets/images/HP-LMLO-3D.png';
import HPRCC3D from '../../assets/images/HP-RCC-3D.png';
import HPRMLO3D from '../../assets/images/HP-RMLO-3D.png';

import HPRLCCBOTTOM from '../../assets/images/RL-CC-BOTTOM.png';
import HPRLCCCENTER from '../../assets/images/RL-CC-CENTER.png';
import HPRLCCTOP from '../../assets/images/RL-CC-TOP.png';
import HPRLMOMBOTTOM from '../../assets/images/RL-MLO-BOTTOM.png';
import HPRLMOMCENTER from '../../assets/images/RL-MLO-CENTER.png';
import HPRLMLOTOP from '../../assets/images/RL-MLO-TOP.png';

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

// Unified array with ALL hanging protocols (used for both dropdown and navigation)
// Includes all stages: prior, current, DBT, and hidden partial views
const ALL_HANGING_PROTOCOLS = [
  // Prior stages (0-1)
  { label: 'All Prior and Current', stageIndex: 0, icon: HPALLCP, requiresPrior: true },
  // Current stages (2-10)
  { label: 'All Current', stageIndex: 2, icon: HPALL },
  { label: 'Right-Left CC', stageIndex: 3, icon: RLCC },
  { label: 'Right CC Current/Prior', stageIndex: 4, icon: HPRCCP, requiresPrior: true },
  { label: 'Left CC Current/Prior', stageIndex: 5, icon: HPLCCP, requiresPrior: true },
  { label: 'Right-Left MLO', stageIndex: 6, icon: RLMLO },
  { label: 'Right MLO Current/Prior', stageIndex: 7, icon: HPRMLOP, requiresPrior: true },
  { label: 'Left MLO Current/Prior', stageIndex: 8, icon: HPLMLOP, requiresPrior: true },
  { label: 'Right CC-Right MLO', stageIndex: 9, icon: RCCRMLO },
  { label: 'Left CC-Left MLO', stageIndex: 10, icon: LCCLMLO },
  // DBT stages (11-15)
  { label: 'DBT All', stageIndex: 11, icon: HPALL3D, requiresDBT: true },
  { label: 'DBT Right CC', stageIndex: 12, icon: HPRCC3D, requiresDBT: true },
  { label: 'DBT Right MLO', stageIndex: 13, icon: HPRMLO3D, requiresDBT: true },
  { label: 'DBT Left CC', stageIndex: 14, icon: HPLCC3D, requiresDBT: true },
  { label: 'DBT Left MLO', stageIndex: 15, icon: HPLMLO3D, requiresDBT: true },
  // Hidden partial view stages (16-21) - now visible in dropdown
  { label: 'RCC-LCC-TOP', stageIndex: 16, icon: HPRLCCTOP },
  { label: 'RCC-LCC-CENTER', stageIndex: 17, icon: HPRLCCCENTER },
  { label: 'RCC-LCC-BOTTOM', stageIndex: 18, icon: HPRLCCBOTTOM },
  { label: 'RMLO-LMLO-TOP', stageIndex: 19, icon: HPRLMLOTOP },
  { label: 'RMLO-LMLO-CENTER', stageIndex: 20, icon: HPRLMOMCENTER },
  { label: 'RMLO-LMLO-BOTTOM', stageIndex: 21, icon: HPRLMOMBOTTOM },
];

const HangingProtocolDropdown: React.FC<HangingProtocolDropdownProps> = ({
  commandsManager,
  servicesManager,
}) => {
  const { displaySetService, hangingProtocolService } = servicesManager.services;

  // Check if any active display set is mammography (MG)
  const activeDisplaySets = displaySetService.getActiveDisplaySets();
  const isMammo = activeDisplaySets.some(ds => ds.Modality === 'MG');
  // Check if any active display set is MRI (MR)
  const isMR = activeDisplaySets.some(ds => ds.Modality === 'MR');

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

  // Unified array for both dropdown and navigation - filter based on prior/DBT availability
  const allHangingProtocols = useMemo(() => {
    return ALL_HANGING_PROTOCOLS.filter(protocol => {
      // Filter out prior-only stages if no prior exists
      if (protocol.requiresPrior && !hasPrior) {
        return false;
      }
      // Filter out DBT stages if not DBT case
      if (protocol.requiresDBT && !isDBT) {
        return false;
      }
      return true;
    });
  }, [hasPrior, isDBT]);
  const [selected, setSelected] = useState(allHangingProtocols[0]?.stageIndex ?? 2);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  // Auto-apply mammography hanging protocol
  useEffect(() => {
    if (isMammo) {
      setTimeout(() => {
        commandsManager.run({
          commandName: 'setHangingProtocol',
          commandOptions: {
            protocolId: '@ohif/hpMammo',
            stageIndex: allHangingProtocols[0]?.stageIndex ?? 2,
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
  }, [isMammo, allHangingProtocols, commandsManager]);

  // Auto-apply MRI hanging protocol (no dropdown, just apply automatically)
  useEffect(() => {
    if (!isMR) {
      return;
    }

    // Check if MRI protocol is already applied to avoid re-applying
    const currentProtocol = hangingProtocolService?.protocol;
    if (currentProtocol?.id === '@ohif/hpMR') {
      return;
    }

    // Apply MRI hanging protocol when MR display sets are detected
    const timeoutId = setTimeout(() => {
      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMR',
          stageIndex: 0, // Default stage (2x3 grid)
        },
      });
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isMR, commandsManager, activeDisplaySets, hangingProtocolService]);

  // Reset currentStageIndex when case type or prior status changes
  useEffect(() => {
    setCurrentStageIndex(0);
    setSelected(allHangingProtocols[0]?.stageIndex ?? 2);
  }, [isDBT, hasPrior, allHangingProtocols]);

  const handleChange = useCallback(
    event => {
      const stageIndex = parseInt(event, 10);
      setSelected(stageIndex);
      // Update currentStageIndex to match the selected stage
      const stageIndexInArray = allHangingProtocols.findIndex(
        protocol => protocol.stageIndex === stageIndex
      );
      setCurrentStageIndex(stageIndexInArray >= 0 ? stageIndexInArray : 0);
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
    [commandsManager, allHangingProtocols]
  );

  // Keyboard navigation handlers
  const handleNextStage = useCallback(() => {
    const nextIndex = currentStageIndex + 1;
    if (nextIndex < allHangingProtocols.length) {
      setCurrentStageIndex(nextIndex);
      const protocol = allHangingProtocols[nextIndex];
      setSelected(protocol.stageIndex);

      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMammo',
          stageIndex: protocol.stageIndex,
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
      const protocol = allHangingProtocols[0];
      setSelected(protocol.stageIndex);
      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMammo',
          stageIndex: protocol.stageIndex,
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
  }, [currentStageIndex, commandsManager, allHangingProtocols]);

  const handlePreviousStage = useCallback(() => {
    const prevIndex = currentStageIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStageIndex(prevIndex);
      const protocol = allHangingProtocols[prevIndex];
      setSelected(protocol.stageIndex);

      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMammo',
          stageIndex: protocol.stageIndex,
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
      const lastIndex = allHangingProtocols.length - 1;
      setCurrentStageIndex(lastIndex);
      const protocol = allHangingProtocols[lastIndex];
      setSelected(protocol.stageIndex);
      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: {
          protocolId: '@ohif/hpMammo',
          stageIndex: protocol.stageIndex,
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
  }, [currentStageIndex, commandsManager, allHangingProtocols]);

  // Re-apply current hanging protocol when sidebar opens/closes to fix viewport blank space
  useEffect(() => {
    if (!isMammo) {
      return;
    }

    const handleSidebarToggle = () => {
      const protocol = allHangingProtocols[currentStageIndex];
      if (!protocol) {
        return;
      }

      // Delay to let sidebar panel transition complete, then re-apply the current HP

      // Apply zoom for all protocols except partial views (stageIndex 16-21)
      // const excludedStages = [16, 17, 18, 19, 20, 21];
      // if (!excludedStages.includes(protocol.stageIndex)) {
      setTimeout(() => {
        commandsManager.run({
          commandName: 'setMammographyZoomConditional',
          commandOptions: {},
        });
      }, 300);
      // }
    };

    window.addEventListener('ohif-sidebar-toggle', handleSidebarToggle);
    return () => window.removeEventListener('ohif-sidebar-toggle', handleSidebarToggle);
  }, [isMammo, currentStageIndex, allHangingProtocols, commandsManager]);

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

  // Hide the dropdown if not a mammography study
  // MRI protocol applies automatically (no dropdown needed)
  if (!isMammo) {
    return null;
  }

  const defaultOption = selected => {
    return (
      <div className="flex items-center">
        <img
          src={
            allHangingProtocols.find(protocol => protocol.stageIndex === selected)?.icon || HPALL
          }
          alt="Selected Hanging Protocol"
          className="w-15 h-10 object-cover"
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
        {allHangingProtocols.map(protocol => (
          <SelectItem
            key={protocol.stageIndex}
            value={`${protocol.stageIndex}`}
          >
            {defaultOption(protocol.stageIndex)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default HangingProtocolDropdown;
