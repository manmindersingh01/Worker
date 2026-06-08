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
}
