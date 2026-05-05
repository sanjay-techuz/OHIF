/**
 * @author Sanjay Balai
 * @description Findings renderer for Breast Ultrasound (US). Currently a
 * structured stub — renders the schema fields directly via FindingSection
 * + EnumeratedSection so US reports are still readable. Will be extended
 * with US-specific sections (cysts, ductal changes, vascularity) and side
 * grouping when we work through the US modality in a follow-up pass.
 */

import React from 'react';
import { EnumeratedSection, FindingSection } from './atoms';
import { formatDetails, groupBySide } from './helpers';
import type { UltrasoundFindings } from './types';

interface Props {
    findings?: UltrasoundFindings;
}

const UltrasoundFindingsComponent: React.FC<Props> = ({ findings }) => {
    const f = findings || {};
    const massesBy = groupBySide(f.masses);

    return (
        <>
            {f.tissueComposition && (
                <FindingSection title="Tissue Composition">{f.tissueComposition}</FindingSection>
            )}
            <EnumeratedSection items={massesBy.right} singular="Right Breast — Mass" />
            <EnumeratedSection items={massesBy.left} singular="Left Breast — Mass" />
            <EnumeratedSection items={massesBy.other} singular="Mass (Bilateral / Unspecified)" />
            {f.cysts && <FindingSection title="Cysts">{f.cysts}</FindingSection>}
            {f.ductalChanges && <FindingSection title="Ductal Changes">{f.ductalChanges}</FindingSection>}
            {f.skinChanges && <FindingSection title="Skin Changes">{f.skinChanges}</FindingSection>}
            {f.vascularity && <FindingSection title="Vascularity">{f.vascularity}</FindingSection>}
            {f.axilla && <FindingSection title="Axilla">{f.axilla}</FindingSection>}
        </>
    );
};

export const serializeUltrasoundFindings = (findings?: UltrasoundFindings): string => {
    const f = findings || {};
    const lines: string[] = [];
    if (f.tissueComposition) lines.push(`Tissue Composition: ${f.tissueComposition}`);

    const massesBy = groupBySide(f.masses);
    const writeSide = (label: string, side: 'right' | 'left' | 'other') => {
        if (!massesBy[side].length) return;
        lines.push('', `${label}:`);
        lines.push('  Mass:');
        massesBy[side].forEach((it, i) => lines.push(`    ${i + 1}. ${formatDetails(it)}`));
    };
    writeSide('Right Breast', 'right');
    writeSide('Left Breast', 'left');
    writeSide('Bilateral / Unspecified', 'other');

    if (f.cysts) lines.push('', `Cysts: ${f.cysts}`);
    if (f.ductalChanges) lines.push(`Ductal Changes: ${f.ductalChanges}`);
    if (f.skinChanges) lines.push(`Skin Changes: ${f.skinChanges}`);
    if (f.vascularity) lines.push(`Vascularity: ${f.vascularity}`);
    if (f.axilla) lines.push(`Axilla: ${f.axilla}`);

    return lines.join('\n');
};

export default UltrasoundFindingsComponent;
