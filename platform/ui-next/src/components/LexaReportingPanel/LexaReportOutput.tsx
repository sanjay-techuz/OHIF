/**
 * @author Sanjay Balai
 * @description Thin router for Lexa report output. Picks the per-modality
 * findings component from the registry and wraps it with the shared
 * ReportShell (Technique / Comparison / Impression / BIRADS / Recommendations
 * + Copy button). All modality-specific logic lives in output/<Modality>Findings.tsx.
 *
 * Adding a new modality = create a new findings component + register it in
 * output/registry.ts. This file does not need to change.
 */

import React from 'react';
import ReportShell from './output/ReportShell';
import ScorecardSection from './output/ScorecardSection';
import QualityMetricsSection from './output/QualityMetricsSection';
import QualitativeFeedbackSection from './output/QualitativeFeedbackSection';
import { pickRenderer } from './output/registry';
import type { LexaOutputShape } from './output/types';

// Re-export the public type so external imports keep working unchanged.
export type { LexaOutputShape } from './output/types';

interface Props {
  data: LexaOutputShape;
  /** Optional save handler — when provided, ReportShell renders a Save button. */
  onSave?: () => void;
  /** True while the save POST is in flight. */
  isSaving?: boolean;
  /** Timestamp (ms) of the most recent successful save — drives "Saved!" feedback. */
  savedAtMs?: number | null;
  /** Timestamp (ms) of the most recent FAILED save — drives "Failed" feedback. */
  saveFailedAtMs?: number | null;
  /** Optional download handler — when provided, ReportShell renders a Download button. */
  onDownload?: () => void;
  /** True while the download API is in flight. */
  isDownloading?: boolean;
  /** Timestamp (ms) of the most recent successful download. */
  downloadedAtMs?: number | null;
  /** Timestamp (ms) of the most recent FAILED download. */
  downloadFailedAtMs?: number | null;
}

const LexaReportOutput: React.FC<Props> = ({
  data,
  onSave,
  isSaving,
  savedAtMs,
  saveFailedAtMs,
  onDownload,
  isDownloading,
  downloadedAtMs,
  downloadFailedAtMs,
}) => {
  const renderer = pickRenderer(data);
  const r = data.output?.report;

  // Correct-mode extras: only present in the response when mode='correct'
  // succeeded on the backend. Each section short-circuits to null when its
  // slice of the payload is missing, so Generate mode renders unchanged.
  const correctExtras = (
    <>
      <ScorecardSection data={data.scorecard} />
      <QualityMetricsSection data={data.qualityScore} />
      <QualitativeFeedbackSection data={data.qualityScore} />
    </>
  );

  if (renderer && r) {
    const { Component, serialize } = renderer;
    return (
      <>
        <ReportShell
          data={data}
          serializeFindings={serialize}
          onSave={onSave}
          isSaving={isSaving}
          savedAtMs={savedAtMs}
          saveFailedAtMs={saveFailedAtMs}
          onDownload={onDownload}
          isDownloading={isDownloading}
          downloadedAtMs={downloadedAtMs}
          downloadFailedAtMs={downloadFailedAtMs}
        >
          <Component findings={r.findings} />
        </ReportShell>
        {correctExtras}
      </>
    );
  }

  // Last-resort fallback — should only hit if Gemini returned no `report`.
  return (
    <pre className="text-primary-light whitespace-pre-wrap break-words text-xs leading-snug opacity-90">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};

export default LexaReportOutput;
