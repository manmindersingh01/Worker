# Production-Grade Multi-PDF RAG — Design Spec

**Date:** 2026-06-08
**Status:** Approved (design) — pending implementation plan
**Scope:** Upgrade the existing PDF RAG chatbot in place into a production-grade, multi-PDF system with best-practice retrieval and a full UI redesign.

---

## 1. Goals & Non-Goals

### Goals
- Support **multiple PDFs of different kinds** per chat session (text reports, tables, scanned docs, slide decks), with cross-document querying and per-document attribution.
- Production-grade retrieval quality: layout-aware parsing, structure-aware chunking, contextual retrieval, hybrid search, reranking, query rewriting, citations + grounding.
- **Full UI redesign** with a cohesive design system, document management, citations UI, and proper loading/empty/error states.
- Measurable quality via a minimal eval harness.
- Robust ingestion that survives serverless timeouts and partial failures.

### Non-Goals
- No infra swap beyond what's listed (keep Next.js 15, Prisma/Postgres, Pinecone, OpenAI, Vercel AI SDK, UploadThing, NextAuth).
- No rewrite into a separate service. Ingestion becomes durable jobs (Inngest) but stays on the existing Vercel deployment.
- The legacy Gemini text-chat mode (`/api/chat2`, `/chatwithtext`) is out of scope for RAG changes; left functional, optionally restyled by the design system.
- No multi-tenancy/org features beyond the existing per-user model.

---

## 2. Locked Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Stack approach | Upgrade in place | Lowest risk; reuse auth/credits/upload. |
| Multi-PDF UX | Query-all by default **+ optional per-question document filter** | Best default with user control. |
| PDF parsing | **LlamaParse** + open-source fallback (`unpdf`/pdfjs) | Best quality on tables/scans/slides; fallback keeps ingestion resilient. |
| Reranker | **Cohere Rerank 3.5** | SOTA precision, low latency, simple API. |
| Hybrid keyword side | **Postgres full-text (tsvector)** | Reuse existing Postgres; `Chunk` table does double duty for citations. |
| Background jobs | **Inngest** | Durable, retryable steps on existing Vercel functions. |
| Embeddings | `text-embedding-3-large` @ **1536 dims** | ~all the quality, half the storage of 3072; requires fresh Pinecone index. |
| Vector layout | One Pinecone namespace **per user**, `documentId` **metadata filter** | Cross-document chat in one query + per-doc attribution; tenant isolation by namespace. |
| UI | Full redesign | Cohesive system, multi-PDF + citations. |

---

## 3. Current State (baseline)

- **Ingestion** (`src/server/pineconeDb.ts`): downloads PDFs, `PDFLoader` → strips newlines → `RecursiveCharacterTextSplitter` defaults → `ada-002` embeddings → Pinecone upsert into a namespace keyed off `removeNonAsciiChar(url[0])`. All PDFs land in the **first PDF's** namespace.
- **Retrieval** (`src/lib/context.ts`): embed query → Pinecone topK=5 → filter score ≥ 0.7 → concat to 3000 chars. No hybrid, no rerank.
- **Chat** (`src/app/api/pdfchat/route.ts`): uses `chatSession.pdfs[0].url` only → builds system prompt with context → `streamText(openai("gpt-3.5-turbo"))`. Only `role:"user"` messages forwarded. Credits deducted as `length/4`.
- **Schema** (`prisma/schema.prisma`): `PdfChatSession ↔ PDF` is already many-to-many; `Message` bridges text/pdf chats; `User.credits` default 300.
- **UI**: Google Docs iframe PDF viewer; `useChat` chat box; landing/upload/dashboard pages; Radix UI + Tailwind.

**Key defect:** schema is multi-PDF ready but retrieval is hardcoded to `pdfs[0]`. Quality knobs (chunking, embeddings, retrieval) are all at framework defaults.

---

## 4. Target Architecture

### 4.1 Data Model (Prisma additions)

```prisma
model Document {
  id           String          @id @default(cuid())
  pdfChatSessionId String
  userId       String
  name         String
  url          String          // UploadThing URL
  status       DocumentStatus  @default(PROCESSING)
  pageCount    Int?
  error        String?
  createdAt    DateTime        @default(now())
  processedAt  DateTime?
  session      PdfChatSession  @relation(fields: [pdfChatSessionId], references: [id], onDelete: Cascade)
  chunks       Chunk[]
  @@index([pdfChatSessionId])
  @@index([userId])
}

model Chunk {
  id          String   @id @default(cuid())   // also the Pinecone vector id
  documentId  String
  page        Int
  section     String?
  chunkIndex  Int
  content     String              // raw chunk text (source of truth)
  contextual  String?             // Anthropic contextual prefix
  // tsvector generated column + GIN index added via raw migration SQL
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  @@index([documentId])
}

enum DocumentStatus { PROCESSING READY FAILED }
```

- The existing `PDF` model is **migrated to / replaced by** `Document` (carries status + chunks). `PdfChatSession` keeps the relation.
- `Chunk.content` is the citation + keyword-search source of truth. A Postgres **generated `tsvector` column + GIN index** is added by a raw SQL migration (Prisma `Unsupported`), because Prisma can't model it natively.
- Pinecone stores only `{ vector, metadata: { chunkId, documentId, page } }`; full text lives in Postgres.

### 4.2 Ingestion Pipeline (Inngest, durable steps)

Triggered by an event sent from UploadThing `onUploadComplete` (one event per uploaded file). Each `step.run` is independently retryable and idempotent (deterministic chunk ids `documentId#index`):

1. **`parse`** — LlamaParse (async job, per-page markdown). On failure → fallback `unpdf`/pdfjs text-per-page. Emit elements with page numbers; keep tables intact.
2. **`chunk`** — structure-aware split (~400–500 tokens, ~15% overlap), tables as their own chunk. Attach `{documentId, page, section}`.
3. **`contextualize`** — for each chunk, one cheap LLM call (gpt mini, prompt-cached on the doc) to prepend a 1–2 sentence context blurb. Store in `Chunk.contextual`.
4. **`embed`** — `text-embedding-3-large` @ 1536 on `contextual + content`; batch.
5. **`persist`** — write `Chunk` rows to Postgres (text + tsvector) and upsert vectors to Pinecone (namespace = `user:{userId}`, metadata `{chunkId, documentId, page}`).
6. **`finalize`** — set `Document.status = READY`, `pageCount`, `processedAt`. Any step failure (after retries) → `status = FAILED`, `error`.

Client polls `GET /api/documents?sessionId=` (or subscribes) to render per-document status.

### 4.3 Retrieval Pipeline (per query)

`src/lib/rag/retrieve.ts` — given `(query, sessionId, documentIds?)`:

1. **Query rewrite** — rewrite the latest user message into a standalone query using recent history (resolves coreference). Cheap LLM call. Optionally expand into 2–3 sub-queries.
2. **Hybrid retrieve** (per rewritten/expanded query):
   - **Dense**: embed query (`3-large`@1536) → Pinecone query, namespace `user:{userId}`, `filter: documentId ∈ scope`, topK ~40.
   - **Sparse**: Postgres `websearch_to_tsquery` over `Chunk` for the same `documentId` scope, top ~40.
   - **Fuse** dense + sparse ranks with **RRF (k=60)**; dedupe by `chunkId`.
3. **Rerank** — fetch chunk text from Postgres for fused candidates → **Cohere Rerank 3.5** → keep top **~6**.
4. **Confidence gate** — if top reranker score < threshold (tuned on eval set), mark context weak → generation will abstain.
5. Return ordered chunks with `{documentId, docName, page, content, score}` for prompting + citations.

`documentIds` is `undefined` → query all docs in the session (default). UI can pass a subset (scope selector).

### 4.4 Generation (`src/app/api/pdfchat/route.ts` rewrite)

- Build a grounding system prompt: answer **only** from provided context; cite each claim as `[docName p.N]`; if context is weak/absent, say you don't know.
- Include full prior turns (user + assistant) for conversational coherence (fixes current user-only bug).
- `streamText(openai("gpt-4o-mini" or configured model))`, temperature ~0.2 for grounded answers.
- **Citations** streamed alongside text via Vercel AI SDK **v5 data parts** (`createUIMessageStream` + `writer.write({type:'data-sources', ...})`). Requires migrating from the current v4 `toDataStreamResponse` API.
- **Post-hoc citation verification**: parse cited chunk refs from the answer, confirm each maps to a retrieved chunk; drop/flag fabricated citations before returning sources.
- Credits: keep existing system but base usage on a closer token estimate (tokenizer) rather than `length/4`. (Minor; not core.)

### 4.5 Eval Harness (`eval/`)

- Golden set: ~30–50 `(question, relevant chunkIds, ideal answer)` over a handful of representative PDFs committed to the repo.
- Script runs the full retrieval+generation pipeline and reports **recall@k**, **MRR**, and RAGAS-style **faithfulness** + **answer relevance**.
- Run manually before/after retrieval changes; document baseline numbers. (CI wiring optional.)

---

## 5. UI Redesign

A cohesive design system (tokens: color, type scale, spacing, radii, shadows; built on existing Tailwind + Radix). Key surfaces:

- **Upload / new chat**: multi-file dropzone, per-file upload + parsing **status chips** (processing/ready/failed with retry), drag-reorder, validation, empty/error states.
- **Document manager**: list of session documents with status, page counts, remove, and the **scope selector** (checkbox set) that drives per-question document filtering.
- **Chat**: redesigned message list with streamed markdown, **inline citation chips** (`[docName p.N]`) that, on click, open a **source panel** showing the cited chunk + jump-to-page in the viewer. "Thinking/retrieving" states. "I don't know / low confidence" rendered distinctly.
- **PDF viewer**: keep iframe approach initially but support multiple documents (tabs/switcher) and page jump from citations. (Viewer engine upgrade is a stretch goal, not required.)
- **Global**: responsive (mobile usable), loading skeletons, toasts, accessible (focus states, keyboard nav), dark/light consistent with tokens.
- Landing/dashboard restyled to the new system (light touch).

The detailed visual design is produced during implementation via the `frontend-design` skill; this spec fixes the surfaces, states, and interactions, not pixel-level visuals.

---

## 6. Configuration / New Env Vars

Add to `.env.example` and `src/server/env.js` validation:

```
OPENAI_API_KEY=          # embeddings + generation (already used, now validated)
PINECONE_API_KEY=        # already used, now validated
LLAMA_CLOUD_API_KEY=     # LlamaParse
COHERE_API_KEY=          # Rerank 3.5
INNGEST_EVENT_KEY=       # Inngest
INNGEST_SIGNING_KEY=     # Inngest
PINECONE_INDEX=          # new index name for 3-large@1536 (e.g. "chat-pdf-v2")
```

A new Pinecone index (dimension 1536, metric cosine) is required; the old `chat-pdf` (1536/ada) is abandoned. Existing sessions' vectors are not migrated (acceptable — re-upload, or a one-off backfill script if needed).

---

## 7. Module Boundaries (new/changed files)

```
src/lib/rag/
  parse.ts          # LlamaParse + fallback → per-page elements
  chunk.ts          # structure-aware chunking + metadata
  contextualize.ts  # Anthropic contextual prefix
  embed.ts          # 3-large@1536 (replaces lib/emmebding.ts)
  hybrid.ts         # dense (Pinecone) + sparse (Postgres FTS) + RRF
  rerank.ts         # Cohere Rerank 3.5
  rewrite.ts        # history-aware query rewrite + expansion
  retrieve.ts       # orchestrates rewrite→hybrid→rerank→gate (replaces lib/context.ts)
  citations.ts      # parse + verify citations
src/inngest/
  client.ts
  ingest.ts         # the durable ingestion function
src/app/api/
  pdfchat/route.ts      # rewritten: full history, retrieve.ts, v5 data-parts citations
  documents/route.ts    # list/status/delete documents for a session
  inngest/route.ts      # Inngest serve endpoint
  upload/route.tsx      # creates Document(PROCESSING) + sends Inngest event
eval/
  golden.json, run.ts, metrics.ts
prisma/
  schema.prisma + raw SQL migration for tsvector/GIN
```

Each module is independently testable: deterministic inputs/outputs, no hidden shared state. `retrieve.ts` is the single public retrieval entrypoint; the API route depends only on it.

---

## 8. Error Handling & Failure Modes

- **Parsing fails** → fallback parser; if both fail → `Document.FAILED` with error surfaced in UI + retry button. Other documents in the session remain usable.
- **Inngest step fails** → automatic retries; idempotent steps (deterministic chunk ids) make re-runs safe. Partial ingest never leaves orphaned half-state visible (status stays PROCESSING until finalize).
- **Reranker/LLM API down** → degrade gracefully: skip rerank (use RRF order), or return a clear error rather than a hallucinated answer.
- **Weak retrieval** → confidence gate → "I couldn't find this in your documents" instead of guessing.
- **Empty session / all docs processing** → chat input disabled with explanatory state.
- **Citation verification** → fabricated citations stripped before display.

Trade-offs named: LlamaParse + contextualization add ingest latency/cost (one-time per doc) in exchange for large query-time quality gains. Hybrid + rerank add ~100–300ms and per-query cost for materially better precision and fewer hallucinations. Inngest adds a dependency in exchange for durability/retries we'd otherwise hand-roll.

---

## 9. Rollout / Sequencing (high level — detailed plan follows)

1. Schema + migrations (`Document`, `Chunk`, tsvector) and env/config.
2. Ingestion: parse → chunk → contextualize → embed → persist (Inngest), with status API.
3. Retrieval: hybrid + rerank + rewrite + gate (`retrieve.ts`) + eval harness baseline.
4. Generation rewrite with citations (AI SDK v5 migration).
5. Multi-PDF wiring end-to-end (scope filter).
6. UI redesign across upload/manager/chat/citations.
7. Eval pass + tuning (thresholds, alpha/k, topN/K).

---

## 10. Open Risks

- **AI SDK v4→v5 migration** touches the chat client/server contract; verify streaming + existing credit/error handling still work.
- **LlamaParse async** latency for large PDFs — mitigated by Inngest + status UI.
- **Postgres FTS quality** is BM25/ts_rank (weaker than learned sparse) — acceptable; revisit with Pinecone sparse index if eval shows a gap.
- **Re-embedding**: new index means existing uploaded sessions lose retrieval until re-ingested. Acceptable per scope; optional backfill script.
