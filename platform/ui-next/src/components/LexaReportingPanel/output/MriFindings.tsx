/**
 * @author Sanjay Balai
 * @description Findings renderer for Breast MRI. Currently a structured
 * stub — renders the schema fields directly so MRI reports are readable.
 * Will be extended with MRI-specific sections (kinetic curves, T2 signal,
 * ADC) and side grouping in a follow-up pass.
 */

import React from 'react';
import { EnumeratedSection, FindingSection } from './atoms';
import { formatDetails, groupBySide } from './helpers';
import type { MriFindings } from './types';

interface Props {
    findings?: MriFindings;
}

const MriFindingsComponent: React.FC<Props> = ({ findings }) => {
    const f = findings || {};
    const massesBy = groupBySide(f.masses);
    const nmeBy = groupBySide(f.nonMassEnhancement);

    return (
        <>
            {f.fibroglandularTissue && (
                <FindingSection title="Fibroglandular Tissue">{f.fibroglandularTissue}</FindingSection>
            )}
            {f.backgroundParenchymalEnhancement && (
                <FindingSection title="Background Parenchymal Enhancement">
                    {f.backgroundParenchymalEnhancement}
                </FindingSection>
            )}
            <EnumeratedSection items={massesBy.right} singular="Right Breast — Mass" />
            <EnumeratedSection items={massesBy.left} singular="Left Breast — Mass" />
            <EnumeratedSection items={massesBy.other} singular="Mass (Bilateral / Unspecified)" />
            <EnumeratedSection items={nmeBy.right} singular="Right Breast — Non-Mass Enhancement" />
            <EnumeratedSection items={nmeBy.left} singular="Left Breast — Non-Mass Enhancement" />
            <EnumeratedSection items={nmeBy.other} singular="Non-Mass Enhancement (Bilateral / Unspecified)" />
            {f.axilla && <FindingSection title="Axilla">{f.axilla}</FindingSection>}
        </>
    );
};

export const serializeMriFindings = (findings?: MriFindings): string => {
    const f = findings || {};
    const lines: string[] = [];
    if (f.fibroglandularTissue) lines.push(`Fibroglandular Tissue: ${f.fibroglandularTissue}`);
    if (f.backgroundParenchymalEnhancement) {
        lines.push(`Background Parenchymal Enhancement: ${f.backgroundParenchymalEnhancement}`);
    }

    const massesBy = groupBySide(f.masses);
    const nmeBy = groupBySide(f.nonMassEnhancement);
    const writeSide = (label: string, side: 'right' | 'left' | 'other') => {
        const groups: Array<[string, any[]]> = [
            ['Mass', massesBy[side]],
            ['Non-Mass Enhancement', nmeBy[side]],
        ];
        const total = groups.reduce((n, [, items]) => n + items.length, 0);
        if (total === 0) return;
        lines.push('', `${label}:`);
        groups.forEach(([title, items]) => {
            if (items.length === 0) return;
            lines.push(`  ${title}:`);
            items.forEach((it, i) => lines.push(`    ${i + 1}. ${formatDetails(it)}`));
        });
    };
    writeSide('Right Breast', 'right');
    writeSide('Left Breast', 'left');
    writeSide('Bilateral / Unspecified', 'other');

    if (f.axilla) lines.push(`Axilla: ${f.axilla}`);
    return lines.join('\n');
};

export default MriFindingsComponent;
