import { z } from "zod";
import type { RetrievedChunk } from "~/lib/rag/types";
import type { RetrieveResult } from "~/lib/rag/retrieve";
import type {
  AssessedCitation,
  Blueprint,
  BlueprintItem,
  ItemAssessment,
  ItemStatus,
} from "./types";

/**
 * The assessor: the part that turns retrieval into a verdict.
 *
 * For one blueprint item it runs the existing `retrieve()` with the item's
 * query, then asks an LLM to judge - against the item's evidence definition -
 * whether the requirement is PRESENT, PARTIAL, MISSING, or NEEDS_REVIEW. The
 * honesty rules matter more than cleverness here: when the evidence is weak or
 * ambiguous the assessor says NEEDS_REVIEW instead of guessing, and any verdict
 * of PRESENT/PARTIAL must be backed by a citation that verifies against a real
 * retrieved chunk. That provenance is what "audit-ready" means to a regulated
 * buyer.
 */

const RETRIEVAL_MODEL = "gpt-4o-mini";

/** The judge's raw output, before we verify its citations. */
export const judgeSchema = z.object({
  status: z.enum(["PRESENT", "PARTIAL", "MISSING", "NEEDS_REVIEW"]),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  recommendation: z.string().nullable(),
  citedPages: z.array(
    z.object({ docName: z.string(), page: z.number().int() }),
  ),
});
export type JudgeOutput = z.infer<typeof judgeSchema>;

export interface JudgeInput {
  item: BlueprintItem;
  chunks: RetrievedChunk[];
  weakContext: boolean;
}

export interface AssessContext {
  userId: string;
  /** Optional scope; when omitted the assessor sees all of the user's docs. */
  documentIds?: string[];
}

export interface AssessDeps {
  /** Retrieval for one item query - defaults to the app's `retrieve()`. */
  retrieve: (query: string) => Promise<RetrieveResult>;
  /** The LLM judge - defaults to a grounded gpt-4o-mini call. */
  judge: (input: JudgeInput) => Promise<JudgeOutput>;
}

function contextBlocks(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "(no matching passages were retrieved)";
  return chunks
    .map((c) => `[${c.docName} p.${c.page}] ${c.content}`)
    .join("\n\n");
}

const JUDGE_SYSTEM = `You are a meticulous clinical-trial regulatory reviewer assessing whether a required document is present in a trial package.

You are given ONE checklist requirement and the passages retrieved from the package for it. Decide the status using ONLY those passages:
- PRESENT: the passages clearly show the required document exists and is complete.
- PARTIAL: the document is there but incomplete, unsigned, draft, expired, or missing a required element.
- MISSING: the passages do not contain the required document at all.
- NEEDS_REVIEW: the evidence is present but too ambiguous or weak to decide - do NOT guess.

Rules:
- Cite every passage you rely on by its exact document name and page (from the [DocName p.N] tags). Never cite a page you were not shown.
- If you answer PRESENT or PARTIAL you MUST cite at least one supporting passage.
- Prefer NEEDS_REVIEW over an unsupported PRESENT. Honesty is worth more than optimism here.
- Keep the rationale to one or two sentences. Give a concrete recommendation whenever the status is not PRESENT.`;

async function defaultJudge(input: JudgeInput): Promise<JudgeOutput> {
  // Lazily import the AI SDK + model so unit tests injecting a fake judge never
  // pull in the provider (which would read env).
  const { generateObject } = await import("ai");
  const { openai } = await import("@ai-sdk/openai");

  const { item, chunks, weakContext } = input;
  const prompt = `Requirement: ${item.title}
What counts as present: ${item.evidence}${
    item.partialWhen ? `\nWhen to call it partial: ${item.partialWhen}` : ""
  }${item.reference ? `\nRegulatory anchor: ${item.reference}` : ""}
${weakContext ? "\nNote: retrieval flagged this context as weak - lean toward MISSING or NEEDS_REVIEW.\n" : ""}
Retrieved passages:
"""
${contextBlocks(chunks)}
"""`;

  const { object } = await generateObject({
    model: openai(RETRIEVAL_MODEL),
    schema: judgeSchema,
    system: JUDGE_SYSTEM,
    prompt,
    temperature: 0,
  });
  return object;
}

/**
 * Verify the judge's cited pages against the chunks actually retrieved, and
 * build jumpable citations (documentId + snippet). A cited page that was never
 * retrieved is dropped - the judge cannot invent provenance.
 */
function buildCitations(
  cited: JudgeOutput["citedPages"],
  chunks: RetrievedChunk[],
): AssessedCitation[] {
  const byKey = new Map<string, RetrievedChunk>();
  for (const c of chunks) {
    const key = `${c.docName.trim().toLowerCase()}::${c.page}`;
    if (!byKey.has(key)) byKey.set(key, c);
  }

  const out: AssessedCitation[] = [];
  const seen = new Set<string>();
  for (const c of cited) {
    const key = `${c.docName.trim().toLowerCase()}::${c.page}`;
    const chunk = byKey.get(key);
    if (!chunk || seen.has(key)) continue;
    seen.add(key);
    out.push({
      documentId: chunk.documentId,
      docName: chunk.docName,
      page: chunk.page,
      snippet: chunk.content.slice(0, 300),
    });
  }
  return out;
}

function defaultDeps(ctx: AssessContext): AssessDeps {
  return {
    retrieve: async (query) => {
      const { retrieve } = await import("~/lib/rag/retrieve");
      return retrieve({
        query,
        history: [],
        userId: ctx.userId,
        documentIds: ctx.documentIds,
      });
    },
    judge: defaultJudge,
  };
}

/**
 * Assess a single blueprint item end-to-end: retrieve -> judge -> verify
 * citations -> enforce the provenance rule. Never throws; on an internal
 * failure it returns a NEEDS_REVIEW verdict so one bad item cannot sink the run.
 */
export async function assessItem(
  item: BlueprintItem,
  ctx: AssessContext,
  deps?: Partial<AssessDeps>,
): Promise<ItemAssessment> {
  const base = defaultDeps(ctx);
  const retrieveFn = deps?.retrieve ?? base.retrieve;
  const judgeFn = deps?.judge ?? base.judge;

  const finding = (
    status: ItemStatus,
    confidence: number,
    rationale: string,
    recommendation: string | null,
    citations: AssessedCitation[],
  ): ItemAssessment => ({
    itemKey: item.key,
    category: item.category,
    title: item.title,
    weight: item.weight,
    status,
    confidence,
    rationale,
    recommendation,
    citations,
  });

  let result: RetrieveResult;
  try {
    result = await retrieveFn(item.query);
  } catch {
    return finding(
      "NEEDS_REVIEW",
      0,
      "Could not search the package for this requirement.",
      "Retry the readiness check for this item.",
      [],
    );
  }

  // Nothing matched anywhere in the package -> treat as not present.
  if (result.chunks.length === 0) {
    return finding(
      "MISSING",
      0.7,
      "No passage in the package matched this requirement.",
      `Add evidence of "${item.title}" to the package.`,
      [],
    );
  }

  let verdict: JudgeOutput;
  try {
    verdict = await judgeFn({
      item,
      chunks: result.chunks,
      weakContext: result.weakContext,
    });
  } catch {
    return finding(
      "NEEDS_REVIEW",
      0,
      "The assessment step failed for this item.",
      "Retry the readiness check for this item.",
      [],
    );
  }

  const citations = buildCitations(verdict.citedPages, result.chunks);

  // Provenance rule: a PRESENT/PARTIAL verdict with no verifiable citation is
  // not audit-ready. Downgrade to NEEDS_REVIEW rather than assert it.
  if (
    (verdict.status === "PRESENT" || verdict.status === "PARTIAL") &&
    citations.length === 0
  ) {
    return finding(
      "NEEDS_REVIEW",
      Math.min(verdict.confidence, 0.4),
      `${verdict.rationale} (No citation could be verified against the package, so this needs a human check.)`,
      verdict.recommendation ??
        `Confirm "${item.title}" against the source document.`,
      [],
    );
  }

  return finding(
    verdict.status,
    verdict.confidence,
    verdict.rationale,
    verdict.recommendation,
    citations,
  );
}

/**
 * Assess every item in a blueprint with bounded concurrency (keeps the run
 * inside the request budget without hammering the model). Results come back in
 * blueprint order. `onItem` is called as each verdict lands, so the coordinator
 * can stream progress / persist incrementally.
 */
export async function assessBlueprint(
  blueprint: Blueprint,
  ctx: AssessContext,
  deps?: Partial<AssessDeps>,
  opts?: { concurrency?: number; onItem?: (a: ItemAssessment) => void },
): Promise<ItemAssessment[]> {
  const concurrency = Math.max(1, opts?.concurrency ?? 4);
  const items = blueprint.items;
  const results = new Array<ItemAssessment>(items.length);

  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      const a = await assessItem(items[i]!, ctx, deps);
      results[i] = a;
      opts?.onItem?.(a);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}
