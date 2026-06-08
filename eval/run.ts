/**
 * RAG retrieval evaluation harness.
 *
 * Loads eval/golden.json, runs the REAL retrieval pipeline for each case, and
 * reports recall@6 and MRR per case plus the means. This hits live services
 * (OpenAI embeddings, Pinecone, Cohere rerank) and the database, so it requires
 * the corresponding env vars and a populated DB at runtime.
 *
 * Run with: npm run eval   (or: npx tsx eval/run.ts)
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { retrieve } from "../src/lib/rag/retrieve";
import { recallAtK, mrr, meanMetric } from "./metrics";

const RECALL_K = 6;

interface GoldenCase {
  id: string;
  question: string;
  userId: string;
  documentIds: string[] | null;
  relevantChunkIds: string[];
  idealAnswer: string;
}

interface GoldenSet {
  version: number;
  note: string;
  cases: GoldenCase[];
}

async function main() {
  // Runtime guard: live keys are mandatory. Skip cleanly (exit 0) when absent so
  // CI without secrets does not fail.
  if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
    console.log(
      "eval requires live keys (OPENAI_API_KEY, PINECONE_API_KEY); skipping",
    );
    process.exit(0);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const raw = await readFile(join(here, "golden.json"), "utf8");
  const golden = JSON.parse(raw) as GoldenSet;

  if (!golden.cases?.length) {
    console.log("golden.json has no cases; nothing to evaluate.");
    process.exit(0);
  }

  const recalls: number[] = [];
  const mrrs: number[] = [];
  const rows: { id: string; recall: string; mrr: string; n: number }[] = [];

  for (const c of golden.cases) {
    const result = await retrieve({
      query: c.question,
      history: [],
      userId: c.userId,
      documentIds: c.documentIds ?? undefined,
    });
    const ids = result.chunks.map((ch) => ch.chunkId);
    const r = recallAtK(ids, c.relevantChunkIds, RECALL_K);
    const m = mrr(ids, c.relevantChunkIds);
    recalls.push(r);
    mrrs.push(m);
    rows.push({
      id: c.id,
      recall: r.toFixed(3),
      mrr: m.toFixed(3),
      n: ids.length,
    });
  }

  console.log(`\nRAG retrieval eval — ${golden.cases.length} case(s)\n`);
  console.table(rows);
  console.log(
    `\nmean recall@${RECALL_K}: ${meanMetric(recalls).toFixed(3)}` +
      `   mean MRR: ${meanMetric(mrrs).toFixed(3)}\n`,
  );
}

main().catch((err) => {
  console.error("eval failed:", err);
  process.exit(1);
});
