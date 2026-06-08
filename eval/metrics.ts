/**
 * Pure retrieval-quality metrics. No IO, no side effects.
 */

/**
 * Fraction of `relevantIds` that appear within the top-`k` of `retrievedIds`.
 * If there is nothing to find (`relevantIds` empty), recall is 1 by convention.
 * Result is in the range 0..1.
 */
export function recallAtK(
  retrievedIds: string[],
  relevantIds: string[],
  k: number,
): number {
  if (relevantIds.length === 0) return 1;
  const topK = new Set(retrievedIds.slice(0, k));
  let found = 0;
  for (const id of relevantIds) {
    if (topK.has(id)) found++;
  }
  return found / relevantIds.length;
}

/**
 * Reciprocal rank (1-indexed) of the FIRST retrieved id that is relevant.
 * Returns 0 when no retrieved id is relevant.
 */
export function mrr(retrievedIds: string[], relevantIds: string[]): number {
  const relevant = new Set(relevantIds);
  for (let i = 0; i < retrievedIds.length; i++) {
    if (relevant.has(retrievedIds[i]!)) return 1 / (i + 1);
  }
  return 0;
}

/** Arithmetic mean; 0 for an empty list. */
export function meanMetric(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
