import { z } from "zod";
import { STATUS_FRACTION } from "./score";
import type {
  Blueprint,
  GapSummary,
  ItemAssessment,
  ReadinessScore,
} from "./types";

/**
 * The gap explainer: turns raw verdicts into a short, human answer to "why are
 * we not ready, and what should we fix first?".
 *
 * It ranks the gaps by how much readiness each one costs, then phrases a
 * one-line headline and the top three fixes. An LLM is used for nice prose, but
 * a fully deterministic template is always computed first and used as the
 * fallback - so the explainer never fails and never invents a gap that isn't in
 * the scored results.
 */

const EXPLAIN_MODEL = "gpt-4o-mini";

const summarySchema = z.object({
  headline: z.string().min(1),
  topFixes: z.array(z.string().min(1)).max(3),
});

export interface ExplainInput {
  blueprint: Blueprint;
  score: ReadinessScore;
  /** The ranked gaps (worst first) the explainer must stay grounded in. */
  gaps: ItemAssessment[];
}

export interface ExplainDeps {
  summarize: (input: ExplainInput) => Promise<GapSummary>;
}

/** How much score an item costs = weight not yet earned. Present items cost 0. */
function lostWeight(a: ItemAssessment): number {
  return a.weight * (1 - STATUS_FRACTION[a.status]);
}

/**
 * Rank the items that aren't fully present by the readiness they cost, worst
 * first. A high-weight MISSING item outranks a low-weight PARTIAL one.
 */
export function rankGaps(assessments: ItemAssessment[]): ItemAssessment[] {
  const order = { MISSING: 0, NEEDS_REVIEW: 1, PARTIAL: 2, PRESENT: 3 } as const;
  return assessments
    .filter((a) => a.status !== "PRESENT")
    .sort(
      (x, y) =>
        lostWeight(y) - lostWeight(x) ||
        order[x.status] - order[y.status] ||
        y.weight - x.weight,
    );
}

/** The always-available, deterministic summary. */
export function deterministicSummary(input: ExplainInput): GapSummary {
  const { score, gaps } = input;
  if (gaps.length === 0) {
    return {
      headline: `Audit-ready: all ${score.counts.total} required items verified present (${score.score}%).`,
      topFixes: [],
    };
  }

  const missing = gaps.filter((g) => g.status === "MISSING");
  const named = (missing.length >= 2 ? missing : gaps)
    .slice(0, 3)
    .map((g) => g.title.toLowerCase());

  const lead =
    missing.length > 0
      ? `Not ready (${score.score}%): missing ${named.join(", ")}`
      : `Not ready (${score.score}%): gaps in ${named.join(", ")}`;

  const topFixes: string[] = [];
  for (const g of gaps) {
    if (topFixes.length >= 3) break;
    const fix = g.recommendation ?? `Resolve "${g.title}".`;
    if (!topFixes.includes(fix)) topFixes.push(fix);
  }

  return { headline: lead + ".", topFixes };
}

async function defaultSummarize(input: ExplainInput): Promise<GapSummary> {
  const deterministic = deterministicSummary(input);
  if (input.gaps.length === 0) return deterministic;

  try {
    const { generateObject } = await import("ai");
    const { openai } = await import("@ai-sdk/openai");

    const gapLines = input.gaps
      .slice(0, 8)
      .map(
        (g) =>
          `- ${g.title} [${g.status}, weight ${g.weight}]${
            g.recommendation ? `: ${g.recommendation}` : ""
          }`,
      )
      .join("\n");

    const { object } = await generateObject({
      model: openai(EXPLAIN_MODEL),
      schema: summarySchema,
      system: `You brief a clinical-trial operations lead on trial-package readiness. Be blunt and specific. Only reference the gaps you are given - never invent one. The headline is one sentence naming the two or three most important gaps. topFixes are up to three concrete, imperative next actions, highest-leverage first.`,
      prompt: `Jurisdiction: ${input.blueprint.jurisdictionLabel}. Overall readiness: ${input.score.score}%.
Gaps (worst first):
${gapLines}`,
      temperature: 0.2,
    });

    return {
      headline: object.headline.trim() || deterministic.headline,
      topFixes:
        object.topFixes.length > 0 ? object.topFixes : deterministic.topFixes,
    };
  } catch {
    // LLM unavailable or failed - the deterministic summary is a fine answer.
    return deterministic;
  }
}

/**
 * Produce the gap summary for a run. Ranks gaps deterministically first (so the
 * LLM can only ever rephrase real gaps), then delegates phrasing.
 */
export async function explainGaps(
  blueprint: Blueprint,
  score: ReadinessScore,
  assessments: ItemAssessment[],
  deps?: Partial<ExplainDeps>,
): Promise<GapSummary> {
  const gaps = rankGaps(assessments);
  const input: ExplainInput = { blueprint, score, gaps };
  const summarize = deps?.summarize ?? defaultSummarize;
  return summarize(input);
}
