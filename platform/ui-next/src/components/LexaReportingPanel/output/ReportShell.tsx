/**
 * @author Sanjay Balai
 * @description Outer shell of the Final Report — sections that are common
 * to every modality (Technique → Comparison → Findings → Impression →
 * BIRADS → Recommendations) plus the Save / Download / Copy buttons.
 *
 * Findings are passed in as `children` — the appropriate per-modality
 * component is selected by LexaReportOutput via the registry. This file
 * never needs to change when a new modality is added.
 *
 * Each action button shows inline success/failure feedback for ~2s
 * (green / red background + status label) so the student can see whether
 * their click actually worked, without a separate toast system.
 *
 * Save and Download are owned by the parent (LexaReportingPanel) — that's
 * where the scope props + the auto-save-before-download orchestration live.
 * ReportShell just calls the handler and reflects in-flight / success /
 * failure via timestamp-based feedback windows, mirroring the Save flow.
 */

import React, { useState } from 'react';
import { SectionHeading } from './atoms';
import type { LexaOutputShape } from './types';

interface Props {
  data: LexaOutputShape;
  /** Plain-text serializer for the FINDINGS subsection (per-modality). */
  serializeFindings: (findings: any) => string;
  /** The rendered findings JSX — produced by the per-modality component. */
  children: React.ReactNode;
  /** Optional save handler — when provided, the Save button renders. */
  onSave?: () => void;
  /** True while the save POST is in flight. */
  isSaving?: boolean;
  /** Timestamp (ms) of the most recent successful save — drives "Saved!" feedback. */
  savedAtMs?: number | null;
  /** Timestamp (ms) of the most recent failed save — drives "Failed" feedback. */
  saveFailedAtMs?: number | null;
  /** Optional download handler — when provided, the Download button renders. */
  onDownload?: () => void;
  /** True while the download API is in flight (auto-save + GET PDF). */
  isDownloading?: boolean;
  /** Timestamp (ms) of the most recent successful download. */
  downloadedAtMs?: number | null;
  /** Timestamp (ms) of the most recent failed download. */
  downloadFailedAtMs?: number | null;
}

// --- Visual tokens for the three button states (default / success / fail). ---
const COLOR_DEFAULT = 'rgba(23, 42, 182, 0.80)';
const COLOR_DEFAULT_HOVER = '#172ab6';
const COLOR_SUCCESS = 'rgba(34, 139, 76, 0.90)';
const COLOR_FAIL = 'rgba(220, 38, 38, 0.90)';

// Status feedback windows are 2s — long enough to read, short enough that
// the next click sees a clean default state.
const FEEDBACK_MS = 2000;

const buildFullReportText = (
  data: LexaOutputShape,
  serializeFindings: (findings: any) => string
): string => {
  const r = data.output?.report;
  if (!r) {
    return JSON.stringify(data, null, 2);
  }
  const lines: string[] = [];
  if (r.technique) {
    lines.push('TECHNIQUE', r.technique, '');
  }
  if (r.comparison) {
    lines.push('COMPARISON', r.comparison, '');
  }
  lines.push('FINDINGS');
  const findingsText = serializeFindings(r.findings);
  if (findingsText.trim()) {
    lines.push(findingsText);
  }
  lines.push('');
  if (r.impression) {
    lines.push('IMPRESSION', r.impression, '');
  }
  if (r.finalBiRads) {
    lines.push(`BIRADS: ${r.finalBiRads}`, '');
  }
  if (r.recommendations) {
    lines.push('RECOMMENDATIONS', r.recommendations);
  }
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const ReportShell: React.FC<Props> = ({
  data,
  serializeFindings,
  children,
  onSave,
  isSaving = false,
  savedAtMs = null,
  saveFailedAtMs = null,
  onDownload,
  isDownloading = false,
  downloadedAtMs = null,
  downloadFailedAtMs = null,
}) => {
  // --- Copy state (the only locally-managed action) ---
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'fail'>('idle');

  // Save / Download feedback is driven by parent timestamps so the panel
  // can reflect both the in-flight request and its outcome on the same
  // button. Timestamp comparison gives an automatic 2s feedback window
  // without extra timer state.
  const justSaved = Boolean(savedAtMs && Date.now() - savedAtMs < FEEDBACK_MS);
  const justSaveFailed = Boolean(saveFailedAtMs && Date.now() - saveFailedAtMs < FEEDBACK_MS);
  const justDownloaded = Boolean(downloadedAtMs && Date.now() - downloadedAtMs < FEEDBACK_MS);
  const justDownloadFailed = Boolean(
    downloadFailedAtMs && Date.now() - downloadFailedAtMs < FEEDBACK_MS
  );

  // ---------------- Copy ----------------
  const handleCopy = async () => {
    try {
      const text = buildFullReportText(data, serializeFindings);
      await navigator.clipboard.writeText(text);
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), FEEDBACK_MS);
    } catch {
      // Clipboard may be blocked in iframes/insecure contexts; surface
      // the failure so the user knows to try a different copy path.
      setCopyStatus('fail');
      setTimeout(() => setCopyStatus('idle'), FEEDBACK_MS);
    }
  };

  // ---------------- Shared button styling helpers ----------------
  const colorFor = (kind: 'default' | 'success' | 'fail'): string =>
    kind === 'success' ? COLOR_SUCCESS : kind === 'fail' ? COLOR_FAIL : COLOR_DEFAULT;

  // Small reusable button shell so all three actions share styling/hover
  // logic without duplicating six near-identical blocks.
  const ActionButton: React.FC<{
    onClick: () => void;
    disabled?: boolean;
    kind: 'default' | 'success' | 'fail';
    title?: string;
    icon: React.ReactNode;
    label: string;
  }> = ({ onClick, disabled, kind, title, icon, label }) => {
    const baseColor = colorFor(kind);
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: baseColor }}
        onMouseEnter={e => {
          if (!disabled && kind === 'default') {
            e.currentTarget.style.backgroundColor = COLOR_DEFAULT_HOVER;
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = baseColor;
        }}
        title={title}
      >
        {icon}
        {label}
      </button>
    );
  };

  // Shared icons (so success/fail variants can swap without code spread).
  const checkIcon = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M5 12l5 5L20 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  const xIcon = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  // Per-button label/kind/icon resolution, keeping the JSX compact.
  const saveKind: 'default' | 'success' | 'fail' = justSaveFailed
    ? 'fail'
    : justSaved
      ? 'success'
      : 'default';
  const saveLabel = isSaving
    ? 'Saving…'
    : justSaveFailed
      ? 'Failed'
      : justSaved
        ? 'Saved!'
        : 'Save';
  const saveIcon = justSaveFailed ? (
    xIcon
  ) : justSaved ? (
    checkIcon
  ) : (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const downloadKind: 'default' | 'success' | 'fail' = justDownloadFailed
    ? 'fail'
    : justDownloaded
      ? 'success'
      : 'default';
  const downloadLabel = isDownloading
    ? 'Preparing…'
    : justDownloadFailed
      ? 'Failed'
      : justDownloaded
        ? 'Done!'
        : 'Download';
  const downloadIcon = justDownloadFailed ? (
    xIcon
  ) : justDownloaded ? (
    checkIcon
  ) : (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const copyKind: 'default' | 'success' | 'fail' = copyStatus;
  const copyLabel =
    copyStatus === 'success' ? 'Copied!' : copyStatus === 'fail' ? 'Failed' : 'Copy';
  const copyIcon =
    copyStatus === 'success' ? (
      checkIcon
    ) : copyStatus === 'fail' ? (
      xIcon
    ) : (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2M16 4H8a2 2 0 0 0-2 2v12M16 4V2H8v2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

  const r = data.output?.report;
  if (!r) {
    return null;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-primary-light text-xl font-semibold">Final Report</h3>
        <div className="flex items-center gap-2">
          {onSave && (
            <ActionButton
              onClick={onSave}
              disabled={isSaving}
              kind={saveKind}
              title="Save report so it auto-loads on revisit"
              icon={saveIcon}
              label={saveLabel}
            />
          )}
          {onDownload && (
            <ActionButton
              onClick={onDownload}
              disabled={isDownloading}
              kind={downloadKind}
              title="Download Final Report as PDF"
              icon={downloadIcon}
              label={downloadLabel}
            />
          )}
          <ActionButton
            onClick={handleCopy}
            kind={copyKind}
            title="Copy report text to clipboard"
            icon={copyIcon}
            label={copyLabel}
          />
        </div>
      </div>

      <div
        className="rounded-lg border border-[#4F4F4F] p-4"
        style={{ backgroundColor: 'rgba(11, 10, 10, 0.6)' }}
      >
        {r.technique && (
          <>
            <SectionHeading>Technique</SectionHeading>
            <p className="text-primary-light opacity-85 text-sm leading-relaxed">{r.technique}</p>
          </>
        )}

        {r.comparison && (
          <>
            <SectionHeading>Comparison</SectionHeading>
            <p className="text-primary-light opacity-85 text-sm leading-relaxed">{r.comparison}</p>
          </>
        )}

        <SectionHeading>Findings</SectionHeading>
        {children}

        {r.impression && (
          <>
            <SectionHeading>Impression</SectionHeading>
            <p className="text-primary-light opacity-85 text-sm leading-relaxed">{r.impression}</p>
          </>
        )}

        {r.finalBiRads && (
          <>
            <SectionHeading>BIRADS</SectionHeading>
            <p className="text-primary-light pl-2 text-sm font-bold opacity-90">{r.finalBiRads}</p>
          </>
        )}

        {r.recommendations && (
          <>
            <SectionHeading>Recommendations</SectionHeading>
            <p className="text-primary-light opacity-85 text-sm leading-relaxed">
              {r.recommendations}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportShell;
