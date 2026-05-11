# Worker

Chat with your PDFs. Upload a document, ask questions about it, get answers grounded in the actual content with retrieval-augmented generation. There's also a plain text-chat mode for general questions.

Live: https://worker-mocha.vercel.app

## What it does

Two modes share one app:

**PDF chat.** Upload a PDF, the server chunks it, embeds the chunks, and stores them in Pinecone under a namespace keyed off the file URL. When you ask a question, the question is embedded, the top-5 most similar chunks come back, get filtered to anything scoring at least 0.7 cosine similarity, concatenated to a 3000-character budget, and injected into the system prompt. Answers stream back token-by-token from `gpt-3.5-turbo` via the Vercel AI SDK.

**Text chat.** A second route that talks to Gemini 1.5 Flash with the full conversation history loaded from Postgres. Useful when you just want a model without document grounding.

Both modes store sessions and messages in Postgres so you can come back to a conversation later. Auth is Google or Discord (NextAuth). Each account starts with 300 credits, deducted per turn based on input length.

## How it works

### Ingestion (`src/server/pineconeDb.ts`)

```
PDF URL (uploadthing) → download → LangChain PDFLoader
  → RecursiveCharacterTextSplitter (default chunk size)
  → for each chunk: ada-002 embedding + md5(text) as vector id
  → Pinecone upsert into namespace = sanitize(file URL)
```

Namespacing per file is what makes the "ask only this PDF" semantics work. Retrieval queries are scoped to that namespace, so chunks from a previous upload can't bleed into the current answer. The md5 vector ID dedupes re-uploads of identical chunks.

### Retrieval (`src/lib/context.ts`)

```ts
const matches = await index.namespace(fileKey).query({
  vector: queryEmbedding,
  topK: 5,
  includeMetadata: true,
});
const qualifying = matches.filter(m => m.score >= 0.7);
const context = qualifying.map(m => m.metadata.text).join("\n").slice(0, 3000);
```

The 0.7 score gate is the main lever against hallucinated answers. Below that threshold, chunks get dropped rather than padded into the prompt. The 3000-character cap keeps the system prompt cheap enough for `gpt-3.5-turbo`.

### Answering (`src/app/api/pdfchat/route.ts`)

The retrieved context goes into the system prompt. Only `role: "user"` messages are kept from history when forwarded to OpenAI, which keeps the context window tight on long conversations. The response streams back as a data stream that the client consumes through the Vercel AI SDK's `useChat` hook.

### Credits

Cost per turn = `inputLength / 4` (rough token approximation). Checked before the model call, deducted after. A 402 with `INSUFFICIENT_CREDITS` is surfaced to the UI as a toast.

### Honest caveats

- The `PdfChatSession ↔ PDF` Prisma relation is many-to-many, but the API currently uses `pdfs[0].url` as the retrieval key. Multi-PDF queries against one session aren't wired up end-to-end yet.
- Embedding model is OpenAI `text-embedding-ada-002`, which is older and cheaper than `text-embedding-3-small`. Worth upgrading.
- Credit accounting is by input length, not actual token count. Fine for a personal project, would need real tokenization for production.

## Setup

Requires Node 20+, a Postgres database, a Pinecone index named `chat-pdf` (1536 dimensions, cosine metric), and API keys for OpenAI, Google AI Studio, and uploadthing.

```bash
git clone https://github.com/manmindersingh01/Worker.git
cd Worker
cp .env.example .env       # fill in DATABASE_URL, PINECONE_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, UPLOADTHING_TOKEN, NextAuth provider keys
npm install
npx prisma migrate deploy
npm run dev
```

NextAuth needs Google and/or Discord OAuth client IDs configured.

## Tech stack

Next.js 15 (App Router), TypeScript, Prisma + Postgres, NextAuth, Pinecone, LangChain (PDF loader + splitter only), OpenAI (embeddings + chat completions), Google Gemini (text chat mode), Vercel AI SDK, uploadthing, Tailwind, Radix UI.

## Why I built this

The interesting problem is retrieval, not the chat UI. I wanted to feel the difference between naive concatenation and proper top-k cosine retrieval, and to find out where it breaks. Spoiler: it breaks at the chunking step long before it breaks at the embedding step. The default `RecursiveCharacterTextSplitter` settings are fine for prose, less so for tables and code blocks, and that's the next thing on this project's backlog.
