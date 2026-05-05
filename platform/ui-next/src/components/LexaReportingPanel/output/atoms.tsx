/**
 * @author Sanjay Balai
 * @description Small reusable JSX atoms shared by every modality findings
 * component. Kept tiny and presentational — no business logic, no state.
 *
 * - SectionHeading: top-level heading inside the report card (e.g. Findings)
 * - FindingSection: small subsection ("Breast Density:" + content)
 * - EnumeratedSection: numbered list ("Mass: 1. ... 2. ...") under a heading
 * - SideBlock: Right Breast / Left Breast wrapper around N enumerated lists
 * - ImplantSection: shared MG/CEM implant render
 */

import React from 'react';
import { formatDetails } from './helpers';
import type { ImplantFindings } from './types';

export const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h4 className="text-primary-light mt-4 text-lg font-semibold">{children}</h4>
);

export const FindingSection: React.FC<{ title: string; children: React.ReactNode }> = ({
    title,
    children,
}) => {
    if (children === null || children === undefined || children === '') return null;
    return (
        <div className="mt-3">
            <h5 className="text-primary-light text-sm font-semibold opacity-90">{title}:</h5>
            <div className="text-primary-light pl-2 text-sm leading-relaxed opacity-85">{children}</div>
        </div>
    );
};

/**
 * Renders a numbered list under one lesion-type heading.
 * Returns null for empty arrays (caller decides whether to show a fallback).
 */
export const EnumeratedSection: React.FC<{ items: any[] | undefined; singular: string }> = ({
    items,
    singular,
}) => {
    if (!items || items.length === 0) return null;
    return (
        <div className="mt-3">
            <h5 className="text-primary-light text-sm font-semibold opacity-90">{singular}:</h5>
            <ol
                className="text-primary-light pl-6 text-sm leading-relaxed opacity-85"
                style={{ listStyleType: 'decimal' }}
            >
                {items.map((item, i) => (
                    <li key={i} className="mt-1">
                        {formatDetails(item)}
                    </li>
                ))}
            </ol>
        </div>
    );
};

/**
 * Generic Right Breast / Left Breast / Bilateral wrapper. Caller passes an
 * ordered list of [singular, items] pairs — we render an EnumeratedSection
 * per non-empty pair. The whole side is omitted when every pair is empty
 * (no orphan headings).
 */
export const SideBlock: React.FC<{
    label: string;
    sections: Array<{ singular: string; items?: any[] }>;
}> = ({ label, sections }) => {
    const total = sections.reduce((n, s) => n + (s.items?.length || 0), 0);
    if (total === 0) return null;
    return (
        <div className="mt-4">
            <h5 className="text-primary-light text-base font-bold">{label}:</h5>
            <div className="pl-2">
                {sections.map(s => (
                    <EnumeratedSection key={s.singular} items={s.items} singular={s.singular} />
                ))}
            </div>
        </div>
    );
};

/**
 * Implant section shared by MG/DBT/CEM. Hidden entirely when implants
 * are absent — radiqIQ's CemFindings/MammographyFindings both do this.
 */
export const ImplantSection: React.FC<{ implant?: ImplantFindings }> = ({ implant }) => {
    if (!implant || !implant.isPresent) return null;

    const hasRupture = implant.ruptureSigns && implant.ruptureSigns.length > 0;
    const hasDehiscence = implant.dehiscenceSigns && implant.dehiscenceSigns.length > 0;
    const hasOther = implant.otherAbnormalities && implant.otherAbnormalities.length > 0;
    const isNormal = !hasRupture && !hasDehiscence && !hasOther;

    return (
        <FindingSection title="Implant Findings">
            <p>
                <strong>Type:</strong> {implant.type || 'Not specified'}
            </p>
            <p>
                <strong>Location:</strong> {implant.location || 'Not specified'}
            </p>
            {isNormal ? (
                <p className="mt-1">No imaging features suggestive of implant rupture or dehiscence.</p>
            ) : (
                <>
                    {hasRupture && (
                        <p>
                            <strong>Signs of Rupture:</strong> {implant.ruptureSigns!.join(', ')}
                        </p>
                    )}
                    {hasDehiscence && (
                        <p>
                            <strong>Signs of Dehiscence:</strong> {implant.dehiscenceSigns!.join(', ')}
                        </p>
                    )}
                    {hasOther && (
                        <p>
                            <strong>Other Abnormalities:</strong> {implant.otherAbnormalities!.join(', ')}
                        </p>
                    )}
                </>
            )}
            {implant.description && <p className="mt-1 text-xs italic opacity-75">{implant.description}</p>}
        </FindingSection>
    );
};
