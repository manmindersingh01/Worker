# Worker

Chat with your PDFs. Upload one or more documents, ask questions, and get answers grounded in the actual content through a production-grade retrieval-augmented generation (RAG) pipeline with verified inline citations. A separate text-chat mode talks to a general model without document grounding.

Live: https://rag.devsingh.live

## What it does

Two modes share one app:

**PDF chat.** Upload PDFs into a chat session. Ingestion runs inline on upload — it parses, chunks, embeds, and indexes every page. When you ask a question, a hybrid retriever (dense + sparse) fuses and reranks candidates, gates on confidence, and streams a grounded answer with `[DocName p.N]` citations that are verified against the retrieved chunks.

**Text chat.** A second route for general questions with no document grounding, backed by Postgres-stored conversation history.

**Readiness check.** A proactive layer over the same retrieval engine: instead of waiting for a question, it audits a document set against a jurisdiction blueprint (first: India / CDSCO) and returns a deterministic readiness score, a per-category breakdown, and a gap list where every finding links to its exact source page. See [Readiness check](#readiness-check-srclibreadiness).

Sessions and messages persist in Postgres (PDF-chat turns included). Auth is email/password (NextAuth Credentials provider); a shared demo login is available. Each account starts with 300 credits, deducted per turn by input length (a readiness run costs a fixed 15).

## Architecture

### Ingestion (`src/lib/rag/ingestDocument.ts`)

Runs inline on upload (`src/app/api/upload/route.tsx` awaits it; ~3-5s for a normal PDF) as one continuous unit of work. On any failure the document is marked `FAILED` with a stage-labelled error; it is idempotent via deterministic chunk ids, so a re-run is safe. (An Inngest handler wrapping the same function also exists at `src/inngest/ingest.ts` for a durable path.)

```
upload → ingestDocumentById
  → fetch:    pull the object from S3
  → parse:    unpdf fast text extraction; LlamaParse OCR fallback only for scanned/image PDFs (LLAMA_CLOUD_API_KEY)
  → chunk:    structure-aware, page-aware chunking (src/lib/rag/chunk.ts)
  → embed:    text-embedding-3-large @ 1024 dims via Matryoshka (src/lib/rag/embed.ts)
  → persist:  Postgres `Chunk` rows (content + page/section)
  → index:    Pinecone upsert, namespace = `user:<userId>`, metadata {documentId, page}
  → finalize: Document.status = READY
```

Postgres holds the canonical chunk text (and a generated `tsvector` FTS column with a GIN index); Pinecone holds the dense vectors. Document status is surfaced live in the UI.

### Retrieval (`src/lib/rag/retrieve.ts`)

```
history-aware rewrite (gpt-4o-mini)         → standalone query
  → dense  search: Pinecone, namespace user:<userId>, filter documentId ∈ scope
  → sparse search: Postgres full-text search over Chunk.content_fts
  → reciprocal rank fusion (RRF, k=60) of the two candidate lists
  → hydrate fused ids → chunk text from Postgres
  → Cohere rerank (COHERE_API_KEY), top N = 6 — falls back to fusion order if unset
  → confidence gate (threshold 0.2): below → weakContext flag set
```

Each arm is isolated: if the dense (vector) arm fails — a missing index, an embedding hiccup, a quota error — retrieval degrades to sparse (lexical) search instead of returning nothing. A weak-context result tells the model to prefer "the documents don't cover this" over guessing.

### Generation (`src/app/api/pdfchat/route.ts`)

Reranked chunks become the system-prompt context. `gpt-4o-mini` streams the answer (temperature 0.2) via the Vercel AI SDK; source chips stream to the client as a custom data part. On finish, citations are parsed and verified against the retrieved chunks, and both the user message and the assistant reply are persisted as `Message` rows on the PDF chat session.

### Multi-PDF scoping

Vectors are isolated per user via a Pinecone namespace (`user:<userId>`), and each vector carries a `documentId` in its metadata. A session can hold multiple documents; the scope selector passes `documentIds` from the client, which becomes a `{ documentId: { $in: [...] } }` Pinecone metadata filter so questions can target one document, several, or all in the session.

### Credits

Cost per turn = `inputLength / 4` (rough token approximation). Checked before the model call, deducted after. A 402 `INSUFFICIENT_CREDITS` surfaces in the UI as a toast. Credit bookkeeping is non-fatal — it never blocks the stream.

## Readiness check (`src/lib/readiness/`)

The RAG app above is reactive: it answers what you ask and has no opinion on whether a document set is complete.
The readiness feature adds a proactive layer on top of the exact same retrieval engine.
Instead of waiting for a question, it checks a document set against a jurisdiction blueprint (the "definition of done") and reports how ready the package is, what is missing, and why - with a citation for every finding.

The first blueprint is India (CDSCO): the essential documents for a new-drug clinical trial under the New Drugs and Clinical Trials Rules, 2019.
Adding another jurisdiction is a matter of authoring one more `Blueprint` file; nothing else in the pipeline changes.

```
POST /api/readiness { sessionId }
  → LangGraph coordinator (src/lib/readiness/graph.ts)
    → load:     resolve blueprint + document scope, log the run start
    → assess:   for EACH blueprint item (bounded concurrency):
                  retrieve() on the item's query  →  grounded LLM judge
                  → PRESENT | PARTIAL | MISSING | NEEDS_REVIEW
                  citations verified against retrieved chunks (no invented pages)
    → tally:    deterministic weighted score, overall + per-category (plain math)
    → explain:  rank gaps by readiness cost → headline + top-3 fixes
    → finalize: persist score + summary
```

- **Honesty over optimism.** Weak or ambiguous evidence yields `NEEDS_REVIEW`, not a guess, and any `PRESENT`/`PARTIAL` verdict must be backed by a citation that verifies against a real retrieved chunk - otherwise it is downgraded. That provenance is what makes the output audit-ready.
- **Deterministic scoring.** The percentage is weight-normalised math (`src/lib/readiness/score.ts`), so the same verdicts always produce the same number. `NEEDS_REVIEW` earns no credit but stays in the denominator: unverified is not the same as complete.
- **Audit trail.** The run row, its per-item verdicts, and the coordinator's per-node events (`ReadinessRun` / `ReadinessItemResult` / `ReadinessEvent`) are a durable record of exactly what the app did.
- **Dashboard.** The workspace right pane toggles Chat / Readiness. The dashboard shows a score gauge, a per-category breakdown, and a gap list; clicking a gap jumps the shared PDF viewer to the exact cited page (`#page=N`).

### Demo package

`npm run seed:readiness` builds a realistic (fictional) CDSCO site package as real PDFs, uploads them, and runs the real ingestion pipeline against a dedicated demo user, so the whole flow works with no live uploading.
It requires the readiness migration to be applied and the same env as the app.
The package is deliberately incomplete, so a check lands on a grounded "not ready" score with India-specific gaps (CTRI registration, audio-visual consent, injury/death compensation, local-language consent, insurance).

## Environment variables

Copy `.env.example` to `.env` and fill these in. The validated schema lives in `src/server/env.js`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string (Prisma, pooled). |
| `DIRECT_URL` | migrations | Direct (unpooled) PostgreSQL URL for `prisma migrate`. On Neon, use the non-`-pooler` host. |
| `AUTH_SECRET` | prod | NextAuth session/JWT secret. Generate with `npx auth secret`. Optional in dev. |
| `OPENAI_API_KEY` | yes | Embeddings (`text-embedding-3-large` @ 1024) + query rewrite/generation/judge (`gpt-4o-mini`). |
| `PINECONE_API_KEY` | yes | Pinecone access. Must be the account/project that **owns the index holding your vectors**. |
| `PINECONE_INDEX` | no | Index name; defaults to `chat-pdf-v2`. Index must be **1024-dim, cosine**. |
| `S3_BUCKET_NAME` | yes | S3 bucket for uploaded PDFs (stored + served via presigned URLs). |
| `AWS_REGION` | yes | Region of the S3 bucket. |
| `AWS_ACCESS_KEY_ID` | yes* | S3 access key. *Optional if the default AWS credential chain is available (`AWS_PROFILE` / IAM role). |
| `AWS_SECRET_ACCESS_KEY` | yes* | S3 secret key. See above. |
| `COHERE_API_KEY` | no | Cohere reranker; retrieval falls back to fusion order if unset. |
| `LLAMA_CLOUD_API_KEY` | no | LlamaParse OCR for scanned PDFs; `unpdf` handles text-layer PDFs without it. |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | no | Only for the optional Inngest durable-ingest path (`src/inngest`). |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | no | Legacy Discord OAuth; the app signs in with email/password. |

> The RAG/storage keys are typed `optional()` in the schema so the app builds without them, but PDF chat and readiness will not function until `OPENAI_API_KEY`, `PINECONE_API_KEY`, and the S3 vars are set. **`PINECONE_API_KEY` and `PINECONE_INDEX` must resolve to the index that actually holds your embeddings** — a valid-but-wrong Pinecone account returns zero results (retrieval silently finds nothing).

## Setup

Requires Node 20+, a PostgreSQL database, and a Pinecone index.

```bash
git clone https://github.com/manmindersingh01/Worker.git
cd Worker
npm install
cp .env.example .env        # fill in the variables above
```

1. **Create the Pinecone index** named to match `PINECONE_INDEX` (default `chat-pdf-v2`) with **dimension 1024** and **cosine** metric. The dimension must match the embedder (`text-embedding-3-large` @ 1024); a mismatched index silently returns no results.
2. **Apply migrations:**
   ```bash
   npx prisma migrate deploy
   ```
3. **Run the app:**
   ```bash
   npm run dev
   ```

Open the app, sign in (email/password, or the demo login), create a PDF chat session, and upload a document. Ingestion runs inline and status is shown live; once the document is READY you can ask grounded questions.

> **Deploying?** Set the same env vars in your host (e.g. Vercel → Settings → Environment Variables → **Production**), then trigger a **fresh** deploy — env changes don't apply to an already-built deployment. `PINECONE_API_KEY` and `OPENAI_API_KEY` must point at the account/project that actually holds your vectors, or retrieval returns nothing.

### Readiness demo

Seed the pre-loaded CDSCO readiness package (needs the app env + the readiness migration applied):

```bash
npm run seed:readiness      # builds real PDFs, ingests them, prints demo credentials + the /pdfchat/<sessionId> to open
npm run verify:readiness    # runs the real coordinator offline and prints the score, per-category breakdown, and every gap's citation
```

## Testing & evaluation

```bash
npm test        # vitest unit suite (RAG pipeline + readiness: blueprint, score, assessor, explainer, coordinator, serialize)
npm run eval    # retrieval eval harness over eval/golden.json (recall@k, MRR)
```

The eval harness (`eval/`) scores retrieval against a golden set. A live baseline is pending real API keys (Pinecone/OpenAI/Cohere); see `eval/README.md`.

## Tech stack

Next.js 15 (App Router), TypeScript, Prisma 6 + PostgreSQL, NextAuth (email/password Credentials), S3 (PDF storage), Pinecone (dense vectors), Postgres FTS (sparse), OpenAI (`text-embedding-3-large` @ 1024 + `gpt-4o-mini`), Cohere (rerank), unpdf + LlamaParse (parsing), LangGraph (readiness coordinator), Vercel AI SDK (streaming), Recharts (dashboard), Tailwind, Radix UI.
