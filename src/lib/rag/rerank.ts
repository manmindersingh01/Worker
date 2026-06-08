import { CohereClientV2 } from "cohere-ai";

export interface CohereLike {
  v2: {
    rerank: (a: {
      model: string;
      query: string;
      documents: string[];
      topN: number;
    }) => Promise<{ results: { index: number; relevanceScore: number }[] }>;
  };
}

const MODEL = "rerank-v3.5";

function fallback<T extends { content: string }>(
  docs: T[],
  topN: number,
): (T & { rerankScore: number })[] {
  return docs.slice(0, topN).map((d) => ({ ...d, rerankScore: 0 }));
}

export async function rerank<T extends { content: string }>(
  query: string,
  docs: T[],
  topN: number,
  client?: CohereLike,
): Promise<(T & { rerankScore: number })[]> {
  let c = client;
  if (!c) {
    const { env } = await import("~/server/env");
    if (!env.COHERE_API_KEY) {
      console.warn(
        "[rerank] COHERE_API_KEY missing — falling back to original order",
      );
      return fallback(docs, topN);
    }
    c = new CohereClientV2({
      token: env.COHERE_API_KEY,
    }) as unknown as CohereLike;
  }

  try {
    const res = await c.v2.rerank({
      model: MODEL,
      query,
      documents: docs.map((d) => d.content),
      topN,
    });
    return res.results
      .slice(0, topN)
      .map((r) => ({ ...docs[r.index], rerankScore: r.relevanceScore }));
  } catch (err) {
    console.warn("[rerank] cohere rerank failed — falling back", err);
    return fallback(docs, topN);
  }
}
