/**
 * @author Sanjay Balai
 * @description Qualitative Feedback — renders Strengths and Areas for
 * Improvement extracted from the FQS Gemini call's `summary` block. Two
 * side-by-side cards (green / red) with bulleted lists. Section is
 * collapsible (chevron up/down) to mirror the Lexa standalone tool's layout.
 *
 * Backend often returns the strengths/areas as a single string; we split on
 * common bullet separators so the UI displays a list rather than a wall of
 * text.
 */

import React, { useState } from 'react';
import type { QualityScore } from './types';

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

/**
 * Splits a string into bullet-friendly chunks. Handles common separators
 * (newline, " - ", numbered lists). Falls back to a single-element array if
 * the input is one cohesive sentence.
 */
const toBullets = (s?: string): string[] => {
  if (!s) {
    return [];
  }
  const trimmed = s.trim();
  if (!trimmed) {
    return [];
  }
  const lines = trimmed
    .split(/\n+|(?:^|\s)[•\-•](?=\s)|(?:^|\s)\d+\.(?=\s)/)
    .map(line => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [trimmed];
};

interface FeedbackColumnProps {
  title: string;
  titleColor: string;
  items: string[];
  fallback: string;
}

const FeedbackColumn: React.FC<FeedbackColumnProps> = ({ title, titleColor, items, fallback }) => (
  <div
    className="rounded-lg border border-[#4F4F4F] p-4"
    style={{ backgroundColor: 'rgba(11, 10, 10, 0.6)' }}
  >
    <h5
      className="text-base font-semibold"
      style={{ color: titleColor }}
    >
      {title}
    </h5>
    {items.length > 0 ? (
      <ul className="mt-3 space-y-2 pl-1">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="text-primary-light text-sm leading-relaxed opacity-90"
            style={{ display: 'flex', gap: '0.5rem' }}
          >
            <span
              aria-hidden
              style={{ color: titleColor, lineHeight: '1.5rem' }}
            >
              •
            </span>
            <span className="flex-1">{item}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-primary-light mt-3 text-sm italic opacity-60">{fallback}</p>
    )}
  </div>
);

const QualitativeFeedbackSection: React.FC<{ data?: QualityScore }> = ({ data }) => {
  const [open, setOpen] = useState(true);

  if (!data?.summary) {
    return null;
  }

  const strengths = toBullets(data.summary.strengths);
  const improvements = toBullets(data.summary.areasForImprovement);

  if (strengths.length === 0 && improvements.length === 0) {
    return null;
  }

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
          <span className="text-primary-light text-base font-semibold">Qualitative Feedback</span>
        </div>
        <span
          className="text-primary-light transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          {CHEVRON}
        </span>
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <FeedbackColumn
            title="Strengths"
            titleColor="#22C55E"
            items={strengths}
            fallback="No specific strengths captured for this report."
          />
          <FeedbackColumn
            title="Areas for Improvement"
            titleColor="#EF4444"
            items={improvements}
            fallback="No improvement areas flagged."
          />
        </div>
      )}
    </section>
  );
};

export default QualitativeFeedbackSection;
