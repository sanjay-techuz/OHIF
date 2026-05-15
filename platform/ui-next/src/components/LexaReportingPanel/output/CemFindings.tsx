/**
 * @author Sanjay Balai
 * @description Findings renderer for Contrast-Enhanced Mammography (CEM).
 * Mirrors biedx-radiqIQ's CemFindings.jsx, which composes the standard
 * MammographyFindings block (Low-Energy mammographic findings) with an
 * additional Recombined (Enhancement) block — BPE + enhancingMasses +
 * enhancingNME, both grouped by laterality and enumerated.
 */

import React from 'react';
import MammographyFindings, { serializeMammoFindings } from './MammographyFindings';
import { FindingSection, SideBlock } from './atoms';
import { formatDetails, groupBySide } from './helpers';
import type { CemFindings } from './types';

interface Props {
    findings?: CemFindings;
}

const CemFindingsComponent: React.FC<Props> = ({ findings }) => {
    const f = findings || {};
    const eMassBy = groupBySide(f.enhancingMasses);
    const eNmeBy = groupBySide(f.enhancingNME);

    return (
        <>
            <h5 className="text-primary-light mt-3 text-base font-bold">
                Low-Energy (Mammographic) Findings:
            </h5>
            <MammographyFindings findings={f} />

            <h5 className="text-primary-light mt-5 text-base font-bold">
                Recombined (Enhancement) Findings:
            </h5>
            {f.backgroundParenchymalEnhancement && (
                <FindingSection title="Background Parenchymal Enhancement">
                    {f.backgroundParenchymalEnhancement}
                </FindingSection>
            )}
            <SideBlock
                label="Right Breast"
                sections={[
                    { singular: 'Enhancing Mass', items: eMassBy.right },
                    { singular: 'Enhancing Non-Mass Enhancement', items: eNmeBy.right },
                ]}
            />
            <SideBlock
                label="Left Breast"
                sections={[
                    { singular: 'Enhancing Mass', items: eMassBy.left },
                    { singular: 'Enhancing Non-Mass Enhancement', items: eNmeBy.left },
                ]}
            />
            <SideBlock
                label="Bilateral / Unspecified"
                sections={[
                    { singular: 'Enhancing Mass', items: eMassBy.other },
                    { singular: 'Enhancing Non-Mass Enhancement', items: eNmeBy.other },
                ]}
            />
        </>
    );
};

export const serializeCemFindings = (findings?: CemFindings): string => {
    const f = findings || {};
    const lines: string[] = [];

    lines.push('', 'Low-Energy (Mammographic) Findings:');
    const mammo = serializeMammoFindings(f);
    if (mammo.trim()) lines.push(mammo);

    lines.push('', 'Recombined (Enhancement) Findings:');
    if (f.backgroundParenchymalEnhancement) {
        lines.push(`Background Parenchymal Enhancement: ${f.backgroundParenchymalEnhancement}`);
    }
    const eMassBy = groupBySide(f.enhancingMasses);
    const eNmeBy = groupBySide(f.enhancingNME);
    const writeSide = (label: string, side: 'right' | 'left' | 'other') => {
        const groups: Array<[string, any[]]> = [
            ['Enhancing Mass', eMassBy[side]],
            ['Enhancing Non-Mass Enhancement', eNmeBy[side]],
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

    return lines.join('\n').replace(/\n{3,}/g, '\n\n');
};

export default CemFindingsComponent;
