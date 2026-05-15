/**
 * @author Sanjay Balai
 * @description Pure utility helpers shared by every modality renderer.
 * Intentionally framework-agnostic (no React) so they can be used from
 * both the on-screen renderers and the plain-text Copy Report serializers.
 */

import type { Side } from './types';

/**
 * "key" → "Key" — turns a camelCase or snake_case schema field into a
 * human-readable label used by formatDetails and section headings.
 */
export const humanizeKey = (key: string): string =>
    key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, c => c.toUpperCase())
        .trim();

/**
 * Flattens one finding object into a comma-separated "Label: value" list,
 * skipping empty/null values and the synthetic `id` field. Mirrors the
 * radiqIQ formatDetails() helper used by every per-modality renderer there.
 */
export const formatDetails = (item: Record<string, any>): string =>
    Object.entries(item)
        .filter(([key, val]) => val !== '' && val !== null && val !== undefined && key !== 'id')
        .map(([key, val]) => {
            const label = humanizeKey(key);
            return `${label}: ${Array.isArray(val) ? val.join(', ') : val}`;
        })
        .join(', ');

/**
 * Detects laterality from a finding by scanning its `location` (and
 * `description` as a fallback). Whole-word match so "left" doesn't
 * false-trigger inside e.g. "leftover". Returns 'other' when both sides
 * are mentioned (bilateral) or neither is.
 */
export const detectLaterality = (item: Record<string, any> | null | undefined): Side => {
    const haystack = `${item?.location ?? ''} ${item?.description ?? ''}`.toLowerCase();
    const hasRight = /\bright\b/.test(haystack);
    const hasLeft = /\bleft\b/.test(haystack);
    if (hasRight && !hasLeft) return 'right';
    if (hasLeft && !hasRight) return 'left';
    return 'other';
};

/** Splits an array of findings into right/left/other buckets via detectLaterality. */
export const groupBySide = <T extends Record<string, any>>(items: T[] | undefined) => {
    const buckets: Record<Side, T[]> = { right: [], left: [], other: [] };
    (items || []).forEach(it => {
        if (it) buckets[detectLaterality(it)].push(it);
    });
    return buckets;
};
