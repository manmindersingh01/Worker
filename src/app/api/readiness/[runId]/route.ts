import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/server/auth";
import { getBlueprint } from "~/lib/readiness/blueprints";
import { getRun } from "~/lib/readiness/persist";
import { serializeRun } from "~/lib/readiness/serialize";

/**
 * GET /api/readiness/[runId] -> one run with its items and the coordinator's
 * event log (the audit trail). Scoped to the owning user.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;
  const run = await getRun(runId, userId);
  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    run: serializeRun(run, getBlueprint(run.blueprintId)),
    events: run.events.map((e) => ({
      node: e.node,
      message: e.message,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
