import { CommandsManager, ServicesManager } from '@ohif/core';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@ohif/ui-next';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUIStateStore } from '../stores/useUIStateStore';
import {
  getAvailableMRViews,
  isStageAvailable,
  type MRViewKey,
} from '../hangingprotocols/utils/mrViewAvailability';
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

// CEM (Contrast-Enhanced Mammography) hanging-protocol icons.
import HP_CEM_ALL from '../../assets/images/HP-CEM-ALL.png';
import HP_CEM_LE_ALL from '../../assets/images/HP-CEM-LE-ALL.png';
import HP_CEM_ALL_RE from '../../assets/images/HP-CEM-ALL-RE.png';
import HP_CEM_RCC from '../../assets/images/HP-CEM-RCC-LE-RE.png';
import HP_CEM_LCC from '../../assets/images/HP-CEM-LCC-LE-RE.png';
import HP_CEM_RMLO from '../../assets/images/HP-CEM-RMLO-LE-RE.png';
import HP_CEM_LMLO from '../../assets/images/HP-CEM-LMLO-LE-RE.png';

// Breast-MRI hanging-protocol thumbnails (layout diagrams for each stage).
import MR_HP_1 from '../../assets/images/MR-HP/Protocol-1.png';
import MR_HP_2 from '../../assets/images/MR-HP/Protocol-2.png';
import MR_HP_3 from '../../assets/images/MR-HP/Protocol-3.png';
import MR_HP_4 from '../../assets/images/MR-HP/Protocol-4.png';

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

// CEM (Contrast-Enhanced Mammography) hanging protocol stages — mirrors
// the stages defined in `hangingprotocols/hpCEM.ts`. The CEM dropdown
// uses the same MG icons (LE views are visually identical to standard
// MG) until dedicated CEM thumbnails are added. Custom icons are a
// pure-cosmetic upgrade and can be swapped in without touching this
// stage mapping.
const CEM_HANGING_PROTOCOLS = [
  // Prior/Current recombined comparison (stage 7 in hpCEM). Listed FIRST so that
  // when a prior is present it becomes the default selected entry (mirrors MG's
  // 'All Prior and Current' being first). Filtered out entirely when there's no
  // prior (requiresPrior), so no-prior CEM falls back to 'Paired' as the default.
  { label: 'Prior/Current Recombined', stageIndex: 7, icon: HP_CEM_ALL_RE, requiresPrior: true },
  { label: 'Paired LE/Recombined (All)', stageIndex: 0, icon: HP_CEM_ALL },
  { label: 'All Low-Energy', stageIndex: 1, icon: HP_CEM_LE_ALL },
  { label: 'All Recombined', stageIndex: 2, icon: HP_CEM_ALL_RE },
  { label: 'R CC: LE vs Recombined', stageIndex: 3, icon: HP_CEM_RCC },
  { label: 'L CC: LE vs Recombined', stageIndex: 4, icon: HP_CEM_LCC },
  { label: 'R MLO: LE vs Recombined', stageIndex: 5, icon: HP_CEM_RMLO },
  { label: 'L MLO: LE vs Recombined', stageIndex: 6, icon: HP_CEM_LMLO },
];

// Breast-MRI hanging protocol stages — mirrors the two stages defined in
// `hangingprotocols/hpMR.ts`. Each stage shows a layout-diagram thumbnail
// (Protocol-1..4) in the dropdown, like MG/CEM.
// `viewKeys` lists the view types a stage uses; a stage is DISABLED (greyed) in
// the dropdown when NONE of its views exist in the study.
const MR_HANGING_PROTOCOLS: {
  label: string;
  stageIndex: number;
  viewKeys: MRViewKey[];
  icon: string;
}[] = [
  { label: '1×2 MIP', stageIndex: 0, viewKeys: ['MIP_SI', 'MIP_RL'], icon: MR_HP_1 },
  { label: '2×3', stageIndex: 1, viewKeys: ['T1', 'STIR', 'SAG_R', 'VIBRANT2', 'VIBRANT5', 'SAG_L'], icon: MR_HP_2 },
  { label: '2×4', stageIndex: 2, viewKeys: ['T1', 'STIR', 'CORONAL', 'SAG_R', 'DWI', 'ADC', 'VIBRANT2', 'SAG_L'], icon: MR_HP_3 },
  { label: '2×2', stageIndex: 3, viewKeys: ['T1', 'STIR', 'VIBRANT2', 'VIBRANT5'], icon: MR_HP_4 },
];

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

// Announce a deliberate hanging-protocol / stage swap to the ViewerLayout
// loader gate, THEN run it. The gate holds a full-screen loader over the
// viewport until the new protocol's panes have painted, so the default→target
// swap on initial load and every manual stage swap stay flicker-free. See the
// loader gate in extensions/default/src/ViewerLayout/index.tsx (listens for the
// `viewer-hp-transition` event).
const runHangingProtocol = (
  commandsManager: CommandsManager,
  commandOptions: Record<string, unknown>
) => {
  window.dispatchEvent(new CustomEvent('viewer-hp-transition'));
  commandsManager.run({ commandName: 'setHangingProtocol', commandOptions });
};

// Settle window for the MG auto-apply: the protocol is applied only after no
// new/changed display set has arrived for this long, so the study's display-set
// stream has quiesced (every view exists) before the matcher runs. All four MG
// views live in ONE series that OHIF splits into per-image display sets as the
// instances stream in — if the matcher runs mid-stream, a not-yet-created view
// (e.g. RCC) is missing and its pane grabs the next-best same-laterality series
// (RMLO), which is the rare/random "wrong sequence" you can hit on some loads.
const MAMMO_HP_SETTLE_MS = 750;

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

  // Which breast-MRI view types this study actually has — used to grey out any
  // MR stage whose views are all missing (e.g. no MIP → the 1×2 MIP stage).
  const availableMRViews = isMR
    ? getAvailableMRViews(activeDisplaySets as unknown as Record<string, unknown>[])
    : new Set<MRViewKey>();

  // CEM detection. Two signals (per user spec):
  //   1) Admin-tagged via case data: `modalitySlug === 'CEM'`. Trusted first
  //      because slugs arrive from the API alongside case metadata and
  //      don't depend on display sets being loaded yet.
  //   2) Fallback: any active display set has `ImageType` containing
  //      'RECOMBINED' (the load-bearing tag — see cemDisplaySetSelector.ts).
  //      Covers the case where admin forgot to tag but the DICOM is CEM.
  //
  // CEM cases ALSO report `Modality: 'MG'` on their images, so without
  // this guard `isMammo` would be true and the MG protocol would
  // hijack the auto-apply below. The MG auto-apply is gated by
  // `!isCEM` for that reason.
  const modalitySlug = useUIStateStore(s => s.uiState.modalitySlug as string | null | undefined);
  const isCEM = useMemo(() => {
    if ((modalitySlug || '').toUpperCase() === 'CEM') return true;
    // Vendor-agnostic CEM contrast tag: RECOMBINED (Hologic) / SUBTRACTION (GE "DES") / IODINE / CESM.
    const CEM_TOKENS = ['RECOMBINED', 'SUBTRACTION', 'IODINE', 'CESM'];
    return activeDisplaySets.some(ds => {
      const imageType = (ds as { ImageType?: unknown }).ImageType;
      const flat = Array.isArray(imageType)
        ? imageType.join('|').toUpperCase()
        : typeof imageType === 'string'
          ? imageType.toUpperCase()
          : '';
      return CEM_TOKENS.some(t => flat.includes(t));
    });
  }, [modalitySlug, activeDisplaySets]);

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

  // For CEM, the dropdown and nav use a different protocol id and a
  // different stage map. Centralising both here keeps every callback /
  // effect below from having to branch on `isCEM` for the protocolId
  // and the stage array — they just consume `activeProtocolId` and
  // `allHangingProtocols`.
  const activeProtocolId = isMR ? '@ohif/hpMR' : isCEM ? '@ohif/hpCEM' : '@ohif/hpMammo';

  // Unified array for both dropdown and navigation - filter based on prior/DBT availability
  const allHangingProtocols = useMemo(() => {
    if (isMR) {
      // MRI: two fixed stages (Standard 2×3, With Sagittal 2×4). No prior/DBT filtering.
      return MR_HANGING_PROTOCOLS;
    }
    if (isCEM) {
      // CEM: 7 base stages + an optional Prior/Current stage that only shows
      // when the user has picked a study to compare.
      return CEM_HANGING_PROTOCOLS.filter(protocol => !(protocol.requiresPrior && !hasPrior));
    }
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
  }, [hasPrior, isDBT, isCEM, isMR]);
  const [selected, setSelected] = useState(allHangingProtocols[0]?.stageIndex ?? 2);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  // One-shot guard for the MG auto-apply. It MUST be a ref (not a closure
  // local or state) so it survives the effect re-running: the auto-apply
  // effect below re-runs whenever prior-detection or DBT-detection changes,
  // and a closure-local flag would reset to false each time — re-applying the
  // protocol mid-session and clobbering the user's manual layout/drag. A ref
  // keeps "apply exactly once per mounted study" truly once.
  const mammoHpAppliedRef = useRef(false);

  // One-shot guard for the MRI auto-apply (same rationale as the MG ref: survive
  // effect re-runs so we apply exactly once per mounted study and never clobber
  // the user's manual stage/drag choice).
  const mrHpAppliedRef = useRef(false);

  // Auto-apply mammography hanging protocol — guarded by !isCEM because
  // CEM display sets ALSO have Modality === 'MG' but need their own
  // protocol (see CEM auto-apply below).
  //
  // The protocol matches views to panes by a weighted score. If it runs while
  // only SOME views' display sets have been created, a same-laterality
  // wrong-view series can out-score an absent view and win its pane (e.g. RMLO
  // landing in the RCC pane). The previous fixed 250ms timer gave no guarantee
  // all four views existed by then, and — because its `applied` flag was a
  // closure local — the effect re-ran whenever prior/DBT detection changed
  // `allHangingProtocols`, resetting the flag and RE-APPLYING the protocol
  // mid-session: that both re-triggered the match race and clobbered a user's
  // manual drag ("RCC viewport shows LMLO; dragging RCC in doesn't stick").
  // Reloading the case (warm cache, everything settles at once) made it look
  // fixed — the classic timing-bug signature.
  //
  // Fix, two parts working together:
  //   1) Deterministic matching — the `MammoView` custom attribute (weight 100,
  //      derived from the SAME ViewPosition/laterality source as the overlay)
  //      pins each standard view to its own pane regardless of load order.
  //   2) Debounce + a REF-backed one-shot guard here: apply exactly once, only
  //      after the DISPLAY_SETS_ADDED stream has been quiet for the settle
  //      window (all views present). The ref survives effect re-runs, so
  //      prior/DBT detection can no longer retrigger a second apply, and later
  //      user interactions (stage change, drag-drop) are never disturbed.
  // `allHangingProtocols` is intentionally NOT a dependency — its identity
  // churns as prior/DBT are detected, which is exactly what used to re-fire
  // this effect. The default stage is the canonical "All Current" 4-up (2).
  useEffect(() => {
    if (!isMammo || isCEM || mammoHpAppliedRef.current) {
      return;
    }

    let settleTimer: ReturnType<typeof setTimeout>;

    const applyMammoProtocol = () => {
      if (mammoHpAppliedRef.current) {
        return;
      }
      // Don't apply until there is at least one MG display set to hang. If the
      // settle timer fired before any MG series materialised, bail WITHOUT
      // marking applied — the next DISPLAY_SETS event reschedules us.
      const active = displaySetService.getActiveDisplaySets?.() || [];
      if (!active.some((ds: any) => ds.Modality === 'MG')) {
        return;
      }
      mammoHpAppliedRef.current = true;

      // Apply on a STABLE, COMPLETE load via reset:true. This makes the
      // setHangingProtocol command:
      //   1. re-fetch getActiveDisplaySets() NOW, so the matcher sees every
      //      view that has been created (fixes the mid-stream race where a
      //      not-yet-created RCC left its pane to a wrong same-laterality view),
      //   2. bypass the cached viewportGridState, so a layout that was cached
      //      from an earlier partial/among-attempts load is never restored
      //      (this is why it looked fine 2-3 times then wrong the 4th), and
      //   3. run with NO explicit stage, so the gated stageActivation in
      //      hpMammo.ts chooses the correct default — stage 2 "All Current"
      //      when there is no prior, stage 0 when a prior exists.
      window.dispatchEvent(new CustomEvent('viewer-hp-transition'));
      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: { protocolId: '@ohif/hpMammo', reset: true },
      });

      // Record the stage the gate actually chose so Reset/Clear can snap back
      // to it, then apply the mammography zoom.
      setTimeout(() => {
        const stageIndex = hangingProtocolService?.getState?.()?.stageIndex ?? 2;
        (window as any).__initialHangingProtocol = {
          protocolId: '@ohif/hpMammo',
          stageIndex,
        };
        commandsManager.run({
          commandName: 'setMammographyZoomConditional',
          commandOptions: {},
        });
      }, 100);
    };

    const scheduleApply = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(applyMammoProtocol, MAMMO_HP_SETTLE_MS);
    };

    scheduleApply();
    // Re-arm the settle timer on BOTH added and changed events: the per-image
    // MG display sets can arrive (added) or be re-sorted/updated (changed) in
    // several bursts, and we want to wait until that stream goes quiet.
    const addedSub = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_ADDED,
      () => {
        if (!mammoHpAppliedRef.current) {
          scheduleApply();
        }
      }
    );
    const changedSub = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_CHANGED,
      () => {
        if (!mammoHpAppliedRef.current) {
          scheduleApply();
        }
      }
    );

    return () => {
      clearTimeout(settleTimer);
      addedSub.unsubscribe();
      changedSub.unsubscribe();
    };
  }, [isMammo, isCEM, commandsManager, displaySetService, hangingProtocolService]);

  // Auto-apply CEM hanging protocol when the study is CEM (slug-tagged
  // or contains a RECOMBINED display set). Same 1s delay precedent as
  // the MG auto-apply so display sets have time to land before the HP
  // service does its matching pass.
  useEffect(() => {
    if (!isCEM) {
      return;
    }
    const currentProtocol = hangingProtocolService?.protocol;
    if (currentProtocol?.id === '@ohif/hpCEM') {
      return;
    }
    const timeoutId = setTimeout(() => {
      (window as any).__initialHangingProtocol = { protocolId: '@ohif/hpCEM', stageIndex: 0 };
      runHangingProtocol(commandsManager, {
        protocolId: '@ohif/hpCEM',
        stageIndex: 0,
      });
      // Reuse the MG zoom callback — CEM LE images are dimensionally
      // identical to MG so the same anchor math works.
      setTimeout(() => {
        commandsManager.run({
          commandName: 'setMammographyZoomConditional',
          commandOptions: {},
        });
      }, 100);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [isCEM, commandsManager, hangingProtocolService]);

  // Auto-apply the MRI hanging protocol (default stage 0, the 2×3 layout). The
  // dropdown lets the user switch to stage 1 (2×4 with sagittals) afterwards.
  //
  // Uses the SAME settle-debounce as the MG auto-apply: a breast-MRI exam
  // streams ~30 separate series (T1, STIR, dynamic phases, subtractions, MIPs)
  // as independent display sets. If the protocol runs before the subtraction /
  // MIP / sagittal series have arrived, those required-gated panes match nothing
  // and stay BLANK permanently (the matcher does not re-run on later arrivals).
  // So we wait until DISPLAY_SETS_ADDED/CHANGED has been quiet for the settle
  // window (every series present), then apply exactly once via a ref guard.
  useEffect(() => {
    if (!isMR || mrHpAppliedRef.current) {
      return;
    }

    let settleTimer: ReturnType<typeof setTimeout>;

    const applyMrProtocol = () => {
      if (mrHpAppliedRef.current) {
        return;
      }
      const active = displaySetService.getActiveDisplaySets?.() || [];
      if (!active.some((ds: any) => ds.Modality === 'MR')) {
        // Settle fired before any MR series materialised — bail WITHOUT marking
        // applied; the next DISPLAY_SETS event reschedules us.
        return;
      }
      mrHpAppliedRef.current = true;

      // Default stage = first stage whose views actually exist in this study.
      // Prefer "1×2 MIP" (stage 0) when a MIP is present; otherwise fall through
      // to the first available stage (2×3 → 2×4 → 2×2), else stage 0.
      const available = getAvailableMRViews(
        active as unknown as Record<string, unknown>[]
      );
      const defaultStage =
        MR_HANGING_PROTOCOLS.find(p => isStageAvailable(p.viewKeys, available))?.stageIndex ?? 0;

      (window as any).__initialHangingProtocol = {
        protocolId: '@ohif/hpMR',
        stageIndex: defaultStage,
      };
      // reset:true so the matcher re-reads getActiveDisplaySets() NOW (sees every
      // streamed series) and bypasses any cached partial-load viewport layout.
      window.dispatchEvent(new CustomEvent('viewer-hp-transition'));
      commandsManager.run({
        commandName: 'setHangingProtocol',
        commandOptions: { protocolId: '@ohif/hpMR', stageIndex: defaultStage, reset: true },
      });
      setSelected(defaultStage);
      // Keep the keyboard-nav cursor in sync with the applied stage (MR stageIndex
      // === its index in MR_HANGING_PROTOCOLS), so ArrowRight/Left step from here.
      setCurrentStageIndex(defaultStage);
    };

    const scheduleApply = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(applyMrProtocol, MAMMO_HP_SETTLE_MS);
    };

    scheduleApply();
    const addedSub = displaySetService.subscribe(displaySetService.EVENTS.DISPLAY_SETS_ADDED, () => {
      if (!mrHpAppliedRef.current) {
        scheduleApply();
      }
    });
    const changedSub = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_CHANGED,
      () => {
        if (!mrHpAppliedRef.current) {
          scheduleApply();
        }
      }
    );

    return () => {
      clearTimeout(settleTimer);
      addedSub.unsubscribe();
      changedSub.unsubscribe();
    };
  }, [isMR, commandsManager, displaySetService, hangingProtocolService]);

  // Reset currentStageIndex when case type or prior status changes
  useEffect(() => {
    setCurrentStageIndex(0);
    setSelected(allHangingProtocols[0]?.stageIndex ?? 2);
  }, [isDBT, hasPrior, allHangingProtocols]);

  // Keep the dropdown's selected label in sync with the active stage
  // whenever something OUTSIDE this component changes the protocol/stage —
  // e.g. the toolbar `resetView` command calling
  // `hangingProtocolService.setProtocol(id, { stageIndex })` directly.
  // Without this, the dropdown still shows the user's previously-picked
  // stage label (e.g. "Right MLO Current/Prior") even after Reset has
  // moved the viewports back to the default stage ("All Current").
  // PROTOCOL_CHANGED fires from the HP service's own `_setProtocol` path
  // (HangingProtocolService.ts:1676) with the new `stageIdx` payload, so
  // this is the canonical signal to re-sync.
  useEffect(() => {
    if (!hangingProtocolService) {
      return;
    }
    const { unsubscribe } = hangingProtocolService.subscribe(
      hangingProtocolService.EVENTS.PROTOCOL_CHANGED,
      (payload: any) => {
        // A manual prior comparison (applied/cleared from the study browser)
        // re-runs the protocol with 2 studies / 1 study. This is the canonical
        // signal that the prior-aware stages should appear or disappear from the
        // dropdown — the mount-time `checkForPrior` can't see a later comparison.
        setHasPrior((hangingProtocolService.studies?.length || 0) > 1);

        const stageIdx = payload?.stageIdx;
        if (typeof stageIdx !== 'number') {
          return;
        }
        const idx = allHangingProtocols.findIndex(p => p.stageIndex === stageIdx);
        if (idx >= 0) {
          setSelected(stageIdx);
          setCurrentStageIndex(idx);
        }
      }
    );
    return () => unsubscribe();
  }, [hangingProtocolService, allHangingProtocols]);

  const handleChange = useCallback(
    event => {
      const stageIndex = parseInt(event, 10);
      setSelected(stageIndex);
      // Update currentStageIndex to match the selected stage
      const stageIndexInArray = allHangingProtocols.findIndex(
        protocol => protocol.stageIndex === stageIndex
      );
      setCurrentStageIndex(stageIndexInArray >= 0 ? stageIndexInArray : 0);
      runHangingProtocol(commandsManager, {
        protocolId: activeProtocolId,
        stageIndex,
      });

      // Apply zoom immediately after hanging protocol change (MG/CEM only —
      // the mammography zoom is meaningless for MR and must not run there).
      if (!isMR) {
        setTimeout(() => {
          commandsManager.run({
            commandName: 'setMammographyZoomConditional',
            commandOptions: {},
          });
        }, 100);
      }
    },
    [commandsManager, allHangingProtocols, activeProtocolId, isMR]
  );

  // Keyboard navigation handlers
  // Step to the next (dir=1) / previous (dir=-1) stage, wrapping around. Shared by
  // the ArrowRight/ArrowLeft shortcuts for MG/CEM AND MR. For MR it SKIPS stages
  // whose views are all missing (the greyed-out ones) so keyboard nav never lands
  // on an all-blank layout, and it never runs the mammography-only zoom.
  const stepStage = useCallback(
    (dir: 1 | -1) => {
      const n = allHangingProtocols.length;
      if (n === 0) {
        return;
      }
      const isDisabled = (protocol: { viewKeys?: MRViewKey[] }) =>
        isMR && !!protocol.viewKeys && !isStageAvailable(protocol.viewKeys, availableMRViews);

      // Walk in `dir`, wrapping, to the next ENABLED stage (at most n steps).
      let idx = currentStageIndex;
      for (let i = 0; i < n; i++) {
        idx = (idx + dir + n) % n;
        const protocol = allHangingProtocols[idx];
        if (isDisabled(protocol as { viewKeys?: MRViewKey[] })) {
          continue;
        }
        setCurrentStageIndex(idx);
        setSelected(protocol.stageIndex);
        runHangingProtocol(commandsManager, {
          protocolId: activeProtocolId,
          stageIndex: protocol.stageIndex,
        });
        // Mammography-only zoom — meaningless for MR and must not run there.
        if (!isMR) {
          setTimeout(() => {
            commandsManager.run({
              commandName: 'setMammographyZoomConditional',
              commandOptions: {},
            });
          }, 100);
        }
        return;
      }
    },
    [currentStageIndex, allHangingProtocols, commandsManager, activeProtocolId, isMR, availableMRViews]
  );

  const handleNextStage = useCallback(() => stepStage(1), [stepStage]);
  const handlePreviousStage = useCallback(() => stepStage(-1), [stepStage]);

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

  // Keyboard shortcuts for stage navigation (mammography + breast MRI).
  useEffect(() => {
    if (!isMammo && !isMR) {
      return;
    }

    // Ignore the arrow-key navigation when the user is interacting with any
    // form control (typing) or while ANY modal / popover / dropdown is open
    // on the page. Without this guard, pressing left/right inside an input
    // (e.g. typing in the WorkList filter, the Calibration mm prompt, a
    // RTE in the Lexa panel, any radix dropdown) would silently swap the
    // viewer's hanging protocol behind the open UI.
    //
    // Detection — one DOM query covers the common patterns:
    //   - `[role="dialog"]` / `[role="alertdialog"]` — any modal
    //   - `[data-state="open"][role="menu"|"listbox"]` — radix dropdowns
    //   - `[data-radix-popper-content-wrapper]` — radix popovers/tooltips
    //   - active element is an input / textarea / select / contenteditable
    const shouldSkipHpHotkey = (): boolean => {
      const ae = document.activeElement as HTMLElement | null;
      if (ae) {
        const tag = ae.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          ae.isContentEditable
        ) {
          return true;
        }
      }
      return !!document.querySelector(
        '[role="dialog"], [role="alertdialog"], [data-state="open"][role="menu"], [data-state="open"][role="listbox"], [data-radix-popper-content-wrapper]'
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if no modifier keys are pressed
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // Suppress HP nav when an input/modal/popup is active.
      if (shouldSkipHpHotkey()) {
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
  }, [isMammo, isMR, handleNextStage, handlePreviousStage]);

  // Show the dropdown for MG/CEM (icon thumbnails) and MR (two text-labelled
  // stages). Hide for anything else.
  if (!isMammo && !isMR) {
    return null;
  }

  const defaultOption = selectedIndex => {
    const proto = allHangingProtocols.find(protocol => protocol.stageIndex === selectedIndex) as
      | { label: string; stageIndex: number; icon?: string }
      | undefined;
    // No thumbnail available → show the protocol name.
    if (!proto?.icon) {
      return (
        <div className="flex items-center truncate whitespace-nowrap px-1 text-sm">
          {proto?.label ?? ''}
        </div>
      );
    }
    // All thumbnails are wide layout diagrams (~231×134); use `object-contain` +
    // `w-auto` so the whole diagram shows without cropping (MG/CEM were previously
    // `object-cover` at w-15 and got cut off).
    return (
      <div className="flex items-center">
        <img
          src={proto.icon}
          alt={proto.label ?? 'Selected Hanging Protocol'}
          className="h-10 w-auto object-contain"
        />
      </div>
    );
  };

  return (
    <Select
      onValueChange={handleChange}
      value={`${selected}`}
    >
      <SelectTrigger className="h-10 w-24 py-0">
        {selected !== undefined && selected !== null
          ? defaultOption(selected)
          : 'Select Hanging Protocol'}
      </SelectTrigger>
      <SelectContent>
        {allHangingProtocols.map(protocol => {
          // Grey out an MR stage when NONE of its views exist in the study
          // (e.g. no MIP at all → disable the "1×2 MIP" stage).
          const viewKeys = (protocol as { viewKeys?: MRViewKey[] }).viewKeys;
          const disabled = isMR && !!viewKeys && !isStageAvailable(viewKeys, availableMRViews);
          return (
            <SelectItem
              key={protocol.stageIndex}
              value={`${protocol.stageIndex}`}
              disabled={disabled}
            >
              {defaultOption(protocol.stageIndex)}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

export default HangingProtocolDropdown;
