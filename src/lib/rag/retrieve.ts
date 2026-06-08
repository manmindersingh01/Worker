import type { Candidate, RetrievedChunk } from "./types";
import { reciprocalRankFusion } from "./rrf";
import { rewriteQuery, type ChatMessage, type RewriteMessage } from "./rewrite";
import { denseSearch } from "./dense";
import { sparseSearch } from "./sparse";
import { hydrateChunks } from "./hydrate";
import { rerank } from "./rerank";

export const CONFIDENCE_THRESHOLD = 0.2;

export interface RetrieveResult {
  query: string;
  chunks: RetrievedChunk[];
  weakContext: boolean;
}

export interface RetrieveDeps {
  rewrite: (history: ChatMessage[], latest: string) => Promise<string>;
  dense: (q: string) => Promise<Candidate[]>;
  sparse: (q: string) => Promise<Candidate[]>;
  hydrate: (ids: string[]) => Promise<Map<string, RetrievedChunk>>;
  rerank: (
    q: string,
    docs: RetrievedChunk[],
    topN: number,
  ) => Promise<(RetrievedChunk & { rerankScore: number })[]>;
}

const REWRITE_MODEL = "gpt-4o-mini";
const FUSE_K = 60;
const FUSE_TOP = 40;
const RERANK_TOP_N = 6;

/**
 * Default rewrite LLM: lazily imports openai + env so that tests injecting a
 * full fake deps set never touch real modules. On any error rewriteQuery falls
 * back to the latest question anyway.
 */
async function defaultRewriteLlm(msgs: RewriteMessage[]): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const { env } = await import("~/server/env");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const res = await client.chat.completions.create({
    model: REWRITE_MODEL,
    messages: msgs,
  });
  return res.choices[0]?.message?.content ?? "";
}

function defaultDeps(userId: string, documentIds?: string[]): RetrieveDeps {
  return {
    rewrite: (history, latest) =>
      rewriteQuery(history, latest, defaultRewriteLlm),
    dense: (q) => denseSearch(q, { userId, documentIds }),
    sparse: (q) => sparseSearch(q, { userId, documentIds }),
    hydrate: (ids) => hydrateChunks(ids),
    rerank: (q, docs, topN) => rerank(q, docs, topN),
  };
}

function orderedIds(candidates: Candidate[]): string[] {
  return [...candidates].sort((a, b) => a.rank - b.rank).map((c) => c.chunkId);
}

export async function retrieve(
  input: {
    query: string;
    history: ChatMessage[];
    userId: string;
    documentIds?: string[];
  },
  deps?: Partial<RetrieveDeps>,
): Promise<RetrieveResult> {
  // Build effective deps per-field so a full fake set never instantiates the
  // real adapters (which would import env). Defaults are computed once and only
  // if at least one dep is missing.
  const needsDefaults =
    !deps?.rewrite ||
    !deps?.dense ||
    !deps?.sparse ||
    !deps?.hydrate ||
    !deps?.rerank;
  const base = needsDefaults
    ? defaultDeps(input.userId, input.documentIds)
    : undefined;
  const rewriteFn = deps?.rewrite ?? base!.rewrite;
  const denseFn = deps?.dense ?? base!.dense;
  const sparseFn = deps?.sparse ?? base!.sparse;
  const hydrateFn = deps?.hydrate ?? base!.hydrate;
  const rerankFn = deps?.rerank ?? base!.rerank;

  const rewritten = (await rewriteFn(input.history, input.query)).trim();
  const q = rewritten || input.query;

  const [dense, sparse] = await Promise.all([denseFn(q), sparseFn(q)]);

  const fused = reciprocalRankFusion(
    [orderedIds(dense), orderedIds(sparse)],
    FUSE_K,
  ).slice(0, FUSE_TOP);

  const map = await hydrateFn(fused);

  const chunks: RetrievedChunk[] = [];
  for (const id of fused) {
    const c = map.get(id);
    if (c) chunks.push(c);
  }

  if (chunks.length === 0) {
    return { query: q, chunks: [], weakContext: true };
  }

  const reranked = await rerankFn(q, chunks, RERANK_TOP_N);
  const out: RetrievedChunk[] = reranked.map((r) => ({
    chunkId: r.chunkId,
    documentId: r.documentId,
    docName: r.docName,
    page: r.page,
    content: r.content,
    score: r.rerankScore,
  }));

  const weakContext =
    out.length === 0 || out[0]!.score < CONFIDENCE_THRESHOLD;

  return { query: q, chunks: out, weakContext };
}
