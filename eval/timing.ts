import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { unpdfFast, parseWithLlama } from "../src/lib/rag/parse";
import { structureAwareChunk } from "../src/lib/rag/chunk";
import { embedTexts } from "../src/lib/rag/embed";

const path = process.argv[2];
if (!path) throw new Error("usage: tsx eval/timing.ts <pdf>");
const buf = readFileSync(path);
console.log(`PDF: ${path} (${(buf.length / 1024).toFixed(0)} KB)\n`);

// 1) fast in-process parse
let s = Date.now();
const pages = await unpdfFast(buf);
const tParse = Date.now() - s;
const textChars = pages.reduce((n, p) => n + p.markdown.trim().length, 0);
console.log(
  `parse (unpdf):   ${tParse} ms   pages=${pages.length}  textChars=${textChars}`,
);
if (textChars < 50) {
  console.log(
    "  ⚠️  almost no text — this PDF would FALL BACK to LlamaParse (slow). Timing it:",
  );
  s = Date.now();
  try {
    const lp = await parseWithLlama(buf, "test.pdf");
    console.log(
      `  LlamaParse:    ${Date.now() - s} ms   pages=${lp.length}  textChars=${lp.reduce((n, p) => n + p.markdown.trim().length, 0)}`,
    );
  } catch (e) {
    console.log(`  LlamaParse failed: ${(e as Error).message}`);
  }
}

// 2) chunk
s = Date.now();
const chunks = structureAwareChunk(pages, { maxTokens: 450, overlapRatio: 0.15 });
const tChunk = Date.now() - s;
console.log(`chunk:           ${tChunk} ms   chunks=${chunks.length}`);

// 3) embed (inject client so we don't need the t3-env import)
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
s = Date.now();
const vecs = await embedTexts(
  chunks.map((c) => c.content),
  client as unknown as Parameters<typeof embedTexts>[1],
);
const tEmbed = Date.now() - s;
console.log(
  `embed (3-large@1024): ${tEmbed} ms   vectors=${vecs.length}  dim=${vecs[0]?.length}`,
);

console.log(
  `\nTOTAL real work (parse+chunk+embed): ${tParse + tChunk + tEmbed} ms`,
);
console.log(
  "(Pinecone upsert + Postgres write add ~0.3-1s; Inngest step round-trips + Vercel cold starts are the rest of the wall-clock you see in prod.)",
);
