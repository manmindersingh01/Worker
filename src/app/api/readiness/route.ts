import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { retrieve } from "~/lib/rag/retrieve";
import { READINESS_RUN_COST } from "~/lib/limits";
import {
  DEFAULT_BLUEPRINT_ID,
  getBlueprint,
} from "~/lib/readiness/blueprints";
import {
  createRun,
  failStaleRuns,
  getLatestRun,
  getRun,
} from "~/lib/readiness/persist";
import { runReadiness } from "~/lib/readiness/graph";
import { serializeRun } from "~/lib/readiness/serialize";

// A run fans retrieval + an LLM judgement across every blueprint item, so it can
// exceed the Vercel Hobby default of 10s; raise to the Hobby maximum.
export const maxDuration = 60;
export const runtime = "nodejs";

/**
 * GET /api/readiness?sessionId=... -> the latest readiness run for a session,
 * or { run: null } if none has been run yet. Used by the dashboard on load.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const run = await getLatestRun(sessionId, userId);
  if (!run) return NextResponse.json({ run: null });

  return NextResponse.json({
    run: serializeRun(run, getBlueprint(run.blueprintId)),
  });
}

/**
 * POST /api/readiness { sessionId, blueprintId? } -> runs a readiness check over
 * the session's READY documents and returns the completed run.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      sessionId?: string;
      blueprintId?: string;
    } | null;
    const sessionId = body?.sessionId;
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const chatSession = await db.pdfChatSession.findFirst({
      where: { id: sessionId, userId },
      include: { documents: true },
    });
    if (!chatSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    const readyDocIds = chatSession.documents
      .filter((d) => d.status === "READY")
      .map((d) => d.id);
    if (readyDocIds.length === 0) {
      return NextResponse.json(
        {
          error: "NO_DOCUMENTS",
          message:
            "This session has no indexed documents yet. Upload a trial package and wait for it to finish processing.",
        },
        { status: 400 },
      );
    }

    const blueprint = getBlueprint(body?.blueprintId ?? DEFAULT_BLUEPRINT_ID);
    if (!blueprint) {
      return NextResponse.json(
        { error: "Unknown blueprint" },
        { status: 400 },
      );
    }

    // Gate on credits up front (a run must be affordable), but do NOT debit yet:
    // charging only after a successful run means a failed or timed-out run never
    // burns credits, so there is nothing to refund on the error path.
    const account = await db.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });
    if ((account?.credits ?? 0) < READINESS_RUN_COST) {
      return NextResponse.json(
        {
          error: "INSUFFICIENT_CREDITS",
          message: "You don't have enough credits to run a readiness check.",
        },
        { status: 402 },
      );
    }

    // Clear any zombie runs from a previously killed request before starting.
    await failStaleRuns(sessionId, userId);

    const { id: runId } = await createRun({
      sessionId,
      userId,
      jurisdiction: blueprint.jurisdiction,
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
    });

    await runReadiness(
      { runId, userId, sessionId, documentIds: readyDocIds, blueprint },
      {
        assess: {
          // No conversation here, so skip the rewrite LLM call entirely and
          // retrieve on each blueprint item's query directly.
          retrieve: (query) =>
            retrieve(
              { query, history: [], userId, documentIds: readyDocIds },
              { rewrite: (_history, latest) => Promise.resolve(latest) },
            ),
        },
        // Higher fan-out keeps a full 16-item run comfortably inside the 60s
        // request budget (~2 waves of retrieve + judge).
        concurrency: 8,
      },
    );

    // Debit only now that the run has completed and produced a result. The
    // conditional guard avoids an overdraft if two runs raced the gate.
    await db.user.updateMany({
      where: { id: userId, credits: { gte: READINESS_RUN_COST } },
      data: { credits: { decrement: READINESS_RUN_COST } },
    });

    const run = await getRun(runId, userId);
    if (!run) {
      return NextResponse.json(
        { error: "Run vanished after completion" },
        { status: 500 },
      );
    }
    return NextResponse.json({ run: serializeRun(run, blueprint) });
  } catch (error) {
    console.error("[readiness] run failed", error);
    return NextResponse.json(
      {
        error: "READINESS_FAILED",
        message: "The readiness check could not be completed.",
      },
      { status: 500 },
    );
  }
}
