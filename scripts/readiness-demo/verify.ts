/**
 * Verify the seeded CDSCO demo end-to-end.
 *
 * Runs the REAL readiness coordinator (retrieve -> grounded judge -> score ->
 * explain) against the seeded demo session and prints the score, the
 * per-category breakdown, and every gap with its page-accurate citation. Proves
 * the whole feature works offline, exactly as the /api/readiness route would.
 *
 *   npm run verify:readiness
 */
import { db } from "../../src/server/db";
import { retrieve } from "../../src/lib/rag/retrieve";
import { runReadiness } from "../../src/lib/readiness/graph";
import { createRun, getRun } from "../../src/lib/readiness/persist";
import { getBlueprint, DEFAULT_BLUEPRINT_ID } from "../../src/lib/readiness/blueprints";

const DEMO_EMAIL = "cdsco-demo@nextrial.demo";
const SESSION_TITLE = "CDSCO Demo - Site 07 (Protocol NX-2025-07)";

type Citation = { docName?: string; page?: number };

function pct(n: number): string {
  return `${Math.round(n)}%`;
}

async function main() {
  const user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) throw new Error(`Demo user ${DEMO_EMAIL} not found - run npm run seed:readiness first.`);

  const session = await db.pdfChatSession.findFirst({
    where: { userId: user.id, title: SESSION_TITLE },
    orderBy: { createdAt: "desc" },
    include: { documents: true },
  });
  if (!session) throw new Error("Demo session not found - run npm run seed:readiness first.");

  const readyDocIds = session.documents
    .filter((d) => d.status === "READY")
    .map((d) => d.id);
  console.log(
    `Session ${session.id} - ${readyDocIds.length}/${session.documents.length} documents READY\n`,
  );

  const blueprint = getBlueprint(DEFAULT_BLUEPRINT_ID)!;

  const { id: runId } = await createRun({
    sessionId: session.id,
    userId: user.id,
    jurisdiction: blueprint.jurisdiction,
    blueprintId: blueprint.id,
    blueprintVersion: blueprint.version,
  });

  console.log(`Running readiness check (${blueprint.items.length} items)...\n`);
  const started = Date.now();
  await runReadiness(
    {
      runId,
      userId: user.id,
      sessionId: session.id,
      documentIds: readyDocIds,
      blueprint,
    },
    {
      assess: {
        retrieve: (query) =>
          retrieve(
            { query, history: [], userId: user.id, documentIds: readyDocIds },
            { rewrite: (_h, latest) => Promise.resolve(latest) },
          ),
      },
      concurrency: 8,
    },
  );
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  const run = await getRun(runId, user.id);
  if (!run) throw new Error("Run vanished after completion");

  const icon: Record<string, string> = {
    PRESENT: "✅",
    PARTIAL: "🟡",
    MISSING: "❌",
    NEEDS_REVIEW: "🔎",
  };

  console.log(`OVERALL READINESS: ${run.score}%   (${run.status}, ${elapsed}s)\n`);

  // Per-category breakdown from the item rows.
  const byCat = new Map<string, { earned: number; max: number }>();
  const frac: Record<string, number> = {
    PRESENT: 1,
    PARTIAL: 0.5,
    MISSING: 0,
    NEEDS_REVIEW: 0,
  };
  for (const it of run.items) {
    const c = byCat.get(it.category) ?? { earned: 0, max: 0 };
    c.earned += (frac[it.status] ?? 0) * it.weight;
    c.max += it.weight;
    byCat.set(it.category, c);
  }
  console.log("BY CATEGORY");
  for (const [cat, { earned, max }] of byCat) {
    console.log(`  ${pct((earned / max) * 100).padStart(4)}  ${cat}`);
  }

  // Headline + fixes (stored directly on the run row).
  if (run.headline) console.log(`\nHEADLINE\n  ${run.headline}`);
  const topFixes = (Array.isArray(run.topFixes) ? run.topFixes : []) as string[];
  if (topFixes.length) {
    console.log("\nTOP FIXES");
    topFixes.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  }

  // Every item, worst first, with citations.
  const order: Record<string, number> = {
    MISSING: 0,
    PARTIAL: 1,
    NEEDS_REVIEW: 2,
    PRESENT: 3,
  };
  const items = [...run.items].sort(
    (a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9),
  );
  console.log("\nITEMS");
  for (const it of items) {
    const cites = (Array.isArray(it.citations) ? it.citations : []) as Citation[];
    const citeStr = cites
      .map((c) => `[${c.docName ?? "?"} p.${c.page ?? "?"}]`)
      .join(" ");
    console.log(
      `  ${icon[it.status] ?? "?"} ${it.status.padEnd(12)} ${it.title}${citeStr ? "  " + citeStr : ""}`,
    );
  }
  console.log();
}

main()
  .catch((err) => {
    console.error("\nVerify failed:", err);
    process.exitCode = 1;
  })
  .finally(() => void db.$disconnect());
