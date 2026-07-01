import type {
  Blueprint,
  CategoryScore,
  ItemAssessment,
  ItemStatus,
  ReadinessScore,
  StatusCounts,
} from "./types";

/**
 * Deterministic scoring for a readiness run.
 *
 * This is plain math, not an LLM: the same assessments always produce the same
 * number, which is what makes the readiness score defensible in an audit. Each
 * item earns a fraction of its weight by status; the overall and per-category
 * scores are weight-normalised percentages.
 *
 * NEEDS_REVIEW earns nothing but stays in the denominator on purpose: an item
 * whose evidence was too weak to verify is not "ready", and treating it as a
 * free pass would inflate the score. Unverified is not the same as complete.
 */
export const STATUS_FRACTION: Record<ItemStatus, number> = {
  PRESENT: 1,
  PARTIAL: 0.5,
  MISSING: 0,
  NEEDS_REVIEW: 0,
};

function emptyCounts(): StatusCounts {
  return { present: 0, partial: 0, missing: 0, needsReview: 0, total: 0 };
}

function tally(counts: StatusCounts, status: ItemStatus): void {
  counts.total += 1;
  if (status === "PRESENT") counts.present += 1;
  else if (status === "PARTIAL") counts.partial += 1;
  else if (status === "MISSING") counts.missing += 1;
  else counts.needsReview += 1;
}

function pct(earned: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((earned / max) * 100);
}

/**
 * Combine a blueprint with the assessor's verdicts into a full score.
 *
 * The blueprint is the source of truth for which items exist and their weights,
 * so a missing assessment can never silently drop an item from the denominator:
 * any item the assessor did not return is scored as NEEDS_REVIEW (unverified).
 */
export function scoreReadiness(
  blueprint: Blueprint,
  assessments: ItemAssessment[],
): ReadinessScore {
  const byKey = new Map(assessments.map((a) => [a.itemKey, a]));

  let earnedTotal = 0;
  let maxTotal = 0;
  const overallCounts = emptyCounts();

  const categories: CategoryScore[] = blueprint.categories.map((cat) => {
    let earned = 0;
    let max = 0;
    const counts = emptyCounts();

    for (const item of blueprint.items) {
      if (item.category !== cat.key) continue;
      const status: ItemStatus = byKey.get(item.key)?.status ?? "NEEDS_REVIEW";
      earned += item.weight * STATUS_FRACTION[status];
      max += item.weight;
      tally(counts, status);
    }

    earnedTotal += earned;
    maxTotal += max;
    overallCounts.present += counts.present;
    overallCounts.partial += counts.partial;
    overallCounts.missing += counts.missing;
    overallCounts.needsReview += counts.needsReview;
    overallCounts.total += counts.total;

    return {
      category: cat.key,
      title: cat.title,
      score: pct(earned, max),
      earnedWeight: earned,
      maxWeight: max,
      counts,
    };
  });

  return {
    score: pct(earnedTotal, maxTotal),
    earnedWeight: earnedTotal,
    maxWeight: maxTotal,
    counts: overallCounts,
    categories,
  };
}
