import { inngest } from "~/inngest/client";
import { db } from "~/server/db";
import { parsePdf } from "~/lib/rag/parse";
import { structureAwareChunk } from "~/lib/rag/chunk";
import {
  contextualizeChunk,
  defaultContextLlm,
} from "~/lib/rag/contextualize";
import { embedTexts } from "~/lib/rag/embed";
import { namespaceFor, upsertChunks } from "~/lib/rag/pinecone";
import { getObjectBuffer } from "~/lib/s3";
import type { ParsedPage, RawChunk } from "~/lib/rag/types";

type LoadedDoc = { id: string; url: string; name: string; userId: string };

/** Run an async mapper over items with a bounded concurrency. */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const i = cursor++;
        results[i] = await fn(items[i]!, i);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

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

    const doc = await step.run("load", async (): Promise<LoadedDoc> => {
      const d = await db.document.findUniqueOrThrow({
        where: { id: documentId },
      });
      return { id: d.id, url: d.url, name: d.name, userId: d.userId };
    });

    const pages = (await step.run(
      "parse",
      async (): Promise<ParsedPage[]> => {
        const buffer = await getObjectBuffer(doc.url);
        return parsePdf(buffer, { fileName: doc.name });
      },
    )) as ParsedPage[];

    const raw = (await step.run("chunk", async (): Promise<RawChunk[]> => {
      return structureAwareChunk(pages, { maxTokens: 450, overlapRatio: 0.15 });
    })) as RawChunk[];

    const contextualStrings = await step.run(
      "contextualize",
      async (): Promise<string[]> => {
        return mapWithConcurrency(raw, 5, (c) =>
          contextualizeChunk(doc.name, c.content, defaultContextLlm),
        );
      },
    );

    const vectors = await step.run("embed", async (): Promise<number[][]> => {
      return embedTexts(contextualStrings);
    });

    await step.run("persist", async () => {
      await db.chunk.createMany({
        data: raw.map((c, i) => ({
          id: `${doc.id}__${i}`,
          documentId: doc.id,
          page: c.page,
          section: c.section,
          chunkIndex: c.chunkIndex,
          content: c.content,
          contextual: contextualStrings[i],
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
    });

    await step.run("finalize", async () => {
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
