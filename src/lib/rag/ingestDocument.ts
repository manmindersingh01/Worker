import { db } from "~/server/db";
import { getObjectBuffer } from "~/lib/s3";
import { parsePdf } from "./parse";
import { structureAwareChunk } from "./chunk";
import { embedTexts } from "./embed";
import { namespaceFor, upsertChunks } from "./pinecone";

/**
 * Ingest a single uploaded document end-to-end: fetch from S3 → parse → chunk →
 * embed → persist (Postgres chunks + Pinecone vectors) → mark READY.
 *
 * Runs as one continuous unit of work (~3-5s for a normal PDF). On any failure
 * the document is marked FAILED with the error. Idempotent via deterministic
 * chunk ids + skipDuplicates, so a re-run is safe.
 */
// Wrap a step so any failure is labelled with which stage/service broke.
async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`[${name}] ${msg}`);
  }
}

export async function ingestDocumentById(documentId: string): Promise<void> {
  const doc = await db.document.findUniqueOrThrow({ where: { id: documentId } });
  try {
    const buffer = await step("s3", () => getObjectBuffer(doc.url));
    const pages = await step("parse", () =>
      parsePdf(buffer, { fileName: doc.name }),
    );
    const raw = structureAwareChunk(pages, {
      maxTokens: 450,
      overlapRatio: 0.15,
    });
    const vectors = await step("embed", () =>
      embedTexts(raw.map((c) => c.content)),
    );

    await step("persist-pg", () =>
      db.chunk.createMany({
        data: raw.map((c, i) => ({
          id: `${doc.id}__${i}`,
          documentId: doc.id,
          page: c.page,
          section: c.section,
          chunkIndex: c.chunkIndex,
          content: c.content,
          contextual: null,
        })),
        skipDuplicates: true,
      }),
    );

    await step("persist-pinecone", () =>
      upsertChunks(
        namespaceFor(doc.userId),
        raw.map((c, i) => ({
          id: `${doc.id}__${i}`,
          values: vectors[i]!,
          documentId: doc.id,
          page: c.page,
        })),
      ),
    );

    await step("finalize", () =>
      db.document.update({
        where: { id: doc.id },
        data: {
          status: "READY",
          pageCount: pages.length,
          processedAt: new Date(),
        },
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.document.update({
      where: { id: doc.id },
      data: { status: "FAILED", error: msg.slice(0, 400) },
    });
    throw err;
  }
}
