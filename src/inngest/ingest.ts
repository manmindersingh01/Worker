import { inngest } from "~/inngest/client";
import { ingestDocumentById } from "~/lib/rag/ingestDocument";

// NOTE: ingestion now runs inline in /api/upload via after(); this Inngest
// function is kept (dormant — no events are sent) as an optional durable path
// and shares the same ingestion logic. Re-enable by sending the event again.
export const ingestDocument = inngest.createFunction(
  { id: "ingest-document", triggers: [{ event: "document/uploaded" }] },
  async ({ event, step }) => {
    const documentId = event.data.documentId as string;
    await step.run("ingest", () => ingestDocumentById(documentId));
  },
);
