/**
 * @author Sanjay Balai
 * @description Registry mapping LexaTemplateKey → { Component, serialize }.
 * Single source of truth for "which renderer handles which modality?".
 *
 * Adding a new modality is a one-step process:
 *   1. Build a `<NewFindings />` component + `serializeNewFindings`.
 *   2. Add an entry to MODALITY_REGISTRY here.
 *
 * No other file in the output/ folder needs to know about the new modality.
 */

import React from 'react';
import CemFindingsComponent, { serializeCemFindings } from './CemFindings';
import MammographyFindings, { serializeMammoFindings } from './MammographyFindings';
import MriFindings, { serializeMriFindings } from './MriFindings';
import UltrasoundFindings, { serializeUltrasoundFindings } from './UltrasoundFindings';
import type { LexaOutputShape, LexaTemplateKey } from './types';

export interface ModalityRenderer {
    /** Renders the FINDINGS subsection for this modality. */
    Component: React.FC<{ findings?: any }>;
    /** Plain-text serializer for the Copy Report button (FINDINGS only). */
    serialize: (findings?: any) => string;
}

export const MODALITY_REGISTRY: Record<LexaTemplateKey, ModalityRenderer> = {
    mgScreening: { Component: MammographyFindings, serialize: serializeMammoFindings },
    mgDiagnostic: { Component: MammographyFindings, serialize: serializeMammoFindings },
    dbtScreening: { Component: MammographyFindings, serialize: serializeMammoFindings },
    dbtDiagnostic: { Component: MammographyFindings, serialize: serializeMammoFindings },
    cem: { Component: CemFindingsComponent, serialize: serializeCemFindings },
    us: { Component: UltrasoundFindings, serialize: serializeUltrasoundFindings },
    mri: { Component: MriFindings, serialize: serializeMriFindings },
};

/**
 * Resolves the renderer to use. Prefers the authoritative `templateKey`
 * field on the response; falls back to shape-based heuristics so any older
 * (or future) backend response that omits templateKey still renders.
 */
export const pickRenderer = (data: LexaOutputShape): ModalityRenderer | null => {
    const key = data.templateKey as LexaTemplateKey | undefined;
    if (key && MODALITY_REGISTRY[key]) return MODALITY_REGISTRY[key];

    const f = data.output?.report?.findings as any;
    if (!f) return null;

    // CEM first — extends mammo with recombined-enhancement fields.
    if (
        f.backgroundParenchymalEnhancement !== undefined ||
        Array.isArray(f.enhancingMasses) ||
        Array.isArray(f.enhancingNME)
    ) {
        // MRI also has backgroundParenchymalEnhancement, so disambiguate by
        // the presence of CEM-only `enhancingMasses` / `enhancingNME` first.
        if (Array.isArray(f.enhancingMasses) || Array.isArray(f.enhancingNME)) {
            return MODALITY_REGISTRY.cem;
        }
        // Pure BPE without enhancing arrays → MRI.
        if (Array.isArray(f.nonMassEnhancement) || f.fibroglandularTissue !== undefined) {
            return MODALITY_REGISTRY.mri;
        }
    }
    // MRI markers without BPE.
    if (f.fibroglandularTissue !== undefined || Array.isArray(f.nonMassEnhancement)) {
        return MODALITY_REGISTRY.mri;
    }
    // Ultrasound markers.
    if (
        f.tissueComposition !== undefined ||
        f.cysts !== undefined ||
        f.ductalChanges !== undefined ||
        f.vascularity !== undefined
    ) {
        return MODALITY_REGISTRY.us;
    }
    // Fall through to mammography for anything with breastDensity / masses /
    // calcifications / asymmetries / architecturalDistortion.
    if (
        f.breastDensity !== undefined ||
        Array.isArray(f.masses) ||
        Array.isArray(f.calcifications) ||
        Array.isArray(f.asymmetries) ||
        Array.isArray(f.architecturalDistortion)
    ) {
        return MODALITY_REGISTRY.mgScreening;
    }
    return null;
};
