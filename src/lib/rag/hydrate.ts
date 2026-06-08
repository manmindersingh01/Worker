import type { RetrievedChunk } from "./types";

export interface HydrateDbLike {
  chunk: {
    findMany: (args: {
      where: { id: { in: string[] } };
      select: unknown;
    }) => Promise<
      {
        id: string;
        content: string;
        page: number;
        documentId: string;
        document: { name: string };
      }[]
    >;
  };
}

export async function hydrateChunks(
  chunkIds: string[],
  db?: HydrateDbLike,
): Promise<Map<string, RetrievedChunk>> {
  const client =
    db ?? ((await import("~/server/db")).db as unknown as HydrateDbLike);

  const rows = await client.chunk.findMany({
    where: { id: { in: chunkIds } },
    select: {
      id: true,
      content: true,
      page: true,
      documentId: true,
      document: { select: { name: true } },
    },
  });

  const map = new Map<string, RetrievedChunk>();
  for (const r of rows) {
    map.set(r.id, {
      chunkId: r.id,
      documentId: r.documentId,
      docName: r.document.name,
      page: r.page,
      content: r.content,
      score: 0,
    });
  }
  return map;
}
