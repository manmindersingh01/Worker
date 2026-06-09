import type { ParsedPage } from "~/lib/rag/types";

const MIN_TEXT_CHARS = 50; // below this total => likely scanned/image PDF

/**
 * Parse a PDF buffer into per-page markdown.
 *
 * Tries the fast in-process `unpdfFast` parser FIRST. Only when that yields
 * almost no text (a scanned/image PDF) does it fall back to LlamaParse OCR.
 * Pages are always renumbered sequentially from 1.
 */
export async function parsePdf(
  buffer: Buffer,
  opts: { fileName: string },
  deps?: {
    fast?: (b: Buffer) => Promise<ParsedPage[]>;
    ocr?: (b: Buffer, fileName: string) => Promise<ParsedPage[]>;
  },
): Promise<ParsedPage[]> {
  const fast = deps?.fast ?? unpdfFast;
  const ocr = deps?.ocr ?? parseWithLlama;

  let pages: ParsedPage[] = [];
  try {
    pages = await fast(buffer);
  } catch {
    pages = [];
  }

  const totalText = pages.reduce((n, p) => n + p.markdown.trim().length, 0);
  if (totalText < MIN_TEXT_CHARS) {
    // No usable text layer -> scanned/image PDF. Use LlamaParse if available.
    try {
      const o = await ocr(buffer, opts.fileName);
      if (o.length && o.some((p) => p.markdown.trim().length > 0)) pages = o;
    } catch {
      /* keep whatever fast produced */
    }
  }

  return pages.map((p, i) => ({ page: i + 1, markdown: p.markdown }));
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
 * Default fast in-process implementation using `unpdf`.
 *
 * Uses `extractText(data, { mergePages: false })` which returns
 * `{ totalPages, text: string[] }` — one string per page.
 */
export async function unpdfFast(buffer: Buffer): Promise<ParsedPage[]> {
  const { extractText, getDocumentProxy } = await import("unpdf");

  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });

  return text.map((t, i) => ({ page: i + 1, markdown: t }));
}
