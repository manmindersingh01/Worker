import type { ParsedPage } from "~/lib/rag/types";

function renumber(pages: ParsedPage[]): ParsedPage[] {
  return pages.map((p, i) => ({ page: i + 1, markdown: p.markdown }));
}

/**
 * Parse a PDF buffer into per-page markdown.
 *
 * Tries `parseWithLlama` first. If it throws OR returns an empty array, falls
 * back to `unpdfFallback`. Pages are always renumbered sequentially from 1.
 */
export async function parsePdf(
  buffer: Buffer,
  opts: { fileName: string },
  deps?: {
    parseWithLlama?: (b: Buffer, n: string) => Promise<ParsedPage[]>;
    fallback?: (b: Buffer) => Promise<ParsedPage[]>;
  },
): Promise<ParsedPage[]> {
  const llama = deps?.parseWithLlama ?? parseWithLlama;
  const fallback = deps?.fallback ?? unpdfFallback;

  let pages: ParsedPage[] = [];
  try {
    pages = await llama(buffer, opts.fileName);
  } catch {
    pages = [];
  }

  if (pages.length === 0) {
    pages = await fallback(buffer);
  }

  return renumber(pages);
}

/**
 * Default LlamaParse implementation.
 *
 * Wires `LlamaParseReader` from `llama-cloud-services` (the reader subpackage)
 * with `resultType: "markdown"` and `splitByPage: true`. We call
 * `loadDataAsContent(Uint8Array, filename)`, which returns one `Document` per
 * page (the SDK splits the combined markdown on its page separator). Each
 * `Document.text` is that page's markdown.
 */
export async function parseWithLlama(
  buffer: Buffer,
  fileName: string,
): Promise<ParsedPage[]> {
  const { env } = await import("~/server/env");
  const { LlamaParseReader } = await import("llama-cloud-services");

  const reader = new LlamaParseReader({
    apiKey: env.LLAMA_CLOUD_API_KEY,
    resultType: "markdown",
    splitByPage: true,
  });

  const documents = await reader.loadDataAsContent(
    new Uint8Array(buffer),
    fileName,
  );

  return documents.map((doc, i) => ({
    page: i + 1,
    markdown: doc.text ?? "",
  }));
}

/**
 * Default fallback implementation using `unpdf`.
 *
 * Uses `extractText(data, { mergePages: false })` which returns
 * `{ totalPages, text: string[] }` — one string per page.
 */
export async function unpdfFallback(buffer: Buffer): Promise<ParsedPage[]> {
  const { extractText, getDocumentProxy } = await import("unpdf");

  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });

  return text.map((t, i) => ({ page: i + 1, markdown: t }));
}
