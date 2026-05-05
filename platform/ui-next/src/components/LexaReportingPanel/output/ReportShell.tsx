/**
 * @author Sanjay Balai
 * @description Outer shell of the Final Report — sections that are common
 * to every modality (Technique → Comparison → Findings → Impression →
 * BIRADS → Recommendations) plus the Copy Report button.
 *
 * Findings are passed in as `children` — the appropriate per-modality
 * component is selected by LexaReportOutput via the registry. This file
 * never needs to change when a new modality is added.
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
}

const buildFullReportText = (
    data: LexaOutputShape,
    serializeFindings: (findings: any) => string
): string => {
    const r = data.output?.report;
    if (!r) return JSON.stringify(data, null, 2);
    const lines: string[] = [];
    if (r.technique) lines.push('TECHNIQUE', r.technique, '');
    if (r.comparison) lines.push('COMPARISON', r.comparison, '');
    lines.push('FINDINGS');
    const findingsText = serializeFindings(r.findings);
    if (findingsText.trim()) lines.push(findingsText);
    lines.push('');
    if (r.impression) lines.push('IMPRESSION', r.impression, '');
    if (r.finalBiRads) lines.push(`BIRADS: ${r.finalBiRads}`, '');
    if (r.recommendations) lines.push('RECOMMENDATIONS', r.recommendations);
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

const ReportShell: React.FC<Props> = ({ data, serializeFindings, children }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            const text = buildFullReportText(data, serializeFindings);
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard may be blocked in iframes/insecure contexts — fail silently.
        }
    };

    const r = data.output?.report;
    if (!r) return null;

    // Note: no outer card wrapper here on purpose — the parent column owns
    // the visual partition (left-border + padding) so the Final Report
    // heading aligns with the form's first label on the left.
    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-primary-light text-xl font-semibold">Final Report</h3>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
                    style={{ backgroundColor: 'rgba(23, 42, 182, 0.80)' }}
                    onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#172ab6';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(23, 42, 182, 0.80)';
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2M16 4H8a2 2 0 0 0-2 2v12M16 4V2H8v2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    {copied ? 'Copied!' : 'Copy Report'}
                </button>
            </div>

            <div
                className="rounded-lg border border-[#4F4F4F] p-4"
                style={{ backgroundColor: 'rgba(11, 10, 10, 0.6)' }}
            >
                {r.technique && (
                    <>
                        <SectionHeading>Technique</SectionHeading>
                        <p className="text-primary-light text-sm leading-relaxed opacity-85">{r.technique}</p>
                    </>
                )}

                {r.comparison && (
                    <>
                        <SectionHeading>Comparison</SectionHeading>
                        <p className="text-primary-light text-sm leading-relaxed opacity-85">{r.comparison}</p>
                    </>
                )}

                <SectionHeading>Findings</SectionHeading>
                {children}

                {r.impression && (
                    <>
                        <SectionHeading>Impression</SectionHeading>
                        <p className="text-primary-light text-sm leading-relaxed opacity-85">{r.impression}</p>
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
                        <p className="text-primary-light text-sm leading-relaxed opacity-85">{r.recommendations}</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ReportShell;
