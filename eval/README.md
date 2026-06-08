# RAG evaluation harness

A small, retrieval-focused eval for the RAG pipeline. It answers one question:
**did we retrieve the right chunks, and how high up the list?**

## What it measures

Per case, against the chunks returned by `retrieve()`:

- **recall@6** — of the chunk ids we marked as _relevant_ for this question, what
  fraction appeared in the top 6 retrieved chunks. `1.0` = we found every relevant
  chunk; `0.0` = we found none. (When a case lists no relevant chunks, recall is 1
  by convention — there was nothing to find.)
- **MRR** (mean reciprocal rank) — `1 / rank` of the _first_ relevant chunk in the
  retrieved list (rank is 1-indexed). `1.0` = the first result was relevant; `0.5`
  = the second; `0.0` = no relevant chunk was retrieved at all. This rewards
  ranking the right chunk near the top, which matters because the reranker only
  keeps a handful.

The harness prints a per-case table plus the **mean recall@6** and **mean MRR**
across all cases.

> Faithfulness and answer-relevance (RAGAS-style, judging the generated answer
> against the retrieved context) are **not** measured yet — that is a planned
> future addition. The `idealAnswer` field in the golden set exists to support it.

## Building a real golden set

`golden.json` ships as a **template** with placeholder ids. Replace it with real
data:

1. Pick ~30–50 representative questions across your real PDFs — mix factual
   lookups, summaries, and multi-document questions so the score reflects actual
   usage.
2. For each question, decide which chunks _should_ be retrieved. Query the
   `Chunk` table for the document(s) involved and record the matching `Chunk.id`
   values into `relevantChunkIds`. (Prisma Studio — `npm run db:studio` — is the
   easiest way to browse chunks by document and copy their ids.)
3. Set `userId` to the user who owns those documents, and `documentIds` to the
   doc(s) to scope retrieval to — or `null` to search across all of that user's
   documents.
4. Fill in `idealAnswer` with the answer you'd expect (used only by future
   answer-quality scoring; ignored today).

### Schema

Top level:

```json
{ "version": 1, "note": "...", "cases": [ /* GoldenCase[] */ ] }
```

Each case:

```json
{
  "id": "string",
  "question": "string",
  "userId": "string",
  "documentIds": ["string"],   // or null to search all of the user's docs
  "relevantChunkIds": ["string"],
  "idealAnswer": "string"
}
```

## Running

```bash
npm run eval        # or: npx tsx eval/run.ts
```

This runs the **real** pipeline — OpenAI embeddings, Pinecone, Cohere rerank, and
the database — so it needs live credentials in your environment (the same vars the
app uses, including `OPENAI_API_KEY` and `PINECONE_API_KEY`) and a populated DB.

If `OPENAI_API_KEY` or `PINECONE_API_KEY` is missing the harness prints
`eval requires live keys; skipping` and exits 0 — it never crashes CI.

## Baseline

Current measured baseline: **pending live keys** (run the harness against a real
golden set to populate this).
