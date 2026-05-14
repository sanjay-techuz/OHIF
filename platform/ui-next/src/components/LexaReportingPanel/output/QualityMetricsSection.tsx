/**
 * @author Sanjay Balai
 * @description Quantitative Quality Metrics — renders the Composite Report
 * Score (CRS), Foundational Quality Score (FQS), and 3-domain breakdown
 * (Structural Integrity & Clarity / Clinical Completeness / Communicative
 * Efficacy) returned by the Correct flow's FQS Gemini call.
 *
 * Section is collapsible (chevron up/down) to mirror the Lexa standalone
 * tool's layout from the screenshots provided by the user.
 */

import React, { useState } from 'react';
import type { DomainScore, QualityScore } from './types';

const CHECK_BOX = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const CHEVRON = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const QUESTION = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
    />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line
      x1="12"
      y1="17"
      x2="12.01"
      y2="17"
    />
  </svg>
);

const crsColor = (n?: number): string => {
  if (n === undefined || n === null || isNaN(n)) {
    return '#9CA3AF';
  }
  if (n >= 80) {
    return '#22C55E';
  }
  if (n >= 60) {
    return '#10B981';
  }
  if (n >= 40) {
    return '#EAB308';
  }
  return '#EF4444';
};

const fmtPct = (w?: number): string => {
  if (w === undefined || w === null || isNaN(w)) {
    return '—';
  }
  // Backend may send 0.45 (decimal) or 45 (percent). Normalize to a percent.
  const pct = w > 1 ? w : w * 100;
  return `${Math.round(pct)}%`;
};

interface DomainCardProps {
  title: string;
  titleColor: string;
  domain?: DomainScore;
}

const DomainCard: React.FC<DomainCardProps> = ({ title, titleColor, domain }) => (
  <div
    className="rounded-lg border border-[#4F4F4F] p-4"
    style={{ backgroundColor: 'rgba(11, 10, 10, 0.6)' }}
  >
    <h5
      className="text-sm font-semibold"
      style={{ color: titleColor }}
    >
      {title}
    </h5>
    <p className="text-primary-light mt-2 text-2xl font-semibold">
      {domain?.score ?? '—'}
      <span className="text-primary-light text-sm font-normal opacity-60"> / 100</span>
    </p>
    <p className="text-primary-light mt-1 text-xs opacity-70">
      Weight: <span className="font-medium">{fmtPct(domain?.weight)}</span>
    </p>
    {domain?.comment && (
      <p className="text-primary-light opacity-85 mt-3 text-xs leading-relaxed">{domain.comment}</p>
    )}
  </div>
);

const QualityMetricsSection: React.FC<{ data?: QualityScore }> = ({ data }) => {
  const [open, setOpen] = useState(true);

  if (!data) {
    return null;
  }
  const fqs = data.foundationalQualityScore;

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-[#4F4F4F] px-4 py-3 transition-colors"
        style={{ backgroundColor: 'rgba(11, 10, 10, 0.6)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-primary-light">{CHECK_BOX}</span>
          <span className="text-primary-light text-base font-semibold">
            Quantitative Quality Score
          </span>
        </div>
        <span
          className="text-primary-light transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          {CHEVRON}
        </span>
      </button>

      {open && (
        <div
          className="mt-3 rounded-lg border border-[#4F4F4F] p-5"
          style={{ backgroundColor: 'rgba(11, 10, 10, 0.6)' }}
        >
          <div className="mb-5 flex items-start justify-between">
            <h4 className="text-primary-light text-lg font-semibold">
              Quantitative Quality Metrics
            </h4>
            <span
              className="text-primary-light cursor-help opacity-60"
              title="CRS = weighted FQS minus penalties for critical/major issues. FQS = average of three domain scores."
            >
              {QUESTION}
            </span>
          </div>

          {/* Composite Report Score */}
          <div className="mb-6 text-center">
            <p className="text-primary-light text-sm font-semibold">Composite Report Score (CRS)</p>
            <p
              className="mt-1 text-5xl font-bold"
              style={{ color: crsColor(data.compositeReportScore) }}
            >
              {data.compositeReportScore !== undefined ? data.compositeReportScore.toFixed(1) : '—'}
            </p>
          </div>

          {/* Foundational Quality Score */}
          <div className="mb-5 grid grid-cols-2 items-center gap-4">
            <p className="text-primary-light text-sm font-semibold">
              Foundational Quality Score (FQS)
            </p>
            <p className="text-primary-light text-right text-3xl font-semibold">
              {fqs?.totalFQS !== undefined ? fqs.totalFQS.toFixed(1) : '—'}
            </p>
          </div>

          {/* Domain Breakdown */}
          <div>
            <h5 className="text-primary-light mb-3 text-sm font-semibold">Domain Breakdown</h5>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <DomainCard
                title="A: Structural Integrity & Clarity"
                titleColor="#22C55E"
                domain={fqs?.domainA}
              />
              <DomainCard
                title="B: Clinical Completeness"
                titleColor="#3B82F6"
                domain={fqs?.domainB}
              />
              <DomainCard
                title="C: Communicative Efficacy"
                titleColor="#F97316"
                domain={fqs?.domainC}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default QualityMetricsSection;
