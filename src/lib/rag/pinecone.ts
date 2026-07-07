import { Pinecone } from "@pinecone-database/pinecone";

export interface IndexLike {
  namespace(ns: string): {
    upsert(vectors: unknown[]): Promise<unknown>;
    query(q: {
      vector: number[];
      topK: number;
      includeMetadata: boolean;
      filter?: Record<string, unknown>;
    }): Promise<{ matches?: { id: string }[] }>;
    deleteMany(filter: Record<string, unknown>): Promise<unknown>;
  };
}

let pineconeSingleton: Pinecone | undefined;
let indexSingleton: IndexLike | undefined;
let cachedIndexName: string | undefined;

type PineconeEnv = {
  PINECONE_API_KEY?: string;
  PINECONE_INDEX: string;
};

function loadEnv(): PineconeEnv {
  // require lazily so importing this module does not trigger env validation
  // (e.g. in tests that inject a fake index and never touch the real client).
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("~/server/env").env as PineconeEnv;
  } catch {
    // No CommonJS require in an ESM/tsx context (e.g. the readiness demo seed).
    // The values are already loaded onto process.env, so read them directly.
    const e = process.env as { PINECONE_API_KEY?: string; PINECONE_INDEX?: string };
    return { PINECONE_API_KEY: e.PINECONE_API_KEY, PINECONE_INDEX: e.PINECONE_INDEX ?? "chat-pdf-v2" };
  }
}

export function getPinecone(): Pinecone {
  if (!pineconeSingleton) {
    const env = loadEnv();
    pineconeSingleton = new Pinecone({ apiKey: env.PINECONE_API_KEY! });
  }
  return pineconeSingleton;
}

export function getIndex(): IndexLike {
  const env = loadEnv();
  if (!indexSingleton || cachedIndexName !== env.PINECONE_INDEX) {
    indexSingleton = getPinecone().Index(env.PINECONE_INDEX) as IndexLike;
    cachedIndexName = env.PINECONE_INDEX;
  }
  return indexSingleton;
}

export function namespaceFor(userId: string): string {
  return `user:${userId}`;
}

const UPSERT_BATCH_SIZE = 100;

export async function upsertChunks(
  namespace: string,
  records: { id: string; values: number[]; documentId: string; page: number }[],
  index: IndexLike = getIndex(),
): Promise<void> {
  const vectors = records.map((r) => ({
    id: r.id,
    values: r.values,
    metadata: { chunkId: r.id, documentId: r.documentId, page: r.page },
  }));
  const ns = index.namespace(namespace);
  for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
    await ns.upsert(vectors.slice(i, i + UPSERT_BATCH_SIZE));
  }
}

export async function denseQuery(
  namespace: string,
  vector: number[],
  topK: number,
  filter: Record<string, unknown> | undefined,
  index: IndexLike = getIndex(),
): Promise<{ id: string }[]> {
  const result = await index.namespace(namespace).query({
    vector,
    topK,
    includeMetadata: true,
    ...(filter ? { filter } : {}),
  });
  return (result.matches ?? []).map((m) => ({ id: m.id }));
}

export async function deleteByDocument(
  namespace: string,
  documentId: string,
  index: IndexLike = getIndex(),
): Promise<void> {
  try {
    await index.namespace(namespace).deleteMany({ documentId });
  } catch {
    // ignore not-found / already-deleted
  }
}
