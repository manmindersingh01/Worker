# Production-Grade Multi-PDF RAG — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-PDF RAG chatbot into a production-grade multi-PDF system: layout-aware ingestion, hybrid retrieval + reranking + citations, durable background jobs, and a redesigned UI.

**Architecture:** Upgrade in place (Next.js 15 / Prisma+Postgres / Pinecone / OpenAI / Vercel AI SDK / UploadThing). New `src/lib/rag/*` library of small, independently-testable modules is the core. Ingestion runs as durable Inngest steps writing chunks to Postgres (source of truth + full-text) and vectors to a new Pinecone index. Retrieval = rewrite → hybrid (dense+FTS, RRF) → Cohere rerank → confidence gate. Generation streams grounded answers with verified `[doc p.N]` citations.

**Tech Stack:** TypeScript, Next.js App Router, Prisma/PostgreSQL (pgvector NOT required — dense stays in Pinecone), Pinecone, OpenAI (`text-embedding-3-large`, gpt-4o-mini), LlamaParse (`llama-cloud-services`), Cohere Rerank 3.5 (`cohere-ai`), Inngest, Vercel AI SDK v5 (`ai`), Vitest for unit tests.

**Reference spec:** `docs/superpowers/specs/2026-06-08-production-rag-multipdf-design.md`

---

## Conventions

- **Tests:** Vitest (`npm i -D vitest`). Test files colocated as `*.test.ts`. Run `npx vitest run <file>`.
- **Pure-first:** All ranking/parsing/formatting logic is pure functions unit-tested without network. External calls (OpenAI, Pinecone, Cohere, LlamaParse) live behind thin adapter modules with injectable clients so tests use fakes.
- **Commits:** One commit per task. Conventional commits.
- **Branch:** Work on `feat/production-rag` (created at execution start).
- **Vector id convention:** `chunk.id` (cuid) is the Pinecone vector id. Pinecone metadata = `{ chunkId, documentId, page }` only; text lives in Postgres `Chunk.content`.
- **Namespace convention:** `user:{userId}` per user.

---

## File Structure

```
src/lib/rag/
  types.ts          # shared types: ParsedPage, RawChunk, EmbeddedChunk, RetrievedChunk, Citation
  chunk.ts          # structureAwareChunk(pages) -> RawChunk[]   (pure)
  rrf.ts            # reciprocalRankFusion(lists) -> fused ids    (pure)
  citations.ts      # parseCitations(text) + verifyCitations()    (pure)
  rewrite.ts        # buildRewritePrompt() (pure) + rewriteQuery() (LLM)
  embed.ts          # embedTexts() — text-embedding-3-large@1536
  parse.ts          # parsePdf(url) — LlamaParse + unpdf fallback
  contextualize.ts  # contextualizeChunk() — Anthropic prefix (LLM)
  dense.ts          # denseSearch() — Pinecone query
  sparse.ts         # sparseSearch() — Postgres FTS
  rerank.ts         # rerank() — Cohere Rerank 3.5
  retrieve.ts       # retrieve() — orchestrates rewrite→hybrid→rerank→gate
  pinecone.ts       # getIndex(), upsertChunks(), deleteByDocument()
src/inngest/
  client.ts         # Inngest client + event types
  ingest.ts         # durable ingest function (parse→chunk→contextualize→embed→persist→finalize)
src/app/api/
  inngest/route.ts        # Inngest serve endpoint
  upload/route.tsx        # MODIFY: create session+Documents(PROCESSING), send events
  documents/route.ts      # GET list+status, DELETE document
  pdfchat/route.ts        # REWRITE: full history + retrieve() + v5 citations
prisma/schema.prisma      # MODIFY: Document, Chunk, DocumentStatus; keep PDF temporarily
prisma/migrations/.../    # raw SQL: tsvector generated column + GIN index
eval/
  golden.json, run.ts, metrics.ts
```

---

## PHASE 0 — Foundations (deps, env, test runner)

### Task 0.1: Install dependencies & test runner

**Files:** Modify `package.json`

- [ ] **Step 1: Install**

```bash
npm i cohere-ai inngest llama-cloud-services unpdf @ai-sdk/openai@latest ai@latest
npm i -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Add scripts to `package.json`**

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts", "eval/**/*.test.ts"] },
  resolve: { alias: { "~": new URL("./src", import.meta.url).pathname } },
});
```

- [ ] **Step 4: Verify** — `npx vitest run` → "No test files found" (exit 0 acceptable) .
- [ ] **Step 5: Commit** — `chore: add vitest, cohere, inngest, llama-cloud, unpdf deps`

### Task 0.2: Env vars

**Files:** Modify `src/server/env.js`, `.env.example`

- [ ] **Step 1:** Add to `env.js` `server` schema and `runtimeEnv` (all `.optional()` except where prod-required):

```js
OPENAI_API_KEY: z.string().optional(),
PINECONE_API_KEY: z.string().optional(),
PINECONE_INDEX: z.string().default("chat-pdf-v2"),
LLAMA_CLOUD_API_KEY: z.string().optional(),
COHERE_API_KEY: z.string().optional(),
INNGEST_EVENT_KEY: z.string().optional(),
INNGEST_SIGNING_KEY: z.string().optional(),
```
(mirror each in `runtimeEnv: { OPENAI_API_KEY: process.env.OPENAI_API_KEY, ... }`)

- [ ] **Step 2:** Append the same keys (empty) to `.env.example` with comments.
- [ ] **Step 3: Verify** — `npx tsc --noEmit` passes (env.js is JS, just ensure no syntax error via `node --check src/server/env.js`).
- [ ] **Step 4: Commit** — `chore: add RAG env vars (pinecone v2, llama, cohere, inngest)`

---

## PHASE 1 — Core RAG library (pure functions, fully unit-tested)

### Task 1.1: Shared types

**Files:** Create `src/lib/rag/types.ts`

- [ ] **Step 1: Write types**

```ts
export interface ParsedPage { page: number; markdown: string; }
export interface RawChunk { page: number; section: string | null; chunkIndex: number; content: string; isTable: boolean; }
export interface ChunkRecord extends RawChunk { id: string; documentId: string; contextual: string | null; }
export interface Candidate { chunkId: string; rank: number; score?: number; }
export interface RetrievedChunk { chunkId: string; documentId: string; docName: string; page: number; content: string; score: number; }
export interface Citation { docName: string; page: number; }
```

- [ ] **Step 2: Commit** — `feat(rag): shared types`

### Task 1.2: Reciprocal Rank Fusion (pure)

**Files:** Create `src/lib/rag/rrf.ts`, `src/lib/rag/rrf.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { reciprocalRankFusion } from "./rrf";

describe("reciprocalRankFusion", () => {
  it("ranks an item appearing high in both lists first", () => {
    const dense = ["a", "b", "c"];
    const sparse = ["a", "d", "b"];
    const fused = reciprocalRankFusion([dense, sparse], 60);
    expect(fused[0]).toBe("a");
  });
  it("dedupes and includes items from any list", () => {
    const fused = reciprocalRankFusion([["x"], ["y"]], 60);
    expect(new Set(fused)).toEqual(new Set(["x", "y"]));
  });
  it("returns [] for empty input", () => {
    expect(reciprocalRankFusion([], 60)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/rag/rrf.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement**

```ts
export function reciprocalRankFusion(lists: string[][], k = 60): string[] {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, i) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1));
    });
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `feat(rag): RRF fusion`

### Task 1.3: Structure-aware chunking (pure)

**Files:** Create `src/lib/rag/chunk.ts`, `src/lib/rag/chunk.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { structureAwareChunk } from "./chunk";

const pages = [
  { page: 1, markdown: "# Intro\n\nHello world. ".repeat(1) + "A".repeat(2000) },
  { page: 2, markdown: "| col |\n| --- |\n| v |" },
];

describe("structureAwareChunk", () => {
  it("keeps a markdown table as a single table chunk", () => {
    const chunks = structureAwareChunk(pages, { maxTokens: 400, overlapRatio: 0.15 });
    const table = chunks.find((c) => c.isTable);
    expect(table).toBeDefined();
    expect(table!.content).toContain("| col |");
    expect(table!.page).toBe(2);
  });
  it("splits long prose into multiple chunks with sequential indices", () => {
    const chunks = structureAwareChunk(pages, { maxTokens: 100, overlapRatio: 0.15 });
    const p1 = chunks.filter((c) => c.page === 1 && !c.isTable);
    expect(p1.length).toBeGreaterThan(1);
    expect(chunks.map((c) => c.chunkIndex)).toEqual([...chunks.keys()]);
  });
  it("carries the nearest heading as section", () => {
    const chunks = structureAwareChunk(pages, { maxTokens: 400, overlapRatio: 0.15 });
    expect(chunks[0].section).toBe("Intro");
  });
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** (approx-token = chars/4; split paragraphs, isolate markdown tables, track last heading, add overlap by carrying tail words):

```ts
import type { ParsedPage, RawChunk } from "./types";
const approxTokens = (s: string) => Math.ceil(s.length / 4);
const isTableBlock = (b: string) => /^\s*\|.*\|/m.test(b) && b.includes("---");

export function structureAwareChunk(
  pages: ParsedPage[],
  opts: { maxTokens: number; overlapRatio: number },
): RawChunk[] {
  const out: RawChunk[] = [];
  let section: string | null = null;
  let idx = 0;
  const overlapTokens = Math.round(opts.maxTokens * opts.overlapRatio);
  for (const { page, markdown } of pages) {
    const blocks = markdown.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
    let buf: string[] = [];
    const flush = () => {
      if (!buf.length) return;
      const content = buf.join("\n\n");
      out.push({ page, section, chunkIndex: idx++, content, isTable: false });
      const tail = content.split(/\s+/).slice(-Math.max(1, overlapTokens)).join(" ");
      buf = overlapTokens > 0 ? [tail] : [];
    };
    for (const block of blocks) {
      const heading = block.match(/^#{1,6}\s+(.*)$/m);
      if (heading) section = heading[1].trim();
      if (isTableBlock(block)) {
        flush();
        out.push({ page, section, chunkIndex: idx++, content: block, isTable: true });
        continue;
      }
      buf.push(block);
      if (approxTokens(buf.join("\n\n")) >= opts.maxTokens) flush();
    }
    flush();
  }
  return out.map((c, i) => ({ ...c, chunkIndex: i }));
}
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `feat(rag): structure-aware chunking`

### Task 1.4: Citation parse + verify (pure)

**Files:** Create `src/lib/rag/citations.ts`, `src/lib/rag/citations.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseCitations, verifyCitations } from "./citations";

describe("citations", () => {
  it("parses [Doc p.3] style refs", () => {
    expect(parseCitations("As shown [Report p.3] and [Report p.12].")).toEqual([
      { docName: "Report", page: 3 }, { docName: "Report", page: 12 },
    ]);
  });
  it("keeps only citations backed by retrieved chunks", () => {
    const retrieved = [{ docName: "Report", page: 3 }];
    const cited = [{ docName: "Report", page: 3 }, { docName: "Ghost", page: 1 }];
    expect(verifyCitations(cited, retrieved)).toEqual([{ docName: "Report", page: 3 }]);
  });
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**

```ts
import type { Citation, RetrievedChunk } from "./types";
export function parseCitations(text: string): Citation[] {
  const re = /\[([^\]]+?)\s+p\.(\d+)\]/g;
  const out: Citation[] = [];
  for (const m of text.matchAll(re)) out.push({ docName: m[1].trim(), page: Number(m[2]) });
  return out;
}
export function verifyCitations(cited: Citation[], retrieved: Pick<RetrievedChunk,"docName"|"page">[]): Citation[] {
  const ok = new Set(retrieved.map((r) => `${r.docName}::${r.page}`));
  const seen = new Set<string>();
  return cited.filter((c) => {
    const key = `${c.docName}::${c.page}`;
    if (!ok.has(key) || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `feat(rag): citation parsing + verification`

### Task 1.5: Query-rewrite prompt builder (pure part)

**Files:** Create `src/lib/rag/rewrite.ts`, `src/lib/rag/rewrite.test.ts`

- [ ] **Step 1: Failing test** for `buildRewritePrompt(history, latest)` returning a messages array that includes the latest question and prior turns, and instructs standalone rewriting.

```ts
import { describe, it, expect } from "vitest";
import { buildRewritePrompt } from "./rewrite";
it("includes latest question and instruction", () => {
  const msgs = buildRewritePrompt([{ role: "user", content: "Tell me about Acme" }], "what about its margins?");
  const text = JSON.stringify(msgs);
  expect(text).toContain("its margins");
  expect(text.toLowerCase()).toContain("standalone");
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `buildRewritePrompt` returning `[{role:"system",...}, ...history, {role:"user", content: latest}]`. Keep `rewriteQuery(history, latest, llm)` thin: call `llm(buildRewritePrompt(...))`, default to `latest` on empty/error. **Step 4:** PASS. **Step 5: Commit** — `feat(rag): history-aware query rewrite prompt`

---

## PHASE 2 — External adapters (injectable clients, tested with fakes)

### Task 2.1: Embeddings (`text-embedding-3-large` @1536)

**Files:** Create `src/lib/rag/embed.ts`, `src/lib/rag/embed.test.ts`; deprecate `src/lib/emmebding.ts` (re-export for back-compat).

- [ ] **Step 1: Failing test** — `embedTexts(["a","b"], fakeClient)` returns one vector per input; batches; passes `model:"text-embedding-3-large", dimensions:1536`.

```ts
import { describe, it, expect, vi } from "vitest";
import { embedTexts } from "./embed";
it("requests 3-large@1536 and returns one vec per input", async () => {
  const create = vi.fn().mockResolvedValue({ data: [{ embedding: [0.1] }, { embedding: [0.2] }] });
  const fake = { embeddings: { create } } as any;
  const vecs = await embedTexts(["a", "b"], fake);
  expect(vecs).toHaveLength(2);
  expect(create.mock.calls[0][0]).toMatchObject({ model: "text-embedding-3-large", dimensions: 1536 });
});
```

- [ ] **Step 2:** FAIL. **Step 3: Implement** `embedTexts(texts, client = defaultOpenAI)` mapping newlines→spaces, batching ≤96 inputs. **Step 4:** PASS. **Step 5: Commit** — `feat(rag): 3-large@1536 embeddings adapter`

### Task 2.2: Pinecone adapter (v2 index)

**Files:** Create `src/lib/rag/pinecone.ts`, `.test.ts`

- [ ] **Step 1: Failing test** — `upsertChunks(namespace, records, fakeIndex)` maps each record to `{id, values, metadata:{chunkId,documentId,page}}` and calls `namespace().upsert`; `deleteByDocument` calls delete with `filter:{documentId}`. Use a fake index object capturing args.
- [ ] **Step 2:** FAIL. **Step 3: Implement** `getIndex()` (uses `env.PINECONE_INDEX`), `upsertChunks`, `denseQuery(namespace, vector, topK, filter, fakeIndex?)`, `deleteByDocument`. **Step 4:** PASS. **Step 5: Commit** — `feat(rag): pinecone v2 adapter (namespace+documentId filter)`

### Task 2.3: Dense search

**Files:** Create `src/lib/rag/dense.ts`, `.test.ts`

- [ ] **Step 1: Failing test** — `denseSearch(query, {userId, documentIds}, deps)` embeds query then calls pinecone denseQuery with `filter:{documentId:{$in:[...]}}` when documentIds provided, no filter when undefined; returns `Candidate[]` (chunkId+rank). Inject fake embed + fake index.
- [ ] **Step 2:** FAIL. **Step 3: Implement.** **Step 4:** PASS. **Step 5: Commit** — `feat(rag): dense search via pinecone`

### Task 2.4: Sparse search (Postgres FTS) — adapter with injectable db

**Files:** Create `src/lib/rag/sparse.ts`, `.test.ts`

- [ ] **Step 1: Failing test** — `sparseSearch(query, {userId, documentIds}, fakeDb)` builds a `$queryRaw` using `websearch_to_tsquery` and returns `Candidate[]` ordered by rank. Test injects a fake `db` whose `$queryRawUnsafe`/`$queryRaw` returns rows `[{id:"c1"},{id:"c2"}]` and asserts mapping to ranks 0,1.
- [ ] **Step 2:** FAIL. **Step 3: Implement** using Prisma `$queryRaw` with parameterized `documentId = ANY($ids)` scope and `content_fts @@ websearch_to_tsquery('english', $q)` ordered by `ts_rank` desc limit 40. **Step 4:** PASS. **Step 5: Commit** — `feat(rag): postgres full-text sparse search`

### Task 2.5: Cohere rerank

**Files:** Create `src/lib/rag/rerank.ts`, `.test.ts`

- [ ] **Step 1: Failing test** — `rerank(query, docs, topN, fakeCohere)` calls `v2.rerank({model:"rerank-v3.5", query, documents, topN})` and maps `results[].index/relevanceScore` back to input docs preserving content. Fake returns `{results:[{index:1,relevanceScore:0.9},{index:0,relevanceScore:0.2}]}`; expect reordered.
- [ ] **Step 2:** FAIL. **Step 3: Implement** with `CohereClientV2`; on missing key or error, fall back to identity order (return first topN). **Step 4:** PASS. **Step 5: Commit** — `feat(rag): cohere rerank 3.5 adapter (graceful fallback)`

### Task 2.6: PDF parsing (LlamaParse + unpdf fallback)

**Files:** Create `src/lib/rag/parse.ts`, `.test.ts`

- [ ] **Step 1: Failing test** — `parsePdf(buffer, {llamaParse, fallback})` returns `ParsedPage[]`; when `llamaParse` throws, uses `fallback` and still returns pages with sequential `page` numbers. Inject both as fakes.
- [ ] **Step 2:** FAIL. **Step 3: Implement** `parsePdf` that tries LlamaParse (`llama-cloud-services`, markdown per page) and on error calls `unpdfFallback(buffer)` (extract text per page via `unpdf`'s `extractText`). Keep the real client wiring in `parseWithLlama()` / `unpdfFallback()` thin wrappers. **Step 4:** PASS. **Step 5: Commit** — `feat(rag): pdf parsing with llamaparse + unpdf fallback`

### Task 2.7: Contextualize (Anthropic prefix) — thin LLM wrapper

**Files:** Create `src/lib/rag/contextualize.ts`, `.test.ts`

- [ ] **Step 1: Failing test** — `buildContextPrompt(docTitle, chunk)` includes doc title + chunk content and asks for a ≤2 sentence situating context. `contextualizeChunk(..., fakeLlm)` returns `prefix + "\n\n" + content`; on llm error returns content unchanged.
- [ ] **Step 2:** FAIL. **Step 3: Implement.** **Step 4:** PASS. **Step 5: Commit** — `feat(rag): contextual-retrieval prefixing`

---

## PHASE 3 — Retrieval orchestrator

### Task 3.1: `retrieve()` end-to-end (with injected deps)

**Files:** Create `src/lib/rag/retrieve.ts`, `.test.ts`

- [ ] **Step 1: Failing test** — `retrieve({query, history, userId, documentIds}, deps)` where deps = `{rewrite, dense, sparse, hydrate, rerank}` (all fakes). Assert: calls rewrite; merges dense+sparse via RRF; hydrates chunk text from db; reranks; returns top K `RetrievedChunk[]`; sets `weakContext=true` when top score < threshold.

```ts
it("fuses, reranks, and flags weak context", async () => {
  const deps = {
    rewrite: async () => "standalone q",
    dense: async () => [{ chunkId: "a", rank: 0 }, { chunkId: "b", rank: 1 }],
    sparse: async () => [{ chunkId: "b", rank: 0 }, { chunkId: "c", rank: 1 }],
    hydrate: async (ids: string[]) => ids.map((id) => ({ chunkId: id, documentId: "d", docName: "Doc", page: 1, content: id })),
    rerank: async (_q: string, docs: any[]) => docs.map((d, i) => ({ ...d, score: i === 0 ? 0.1 : 0.05 })),
  };
  const r = await retrieve({ query: "q", history: [], userId: "u", documentIds: undefined }, deps as any);
  expect(r.weakContext).toBe(true);
  expect(r.chunks.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2:** FAIL. **Step 3: Implement** orchestration (rewrite → dense+sparse in parallel → `reciprocalRankFusion` → take top 40 ids → `hydrate` → `rerank` topN=6 → `weakContext = topScore < CONFIDENCE_THRESHOLD (0.2)`). **Step 4:** PASS. **Step 5: Commit** — `feat(rag): retrieval orchestrator (rewrite→hybrid→rerank→gate)`

### Task 3.2: Production wiring of `retrieve()` deps

**Files:** Modify `src/lib/rag/retrieve.ts` (add `defaultDeps` using real adapters + a `hydrateChunks(ids, db)` that selects `Chunk` joined to `Document` for name).

- [ ] **Step 1:** Add `hydrateChunks` in `src/lib/rag/hydrate.ts` + test with fake db returning rows; map to `RetrievedChunk`. **Step 2-4:** TDD as above. **Step 5: Commit** — `feat(rag): hydrate chunks + default production deps`

---

## PHASE 4 — Schema & migrations

### Task 4.1: Prisma models `Document`, `Chunk`, `DocumentStatus`

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1:** Add models per spec §4.1 (Document, Chunk, enum DocumentStatus). Add `documents Document[]` relation to `PdfChatSession`. Keep `PDF` model for now (no destructive drop yet).
- [ ] **Step 2:** `npx prisma format` then `npx prisma validate` → OK.
- [ ] **Step 3:** Create migration: `npx prisma migrate dev --name add_document_chunk --create-only` (so we can hand-edit SQL).
- [ ] **Step 4: Commit** — `feat(db): Document + Chunk models`

### Task 4.2: Raw SQL — tsvector generated column + GIN index

**Files:** Edit the generated migration SQL under `prisma/migrations/*_add_document_chunk/migration.sql`

- [ ] **Step 1:** Append:

```sql
ALTER TABLE "Chunk" ADD COLUMN "content_fts" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "content")) STORED;
CREATE INDEX "Chunk_content_fts_idx" ON "Chunk" USING GIN ("content_fts");
```

- [ ] **Step 2:** Apply: `npx prisma migrate dev` (requires DATABASE_URL). If no DB available in env, document that this runs at deploy and verify SQL with `npx prisma migrate diff` dry-run.
- [ ] **Step 3: Commit** — `feat(db): tsvector generated column + GIN index for FTS`

---

## PHASE 5 — Ingestion (Inngest durable job)

### Task 5.1: Inngest client + event types

**Files:** Create `src/inngest/client.ts`, `src/app/api/inngest/route.ts`

- [ ] **Step 1:** `client.ts`: `export const inngest = new Inngest({ id: "worker-rag" })` + typed event `"document/uploaded"` `{ documentId }`.
- [ ] **Step 2:** `route.ts`: `serve({ client: inngest, functions: [ingestDocument] })` exporting GET/POST/PUT.
- [ ] **Step 3:** `npx tsc --noEmit` passes. **Step 4: Commit** — `feat(ingest): inngest client + serve route`

### Task 5.2: Ingest function (durable steps)

**Files:** Create `src/inngest/ingest.ts`

- [ ] **Step 1:** Implement `ingestDocument` on `"document/uploaded"`:
  - `step.run("load")` fetch Document row + download PDF buffer from `url`.
  - `step.run("parse")` → `parsePdf` → ParsedPage[].
  - `step.run("chunk")` → `structureAwareChunk`.
  - `step.run("contextualize")` → map `contextualizeChunk` (batch, prompt-cached title).
  - `step.run("embed")` → `embedTexts(contextual ?? content)`.
  - `step.run("persist")` → create `Chunk` rows (deterministic id) + `upsertChunks(namespace=user:{userId})`.
  - `step.run("finalize")` → set Document `status=READY,pageCount,processedAt`.
  - On thrown error after retries → `onFailure` sets `status=FAILED,error`.
- [ ] **Step 2:** `npx tsc --noEmit` passes (logic covered by adapter unit tests; integration needs live keys — documented).
- [ ] **Step 3: Commit** — `feat(ingest): durable parse→chunk→contextualize→embed→persist job`

### Task 5.3: Upload route → create Documents + emit events

**Files:** Modify `src/app/api/upload/route.tsx`

- [ ] **Step 1:** Replace `loadFileIntoPinecone(url)` call. New flow: auth → create `PdfChatSession` → for each `(url,name)` create `Document{status:PROCESSING,userId,sessionId}` → `inngest.send({name:"document/uploaded", data:{documentId}})`. Return `{ id: session.id }`.
- [ ] **Step 2:** Remove dead `db.pDF.create` loop.
- [ ] **Step 3:** `npx tsc --noEmit`. **Step 4: Commit** — `feat(ingest): upload creates Documents + triggers ingestion`

### Task 5.4: Documents status API

**Files:** Create `src/app/api/documents/route.ts`

- [ ] **Step 1:** `GET ?sessionId=` → auth + ownership check → return documents `{id,name,status,pageCount,error}`. `DELETE ?documentId=` → ownership check → `deleteByDocument` (Pinecone) + cascade delete row.
- [ ] **Step 2:** `npx tsc --noEmit`. **Step 3: Commit** — `feat(api): documents list/status/delete endpoint`

---

## PHASE 6 — Generation route (multi-PDF + citations, AI SDK v5)

### Task 6.1: Rewrite `pdfchat` route

**Files:** Modify `src/app/api/pdfchat/route.ts`

- [ ] **Step 1:** New flow:
  - auth + load session with `documents`.
  - read `{ messages, chatId, documentIds }` from body.
  - `const r = await retrieve({ query: lastUser.content, history: priorMessages, userId, documentIds }, defaultDeps)`.
  - Build grounded system prompt embedding `r.chunks` as `"[docName p.page] content"` blocks; instruct cite-as-`[docName p.N]`, abstain if `r.weakContext`.
  - `streamText({ model: openai("gpt-4o-mini"), messages: [system, ...fullHistory], temperature: 0.2 })`.
  - Stream sources via v5: `createUIMessageStream` + `writer.write({type:"data-sources", data: verifyCitations(parseCitations(""), r.chunks)... })` — emit the retrieved chunk sources up-front as `data-sources`, and on finish, attach verified citations.
  - Persist user + assistant `Message` rows on finish.
  - Keep credit check (use existing logic).
- [ ] **Step 2:** `npx tsc --noEmit`. **Step 3: Commit** — `feat(chat): multi-PDF grounded answers with verified citations`

### Task 6.2: Client `useChat` v5 migration + scope

**Files:** Modify `src/components/pdfChatBox.tsx` and any `useChat` callers.

- [ ] **Step 1:** Migrate to v5 `useChat` API (`message.parts`), render `text` parts as markdown and `data-sources` parts as citation chips. Pass `body:{ chatId, documentIds }` from a scope selector (default all).
- [ ] **Step 2:** `npx tsc --noEmit` + `npm run build` compiles. **Step 3: Commit** — `feat(chat): v5 client with citations + document scope`

---

## PHASE 7 — UI redesign

> Use the `frontend-design` skill for visual execution. Each surface is its own task + commit. Verify each with `npm run build` and a screenshot via the `run` skill / Playwright.

### Task 7.1: Design tokens & primitives
Establish color/spacing/type tokens in `tailwind.config.ts` + `globals.css`; align existing `ui/*`. Commit `feat(ui): design tokens`.

### Task 7.2: Upload + status surface
Multi-file dropzone with per-file status chips (PROCESSING/READY/FAILED+retry), polling `GET /api/documents`. Commit `feat(ui): upload with ingestion status`.

### Task 7.3: Document manager + scope selector
Sidebar listing session documents, status, delete, checkbox scope that feeds `documentIds`. Commit `feat(ui): document manager + scope selector`.

### Task 7.4: Chat + citations + source panel
Redesigned message list, streamed markdown, citation chips opening a source panel (chunk text + page), low-confidence/"I don't know" state, loading skeletons. Commit `feat(ui): chat with citations + source panel`.

### Task 7.5: Viewer multi-doc + page jump
Multi-document viewer (tabs) with jump-to-page from a citation. Commit `feat(ui): multi-document viewer with page jump`.

### Task 7.6: Responsive + states pass
Mobile layout, empty/error/loading states across surfaces, a11y focus/keyboard. Commit `feat(ui): responsive + empty/error states`.

---

## PHASE 8 — Eval harness

### Task 8.1: Golden set + metrics
**Files:** `eval/golden.json` (~30 Q with relevant chunk ids), `eval/metrics.ts` (recall@k, MRR — pure, unit-tested), `eval/run.ts` (runs retrieve over golden set, prints metrics).

- [ ] TDD `metrics.ts` (recall@k, MRR) with unit tests. Wire `run.ts`. Commit `feat(eval): retrieval metrics + golden harness`.

### Task 8.2: Baseline + tuning notes
Run harness (needs keys), record baseline recall@k/MRR in `eval/RESULTS.md`, tune `CONFIDENCE_THRESHOLD`, topK/topN. Commit `docs(eval): baseline metrics + tuning`.

---

## PHASE 9 — Cleanup & cutover

### Task 9.1: Remove legacy single-PDF path
Delete dead code in `src/server/pineconeDb.ts` (or reduce to nothing), `src/lib/context.ts` (replaced by `retrieve.ts`), `src/lib/emmebding.ts` (replaced by `embed.ts`). Update imports. Drop `PDF` model + relation in a follow-up migration once `Document` is verified populated. Commit `refactor: remove legacy single-PDF ingestion/retrieval`.

### Task 9.2: README + .env docs
Update README architecture section to the new pipeline; document required keys + Inngest/LlamaParse/Cohere setup + new Pinecone index creation. Commit `docs: production RAG architecture + setup`.

---

## Self-Review Notes (coverage check)

- Spec §4.1 data model → Tasks 4.1, 4.2. §4.2 ingestion → Phase 5. §4.3 retrieval → Phases 1–3. §4.4 generation/citations → Phase 6. §4.5 eval → Phase 8. §5 UI → Phase 7. §6 env → Task 0.2. §7 module boundaries → file structure honored. §8 error handling → fallbacks in 2.5/2.6, FAILED status 5.2, weak-context gate 3.1, citation verify 1.4/6.1.
- External-key-dependent verification (LlamaParse, Cohere, Pinecone, Inngest, OpenAI live) is explicitly flagged in Tasks 4.2, 5.2, 8.2; all such logic is unit-tested behind fakes so it's correct-by-construction pending live keys.
- Type consistency: `Candidate`, `RetrievedChunk`, `ChunkRecord`, `Citation`, `ParsedPage`, `RawChunk` defined once in `types.ts` and reused across tasks.
