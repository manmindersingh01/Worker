import type {
  ReadinessRun,
  ReadinessItemResult,
} from "@prisma/client";
import type { Blueprint, AssessedCitation, CategoryScore } from "./types";

/**
 * The client-facing shape of a readiness run. This is what every API endpoint
 * returns and what the dashboard renders, so the DB row and the blueprint
 * metadata (category titles, India-specific flags, regulatory references) are
 * merged here once rather than in the UI.
 */
export interface ClientReadinessItem {
  itemKey: string;
  category: string;
  categoryTitle: string;
  title: string;
  status: ReadinessItemResult["status"];
  weight: number;
  confidence: number;
  rationale: string;
  recommendation: string | null;
  indiaSpecific: boolean;
  reference: string | null;
  citations: AssessedCitation[];
}

export interface ClientReadinessRun {
  id: string;
  status: ReadinessRun["status"];
  jurisdiction: string;
  jurisdictionLabel: string;
  blueprintId: string;
  blueprintTitle: string;
  blueprintVersion: string;
  authority: string;
  summary: string;
  score: number | null;
  maxWeight: number | null;
  earnedWeight: number | null;
  headline: string | null;
  topFixes: string[];
  categories: CategoryScore[];
  items: ClientReadinessItem[];
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

type RunWithItems = ReadinessRun & { items: ReadinessItemResult[] };

/**
 * Merge a persisted run + its items with the blueprint it was run against into
 * the client shape. The blueprint may be undefined (e.g. an old run whose
 * blueprint was retired); labels then fall back to what the run row itself
 * stored so the response never breaks.
 */
export function serializeRun(
  run: RunWithItems,
  blueprint?: Blueprint,
): ClientReadinessRun {
  const itemMeta = new Map(blueprint?.items.map((i) => [i.key, i]) ?? []);
  const categoryTitle = new Map(
    blueprint?.categories.map((c) => [c.key, c.title]) ?? [],
  );

  const items: ClientReadinessItem[] = run.items.map((r) => {
    const meta = itemMeta.get(r.itemKey);
    return {
      itemKey: r.itemKey,
      category: r.category,
      categoryTitle: categoryTitle.get(r.category) ?? r.category,
      title: r.title,
      status: r.status,
      weight: r.weight,
      confidence: r.confidence,
      rationale: r.rationale,
      recommendation: r.recommendation,
      indiaSpecific: meta?.indiaSpecific ?? false,
      reference: meta?.reference ?? null,
      citations: (r.citations as unknown as AssessedCitation[]) ?? [],
    };
  });

  return {
    id: run.id,
    status: run.status,
    jurisdiction: run.jurisdiction,
    jurisdictionLabel: blueprint?.jurisdictionLabel ?? run.jurisdiction,
    blueprintId: run.blueprintId,
    blueprintTitle: blueprint?.title ?? run.blueprintId,
    blueprintVersion: run.blueprintVersion,
    authority: blueprint?.authority ?? "",
    summary: blueprint?.summary ?? "",
    score: run.score,
    maxWeight: run.maxWeight,
    earnedWeight: run.earnedWeight,
    headline: run.headline,
    topFixes: (run.topFixes as unknown as string[]) ?? [],
    categories: (run.categoryScores as unknown as CategoryScore[]) ?? [],
    items,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    error: run.error,
  };
}
