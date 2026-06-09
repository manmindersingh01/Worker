import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { parsePdf } from "~/lib/rag/parse";
import { structureAwareChunk } from "~/lib/rag/chunk";
import { embedTexts } from "~/lib/rag/embed";
import { namespaceFor, upsertChunks } from "~/lib/rag/pinecone";
import { getObjectBuffer } from "~/lib/s3";

export const ingestDocument = inngest.createFunction(
  {
    id: "ingest-document",
    triggers: [{ event: "document/uploaded" }],
    onFailure: async ({ event, error }) => {
      const documentId = (event.data.event.data as { documentId?: string })
        .documentId;
      if (!documentId) return;
      await db.document.update({
        where: { id: documentId },
        data: { status: "FAILED", error: error.message },
      });
    },
  },
  async ({ event, step }) => {
    const documentId = event.data.documentId as string;

    // ONE durable step for the whole pipeline. The actual work is only a few
    // seconds; splitting it into many steps just multiplied Vercel cold-starts
    // + Inngest round-trips (the real cause of slow ingestion). Deterministic
    // chunk ids + skipDuplicates keep a retry of this step idempotent.
    await step.run("ingest", async () => {
      const doc = await db.document.findUniqueOrThrow({
        where: { id: documentId },
      });

      const buffer = await getObjectBuffer(doc.url);
      const pages = await parsePdf(buffer, { fileName: doc.name });
      const raw = structureAwareChunk(pages, {
        maxTokens: 450,
        overlapRatio: 0.15,
      });
      const vectors = await embedTexts(raw.map((c) => c.content));

      await db.chunk.createMany({
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
      });

      await upsertChunks(
        namespaceFor(doc.userId),
        raw.map((c, i) => ({
          id: `${doc.id}__${i}`,
          values: vectors[i]!,
          documentId: doc.id,
          page: c.page,
        })),
      );

      await db.document.update({
        where: { id: doc.id },
        data: {
          status: "READY",
          pageCount: pages.length,
          processedAt: new Date(),
        },
      });
    });
  },
);
