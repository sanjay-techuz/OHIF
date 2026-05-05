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
import { pickRenderer } from './output/registry';
import type { LexaOutputShape } from './output/types';

// Re-export the public type so external imports keep working unchanged.
export type { LexaOutputShape } from './output/types';

interface Props {
  data: LexaOutputShape;
}

const LexaReportOutput: React.FC<Props> = ({ data }) => {
  const renderer = pickRenderer(data);
  const r = data.output?.report;

  if (renderer && r) {
    const { Component, serialize } = renderer;
    return (
      <ReportShell data={data} serializeFindings={serialize}>
        <Component findings={r.findings} />
      </ReportShell>
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
