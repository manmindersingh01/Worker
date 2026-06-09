import { serve } from "inngest/next";
import { inngest } from "~/inngest/client";
import { ingestDocument } from "~/inngest/ingest";

// Ingestion steps (LlamaParse upload+poll, embeddings) can take well over the
// Vercel Hobby default of 10s. 60s is the Hobby maximum; Pro allows up to 300.
export const maxDuration = 60;
export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ingestDocument],
});
