import {
  StateGraph,
  Annotation,
  START,
  END,
  MemorySaver,
} from "@langchain/langgraph";
import { assessBlueprint, type AssessDeps } from "./assess";
import { scoreReadiness } from "./score";
import { explainGaps, type ExplainDeps } from "./explain";
import { prismaPersistence, type ReadinessPersistence } from "./persist";
import type {
  Blueprint,
  GapSummary,
  ItemAssessment,
  ReadinessScore,
} from "./types";

/**
 * The coordinator, built as a LangGraph StateGraph.
 *
 * It runs the readiness workflow as one ordered graph -
 *   load -> assess -> score -> explain -> finalize
 * - where each node advances a shared state and appends to the run's event log.
 * The graph gives the workflow a single place to reason about progress and a
 * durable record of what it did (checkpointed by thread = runId), while the
 * Postgres rows written along the way are the audit trail a reviewer inspects.
 *
 * The immutable inputs (run id, blueprint, retrieval scope, dependencies) live
 * in the closure; only the flowing results move through the graph's channels.
 */

/** The state that flows between nodes. */
const ReadinessAnnotation = Annotation.Root({
  assessments: Annotation<ItemAssessment[]>(),
  score: Annotation<ReadinessScore | null>(),
  summary: Annotation<GapSummary | null>(),
});

type ReadinessState = typeof ReadinessAnnotation.State;

export interface RunReadinessParams {
  runId: string;
  userId: string;
  sessionId: string;
  documentIds?: string[];
  blueprint: Blueprint;
}

export interface RunReadinessDeps {
  assess?: Partial<AssessDeps>;
  explain?: Partial<ExplainDeps>;
  persist?: ReadinessPersistence;
  /** Items assessed at once. Bounded so a run fits the request budget. */
  concurrency?: number;
}

export interface RunReadinessResult {
  assessments: ItemAssessment[];
  score: ReadinessScore;
  summary: GapSummary;
}

function buildGraph(params: RunReadinessParams, deps: RunReadinessDeps) {
  const { runId, userId, sessionId, documentIds, blueprint } = params;
  const persist = deps.persist ?? prismaPersistence;

  const load = async (): Promise<Partial<ReadinessState>> => {
    await persist.logEvent(runId, "load", "Loaded blueprint and document scope.", {
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      itemCount: blueprint.items.length,
      scope: documentIds?.length ? `${documentIds.length} documents` : "all documents",
    });
    return {};
  };

  const assess = async (): Promise<Partial<ReadinessState>> => {
    await persist.logEvent(
      runId,
      "assess",
      `Assessing ${blueprint.items.length} requirements against the package.`,
    );
    const assessments = await assessBlueprint(
      blueprint,
      { userId, documentIds },
      deps.assess,
      { concurrency: deps.concurrency ?? 4 },
    );
    await persist.saveItems(runId, assessments);
    const present = assessments.filter((a) => a.status === "PRESENT").length;
    const partial = assessments.filter((a) => a.status === "PARTIAL").length;
    const missing = assessments.filter((a) => a.status === "MISSING").length;
    const review = assessments.filter((a) => a.status === "NEEDS_REVIEW").length;
    await persist.logEvent(runId, "assess", "Assessment complete.", {
      present,
      partial,
      missing,
      needsReview: review,
    });
    return { assessments };
  };

  const score = async (
    state: ReadinessState,
  ): Promise<Partial<ReadinessState>> => {
    const result = scoreReadiness(blueprint, state.assessments);
    await persist.logEvent(
      runId,
      "score",
      `Scored ${result.score}% ready (${result.earnedWeight} of ${result.maxWeight} weighted points).`,
      { score: result.score },
    );
    return { score: result };
  };

  const explain = async (
    state: ReadinessState,
  ): Promise<Partial<ReadinessState>> => {
    const summary = await explainGaps(
      blueprint,
      state.score!,
      state.assessments,
      deps.explain,
    );
    await persist.logEvent(runId, "explain", summary.headline);
    return { summary };
  };

  const finalize = async (
    state: ReadinessState,
  ): Promise<Partial<ReadinessState>> => {
    await persist.finalize(runId, state.score!, state.summary!);
    await persist.logEvent(runId, "finalize", "Readiness run completed.");
    return {};
  };

  // Node ids must not collide with state channel names (score/summary), so the
  // scoring node is "tally".
  return new StateGraph(ReadinessAnnotation)
    .addNode("load", load)
    .addNode("assess", assess)
    .addNode("tally", score)
    .addNode("explain", explain)
    .addNode("finalize", finalize)
    .addEdge(START, "load")
    .addEdge("load", "assess")
    .addEdge("assess", "tally")
    .addEdge("tally", "explain")
    .addEdge("explain", "finalize")
    .addEdge("finalize", END)
    .compile({ checkpointer: new MemorySaver() });
}

/**
 * Drive one readiness run through the coordinator. Marks the run RUNNING, runs
 * the graph, and returns the final score + summary. On any failure the run is
 * marked FAILED (audit trail records the failure) and the error is rethrown.
 */
export async function runReadiness(
  params: RunReadinessParams,
  deps: RunReadinessDeps = {},
): Promise<RunReadinessResult> {
  const persist = deps.persist ?? prismaPersistence;
  await persist.markRunning(params.runId);

  try {
    const app = buildGraph(params, deps);
    const final = await app.invoke(
      { assessments: [], score: null, summary: null },
      { configurable: { thread_id: params.runId } },
    );
    return {
      assessments: final.assessments,
      score: final.score!,
      summary: final.summary!,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await persist.fail(params.runId, message);
      await persist.logEvent(params.runId, "error", `Run failed: ${message}`);
    } catch {
      /* persistence of the failure must not mask the original error */
    }
    throw err;
  }
}
