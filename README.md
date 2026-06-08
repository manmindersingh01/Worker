# Worker

Chat with your PDFs. Upload one or more documents, ask questions, and get answers grounded in the actual content through a production-grade retrieval-augmented generation (RAG) pipeline with verified inline citations. A separate text-chat mode talks to a general model without document grounding.

Live: https://worker-mocha.vercel.app

## What it does

Two modes share one app:

**PDF chat.** Upload PDFs into a chat session. Ingestion runs as a durable background job (Inngest) that parses, chunks, contextualizes, embeds, and indexes every page. When you ask a question, a hybrid retriever (dense + sparse) fuses and reranks candidates, gates on confidence, and streams a grounded answer with `[DocName p.N]` citations that are verified against the retrieved chunks.

**Text chat.** A second route for general questions with no document grounding, backed by Postgres-stored conversation history.

Sessions and messages persist in Postgres (PDF-chat turns included). Auth is Discord OAuth via NextAuth. Each account starts with 300 credits, deducted per turn by input length.

## Architecture

### Ingestion (durable, `src/inngest/ingest.ts`)

Triggered after upload; each step is independently retried by Inngest so a transient failure never restarts the whole job.

```
upload (uploadthing) → Inngest ingest job
  → parse:        LlamaParse (LLAMA_CLOUD_API_KEY) with unpdf fallback on error
  → chunk:        structure-aware chunking (src/lib/rag/chunk.ts), page-aware
  → contextualize: per-chunk contextual prefix (doc-aware) for better recall
  → embed:        text-embedding-3-large @ 1536 dims (src/lib/rag/embed.ts)
  → persist:      Postgres `Chunk` rows (content + contextual + page/section)
  → index:        Pinecone upsert, namespace = `user:<userId>`, metadata {documentId, page}
  → finalize:     Document.status = READY
```

Postgres holds the canonical chunk text (and a generated `tsvector` FTS column with a GIN index); Pinecone holds the dense vectors. Document status is surfaced live in the UI.

### Retrieval (`src/lib/rag/retrieve.ts`)

```
history-aware rewrite (gpt-4o-mini)         → standalone query
  → dense  search: Pinecone, namespace user:<userId>, filter documentId ∈ scope
  → sparse search: Postgres full-text search over Chunk.content_fts
  → reciprocal rank fusion (RRF, k=60) of the two candidate lists
  → hydrate fused ids → chunk text from Postgres
  → Cohere rerank (COHERE_API_KEY), top N = 6
  → confidence gate (threshold 0.2): below → weakContext flag set
```

A weak-context result tells the model to prefer "the documents don't cover this" over guessing.

### Generation (`src/app/api/pdfchat/route.ts`)

Reranked chunks become the system-prompt context. `gpt-4o-mini` streams the answer (temperature 0.2) via the Vercel AI SDK; source chips stream to the client as a custom data part. On finish, citations are parsed and verified against the retrieved chunks, and both the user message and the assistant reply are persisted as `Message` rows on the PDF chat session.

### Multi-PDF scoping

Vectors are isolated per user via a Pinecone namespace (`user:<userId>`), and each vector carries a `documentId` in its metadata. A session can hold multiple documents; the scope selector passes `documentIds` from the client, which becomes a `{ documentId: { $in: [...] } }` Pinecone metadata filter so questions can target one document, several, or all in the session.

### Credits

Cost per turn = `inputLength / 4` (rough token approximation). Checked before the model call, deducted after. A 402 `INSUFFICIENT_CREDITS` surfaces in the UI as a toast. Credit bookkeeping is non-fatal — it never blocks the stream.

## Environment variables

Copy `.env.example` to `.env` and fill these in. The validated schema lives in `src/server/env.js`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string (Prisma). |
| `AUTH_SECRET` | prod | NextAuth session/JWT secret. Generate with `npx auth secret`. Optional in dev. |
| `AUTH_DISCORD_ID` | yes | Discord OAuth client ID for NextAuth. |
| `AUTH_DISCORD_SECRET` | yes | Discord OAuth client secret for NextAuth. |
| `OPENAI_API_KEY` | yes | Embeddings (`text-embedding-3-large`), query rewrite + generation (`gpt-4o-mini`). |
| `PINECONE_API_KEY` | yes | Pinecone vector store access. |
| `PINECONE_INDEX` | yes | Pinecone index name (defaults to `chat-pdf-v2`). Must be a **1536-dim, cosine** index. |
| `LLAMA_CLOUD_API_KEY` | yes | LlamaParse PDF parsing (falls back to `unpdf` if missing/erroring). |
| `COHERE_API_KEY` | yes | Cohere reranker in the retrieval pipeline. |
| `INNGEST_EVENT_KEY` | yes | Inngest event ingestion key for the durable ingest job. |
| `INNGEST_SIGNING_KEY` | yes | Inngest request-signing key. |
| `UPLOADTHING_TOKEN` | yes | uploadthing file uploads. Read at runtime by the uploadthing SDK (not in the validated schema). |

> The RAG keys are typed `optional()` in the schema so the app builds without them, but PDF chat will not function until they are set.

## Setup

Requires Node 20+, a PostgreSQL database, and a Pinecone index.

```bash
git clone https://github.com/manmindersingh01/Worker.git
cd Worker
npm install
cp .env.example .env        # fill in the variables above
```

1. **Create the Pinecone index** named to match `PINECONE_INDEX` with **dimension 1536** and **cosine** metric.
2. **Apply migrations:**
   ```bash
   npx prisma migrate deploy
   ```
3. **Run the Inngest dev server** (durable ingest) in one terminal:
   ```bash
   npx inngest-cli@latest dev
   ```
   It auto-discovers the app at `/api/inngest`.
4. **Run the app** in another terminal:
   ```bash
   npm run dev
   ```

Open the app, sign in with Discord, create a PDF chat session, and upload a document. Ingestion progress is shown live; once the document is READY you can ask grounded questions.

## Testing & evaluation

```bash
npm test        # vitest unit suite (RAG pipeline: chunk, embed, dense, sparse, rrf, rerank, citations, retrieve, …)
npm run eval    # retrieval eval harness over eval/golden.json (recall@k, MRR)
```

The eval harness (`eval/`) scores retrieval against a golden set. A live baseline is pending real API keys (Pinecone/OpenAI/Cohere); see `eval/README.md`.

## Tech stack

Next.js 15 (App Router), TypeScript, Prisma 6 + PostgreSQL, NextAuth (Discord), Inngest (durable ingestion), Pinecone (dense vectors), Postgres FTS (sparse), OpenAI (`text-embedding-3-large` + `gpt-4o-mini`), Cohere (rerank), LlamaParse + unpdf (parsing), Vercel AI SDK (streaming), uploadthing, Tailwind, Radix UI.
