import type { Candidate } from "./types";
import { embedText } from "./embed";
import { denseQuery, namespaceFor, getIndex, type IndexLike } from "./pinecone";

export async function denseSearch(
  query: string,
  opts: { userId: string; documentIds?: string[] },
  deps?: {
    embed?: (t: string) => Promise<number[]>;
    index?: IndexLike;
    topK?: number;
  },
): Promise<Candidate[]> {
  try {
    const embed = deps?.embed ?? embedText;
    const index = deps?.index ?? getIndex();
    const topK = deps?.topK ?? 40;

    const vec = await embed(query);
    const filter = opts.documentIds?.length
      ? { documentId: { $in: opts.documentIds } }
      : undefined;

    const results = await denseQuery(
      namespaceFor(opts.userId),
      vec,
      topK,
      filter,
      index,
    );

    return results.map((r, rank) => ({ chunkId: r.id, rank }));
  } catch (err) {
    // Vector search must never crash retrieval. A missing/misconfigured index,
    // an embedding hiccup, or a quota error degrades to lexical (sparse) search
    // rather than returning nothing - mirrors sparseSearch's own guard.
    console.warn(
      "[dense] vector search failed - falling back to sparse only",
      err,
    );
    return [];
  }
}
