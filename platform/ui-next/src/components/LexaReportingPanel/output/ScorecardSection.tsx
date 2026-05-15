/**
 * @author Sanjay Balai
 * @description Report Scorecard — renders Critical Errors / Major Issues /
 * Minor Issues / Style Warnings buckets returned by the Correct flow's
 * scorecard Gemini call (SCORECARD_SCHEMA_BREAST). Each bucket is a card with
 * a colored left bar (red / orange / yellow / blue) and a list of issues.
 *
 * Buckets with empty arrays are skipped entirely. If every bucket is empty
 * the component renders a single "No issues identified" success card so the
 * student gets explicit positive feedback.
 */

import React from 'react';
import type { ScorecardItem, ScorecardResult } from './types';

interface BucketSpec {
  key: keyof ScorecardResult;
  title: string;
  barColor: string;
  titleColor: string;
  icon: React.ReactNode;
}

const ALERT_OCTAGON = (
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
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
    <line
      x1="12"
      y1="8"
      x2="12"
      y2="12"
    />
    <line
      x1="12"
      y1="16"
      x2="12.01"
      y2="16"
    />
  </svg>
);

const ALERT_TRIANGLE = (
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
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line
      x1="12"
      y1="9"
      x2="12"
      y2="13"
    />
    <line
      x1="12"
      y1="17"
      x2="12.01"
      y2="17"
    />
  </svg>
);

const ALERT_CIRCLE = (
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
    <circle
      cx="12"
      cy="12"
      r="10"
    />
    <line
      x1="12"
      y1="8"
      x2="12"
      y2="12"
    />
    <line
      x1="12"
      y1="16"
      x2="12.01"
      y2="16"
    />
  </svg>
);

const PENCIL = (
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
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const CHECK_CIRCLE = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const BUCKETS: BucketSpec[] = [
  {
    key: 'criticalErrors',
    title: 'Critical Errors',
    barColor: '#EF4444',
    titleColor: '#EF4444',
    icon: ALERT_OCTAGON,
  },
  {
    key: 'majorIssues',
    title: 'Major Issues',
    barColor: '#F97316',
    titleColor: '#F97316',
    icon: ALERT_TRIANGLE,
  },
  {
    key: 'minorIssues',
    title: 'Minor Issues',
    barColor: '#EAB308',
    titleColor: '#EAB308',
    icon: ALERT_CIRCLE,
  },
  {
    key: 'styleWarnings',
    title: 'Style Warnings',
    barColor: '#3B82F6',
    titleColor: '#3B82F6',
    icon: PENCIL,
  },
];

const Issue: React.FC<{ item: ScorecardItem }> = ({ item }) => (
  <div className="mt-3 first:mt-2">
    {item.issue && (
      <p className="text-primary-light text-sm font-semibold leading-snug">• {item.issue}</p>
    )}
    {item.explanation && (
      <p className="text-primary-light opacity-85 mt-1 pl-3 text-sm leading-relaxed">
        {item.explanation}
      </p>
    )}
    {item.suggestedCorrection && (
      <p
        className="mt-1 pl-3 text-sm italic leading-relaxed"
        style={{ color: '#F97316' }}
      >
        <span className="font-semibold not-italic">Suggestion:</span> {item.suggestedCorrection}
      </p>
    )}
  </div>
);

const ScorecardSection: React.FC<{ data?: ScorecardResult }> = ({ data }) => {
  if (!data) {
    return null;
  }

  const totalIssues =
    (data.criticalErrors?.length ?? 0) +
    (data.majorIssues?.length ?? 0) +
    (data.minorIssues?.length ?? 0) +
    (data.styleWarnings?.length ?? 0);

  return (
    <section className="mt-6">
      <h3 className="text-primary-light mb-4 text-xl font-semibold">Report Scorecard</h3>

      {totalIssues === 0 ? (
        <div
          className="flex items-center gap-3 rounded-lg border p-4"
          style={{
            backgroundColor: 'rgba(11, 10, 10, 0.6)',
            borderColor: '#22C55E',
            borderLeftWidth: 4,
          }}
        >
          <span style={{ color: '#22C55E' }}>{CHECK_CIRCLE}</span>
          <p className="text-primary-light text-sm font-medium">
            No issues identified — the report meets quality criteria across all categories.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {BUCKETS.map(b => {
            const items = data[b.key] as ScorecardItem[] | undefined;
            if (!items || items.length === 0) {
              return null;
            }
            return (
              <div
                key={b.key}
                className="rounded-lg border border-[#4F4F4F] p-4"
                style={{
                  backgroundColor: 'rgba(11, 10, 10, 0.6)',
                  borderLeftWidth: 4,
                  borderLeftColor: b.barColor,
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: b.titleColor }}>{b.icon}</span>
                  <h4
                    className="text-base font-semibold"
                    style={{ color: b.titleColor }}
                  >
                    {b.title}
                  </h4>
                </div>
                <div className="mt-1">
                  {items.map((item, idx) => (
                    <Issue
                      key={idx}
                      item={item}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ScorecardSection;
