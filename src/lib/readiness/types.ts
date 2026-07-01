/**
 * Shared types for the readiness layer.
 *
 * The readiness feature turns the reactive RAG app into an auditor: instead of
 * waiting for a question, it checks a document set against a jurisdiction
 * blueprint (the "definition of done") and reports how ready the package is.
 * These types describe that blueprint, the assessor's per-item verdicts, and
 * the deterministic score derived from them.
 */

/** The verdict for a single checklist item. */
export type ItemStatus = "PRESENT" | "PARTIAL" | "MISSING" | "NEEDS_REVIEW";

/** One requirement in a jurisdiction blueprint. */
export interface BlueprintItem {
  /** Stable, kebab-case identifier - safe to persist and reference. */
  key: string;
  /** Human-readable requirement title. */
  title: string;
  /** Category key; must match a `Blueprint.categories` entry. */
  category: string;
  /**
   * Relative importance in the score (positive integer). Higher = a bigger
   * dent in readiness when missing. Kept as small integers so the resulting
   * percentage is easy to explain in an audit.
   */
  weight: number;
  /**
   * Marks the India-specific credibility items (CTRI, EC registration,
   * English+local ICF, AV consent, insurance, compensation). Surfaced in the
   * UI as a small tell that the blueprint was built for India, not copied from
   * a US checklist.
   */
  indiaSpecific?: boolean;
  /** Requirement only applies in some cases (e.g. imported product). */
  conditional?: boolean;
  /** Retrieval query handed to the existing `retrieve()`. */
  query: string;
  /** What "present" evidence looks like - anchors the LLM judge. */
  evidence: string;
  /** When the difference between partial and missing is subtle, spell it out. */
  partialWhen?: string;
  /** Regulatory anchor shown in the UI (e.g. "NDCT Rules 2019, Form CT-06"). */
  reference?: string;
}

/** A grouping of blueprint items, used for the dashboard breakdown. */
export interface BlueprintCategory {
  key: string;
  title: string;
  description?: string;
}

/** A jurisdiction checklist - the standard a package is measured against. */
export interface Blueprint {
  /** Stable id, e.g. "cdsco-ndct-2019". */
  id: string;
  /** Machine jurisdiction code, e.g. "IN-CDSCO". */
  jurisdiction: string;
  /** Human jurisdiction label, e.g. "India - CDSCO". */
  jurisdictionLabel: string;
  /** Blueprint title shown at the top of the dashboard. */
  title: string;
  /** Version string, bumped when items change (audit provenance). */
  version: string;
  /** The regulatory authority / rule set this encodes. */
  authority: string;
  /** One-line description of what a "ready" package means here. */
  summary: string;
  categories: BlueprintCategory[];
  items: BlueprintItem[];
}

/** A citation verified against retrieved chunks - carries a jumpable page. */
export interface AssessedCitation {
  documentId: string;
  docName: string;
  /** 1-based page number. */
  page: number;
  snippet: string;
}

/** The assessor's verdict for one blueprint item. */
export interface ItemAssessment {
  itemKey: string;
  category: string;
  title: string;
  weight: number;
  status: ItemStatus;
  /** Assessor confidence in the verdict, 0-1. */
  confidence: number;
  /** Grounded reasoning for the verdict. */
  rationale: string;
  /** Next action when the item is not fully present. */
  recommendation: string | null;
  /** Verified citations (may be empty for MISSING / NEEDS_REVIEW). */
  citations: AssessedCitation[];
}

/** How many items fell into each status (for a category or the whole run). */
export interface StatusCounts {
  present: number;
  partial: number;
  missing: number;
  needsReview: number;
  total: number;
}

/** Per-category rollup for the dashboard chart. */
export interface CategoryScore {
  category: string;
  title: string;
  /** 0-100 for this category. */
  score: number;
  earnedWeight: number;
  maxWeight: number;
  counts: StatusCounts;
}

/** The full deterministic score for a run. */
export interface ReadinessScore {
  /** 0-100 overall. */
  score: number;
  earnedWeight: number;
  maxWeight: number;
  counts: StatusCounts;
  categories: CategoryScore[];
}

/** The gap explainer's plain-language output. */
export interface GapSummary {
  /** e.g. "Not ready: missing trial insurance, CTRI registration, AV consent". */
  headline: string;
  /** Up to three highest-leverage next actions. */
  topFixes: string[];
}
