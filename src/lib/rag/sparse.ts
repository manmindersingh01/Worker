import { Prisma } from "@prisma/client";
import type { Candidate } from "./types";

export interface DbLike {
  $queryRaw: (
    q: TemplateStringsArray,
    ...vals: unknown[]
  ) => Promise<{ id: string }[]>;
}

export async function sparseSearch(
  query: string,
  opts: { userId: string; documentIds?: string[] },
  db?: DbLike,
): Promise<Candidate[]> {
  try {
    const client = db ?? ((await import("~/server/db")).db as unknown as DbLike);

    const docFilter =
      opts.documentIds?.length
        ? Prisma.sql`AND "Chunk"."documentId" = ANY(${opts.documentIds})`
        : Prisma.empty;

    const sql = Prisma.sql`
      SELECT "Chunk"."id"
      FROM "Chunk"
      JOIN "Document" ON "Document"."id" = "Chunk"."documentId"
      WHERE "Document"."userId" = ${opts.userId}
        ${docFilter}
        AND "Chunk"."content_fts" @@ websearch_to_tsquery('english', ${query})
      ORDER BY ts_rank("Chunk"."content_fts", websearch_to_tsquery('english', ${query})) DESC
      LIMIT 40
    `;

    const rows = await (
      client.$queryRaw as unknown as (q: unknown) => Promise<{ id: string }[]>
    )(sql);

    return rows.map((r, rank) => ({ chunkId: r.id, rank }));
  } catch {
    // FTS must never crash a query
    return [];
  }
}
