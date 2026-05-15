/**
 * @author Sanjay Balai
 * @description Findings renderer for MG and DBT (also reused inside CEM as
 * the "Low-Energy" block). Mirrors biedx-radiqIQ's MammographyFindings.jsx
 * with a BIEDX-specific twist: lesion arrays (masses, calcifications,
 * asymmetries, architecturalDistortion) are grouped by laterality and
 * enumerated, per the client's report-format requirement.
 */

import React from 'react';
import { FindingSection, ImplantSection, SideBlock } from './atoms';
import { formatDetails, groupBySide } from './helpers';
import type { MammoFindings } from './types';

interface Props {
    findings?: MammoFindings;
}

const MammographyFindings: React.FC<Props> = ({ findings }) => {
    const f = findings || {};
    const massesBy = groupBySide(f.masses);
    const calcBy = groupBySide(f.calcifications);
    const asymBy = groupBySide(f.asymmetries);
    const archBy = groupBySide(f.architecturalDistortion);

    return (
        <>
            {f.breastDensity && <FindingSection title="Breast Density">{f.breastDensity}</FindingSection>}
            <ImplantSection implant={f.implantFindings} />

            <SideBlock
                label="Right Breast"
                sections={[
                    { singular: 'Mass', items: massesBy.right },
                    { singular: 'Microcalcifications', items: calcBy.right },
                    { singular: 'Asymmetry', items: asymBy.right },
                    { singular: 'Architectural Distortion', items: archBy.right },
                ]}
            />
            <SideBlock
                label="Left Breast"
                sections={[
                    { singular: 'Mass', items: massesBy.left },
                    { singular: 'Microcalcifications', items: calcBy.left },
                    { singular: 'Asymmetry', items: asymBy.left },
                    { singular: 'Architectural Distortion', items: archBy.left },
                ]}
            />
            <SideBlock
                label="Bilateral / Unspecified"
                sections={[
                    { singular: 'Mass', items: massesBy.other },
                    { singular: 'Microcalcifications', items: calcBy.other },
                    { singular: 'Asymmetry', items: asymBy.other },
                    { singular: 'Architectural Distortion', items: archBy.other },
                ]}
            />

            {f.axilla && <FindingSection title="Axilla">{f.axilla}</FindingSection>}
        </>
    );
};

/**
 * Plain-text serializer for the Copy Report payload — must match what the
 * MammographyFindings JSX renders so a paste reads identically to the screen.
 * Returns the FINDINGS subsection only (the outer Technique / Comparison /
 * Impression / BIRADS / Recommendations are added by ReportShell).
 */
export const serializeMammoFindings = (findings?: MammoFindings): string => {
    const f = findings || {};
    const lines: string[] = [];
    if (f.breastDensity) lines.push(`Breast Density: ${f.breastDensity}`);

    const massesBy = groupBySide(f.masses);
    const calcBy = groupBySide(f.calcifications);
    const asymBy = groupBySide(f.asymmetries);
    const archBy = groupBySide(f.architecturalDistortion);

    const writeSide = (label: string, side: 'right' | 'left' | 'other') => {
        const groups: Array<[string, any[]]> = [
            ['Mass', massesBy[side]],
            ['Microcalcifications', calcBy[side]],
            ['Asymmetry', asymBy[side]],
            ['Architectural Distortion', archBy[side]],
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

    if (f.axilla) lines.push('', `Axilla: ${f.axilla}`);

    return lines.join('\n');
};

export default MammographyFindings;
