import { db } from "~/server/db";
import type {
  GapSummary,
  ItemAssessment,
  ReadinessScore,
} from "./types";

/**
 * Persistence for readiness runs.
 *
 * Everything the coordinator does is written here: the run row, its per-item
 * verdicts, its per-node events, and the final score. Those rows ARE the audit
 * trail. The coordinator talks to this through the `ReadinessPersistence`
 * interface, so the graph can be exercised end-to-end in tests with an
 * in-memory fake and no database.
 */
export interface ReadinessPersistence {
  markRunning(runId: string): Promise<void>;
  logEvent(
    runId: string,
    node: string,
    message: string,
    data?: unknown,
  ): Promise<void>;
  saveItems(runId: string, items: ItemAssessment[]): Promise<void>;
  finalize(
    runId: string,
    score: ReadinessScore,
    summary: GapSummary,
  ): Promise<void>;
  fail(runId: string, error: string): Promise<void>;
}

/** JSON-safe representation of an event payload. */
function toJson(data: unknown): object | undefined {
  if (data == null) return undefined;
  return JSON.parse(JSON.stringify(data)) as object;
}

export const prismaPersistence: ReadinessPersistence = {
  async markRunning(runId) {
    await db.readinessRun.update({
      where: { id: runId },
      data: { status: "RUNNING", startedAt: new Date() },
    });
  },

  async logEvent(runId, node, message, data) {
    await db.readinessEvent.create({
      data: { runId, node, message, data: toJson(data) as never },
    });
  },

  async saveItems(runId, items) {
    if (items.length === 0) return;
    await db.readinessItemResult.createMany({
      data: items.map((a) => ({
        runId,
        itemKey: a.itemKey,
        category: a.category,
        title: a.title,
        status: a.status,
        weight: a.weight,
        confidence: a.confidence,
        rationale: a.rationale,
        recommendation: a.recommendation,
        citations: toJson(a.citations) as never,
      })),
    });
  },

  async finalize(runId, score, summary) {
    await db.readinessRun.update({
      where: { id: runId },
      data: {
        status: "COMPLETED",
        score: score.score,
        maxWeight: score.maxWeight,
        earnedWeight: score.earnedWeight,
        headline: summary.headline,
        topFixes: toJson(summary.topFixes) as never,
        categoryScores: toJson(score.categories) as never,
        completedAt: new Date(),
      },
    });
  },

  async fail(runId, error) {
    await db.readinessRun.update({
      where: { id: runId },
      data: { status: "FAILED", error: error.slice(0, 500), completedAt: new Date() },
    });
  },
};

/** Create a PENDING run row up front so the API can return its id immediately. */
export async function createRun(input: {
  sessionId: string;
  userId: string;
  jurisdiction: string;
  blueprintId: string;
  blueprintVersion: string;
}): Promise<{ id: string }> {
  const run = await db.readinessRun.create({
    data: {
      sessionId: input.sessionId,
      userId: input.userId,
      jurisdiction: input.jurisdiction,
      blueprintId: input.blueprintId,
      blueprintVersion: input.blueprintVersion,
      status: "PENDING",
    },
    select: { id: true },
  });
  return run;
}

/** Fetch one run (with items + events) scoped to its owner. */
export async function getRun(runId: string, userId: string) {
  return db.readinessRun.findFirst({
    where: { id: runId, userId },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

/** The most recent run for a session (what the dashboard shows on load). */
export async function getLatestRun(sessionId: string, userId: string) {
  return db.readinessRun.findFirst({
    where: { sessionId, userId },
    orderBy: { createdAt: "desc" },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
}
