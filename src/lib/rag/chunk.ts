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
    const blocks = markdown
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);
    let buf: string[] = [];
    let carry = "";
    const flush = () => {
      if (!buf.length) return;
      const content = (carry ? carry + "\n\n" : "") + buf.join("\n\n");
      out.push({ page, section, chunkIndex: idx++, content, isTable: false });
      carry =
        overlapTokens > 0
          ? content.split(/\s+/).slice(-Math.max(1, overlapTokens)).join(" ")
          : "";
      buf = [];
    };
    for (const block of blocks) {
      const heading = /^#{1,6}\s+(.*)$/m.exec(block);
      if (heading) section = heading[1].trim();
      if (isTableBlock(block)) {
        flush();
        carry = "";
        out.push({ page, section, chunkIndex: idx++, content: block, isTable: true });
        continue;
      }
      // A single block larger than maxTokens is split into word windows so
      // oversized prose is honoured instead of emitted as one giant chunk.
      if (approxTokens(block) >= opts.maxTokens) {
        flush();
        const words = block.split(/\s+/);
        let window: string[] = [];
        for (const w of words) {
          window.push(w);
          const projected = (carry ? carry + "\n\n" : "") + window.join(" ");
          if (approxTokens(projected) >= opts.maxTokens) {
            buf = [window.join(" ")];
            flush();
            window = [];
          }
        }
        if (window.length) buf = [window.join(" ")];
        continue;
      }
      buf.push(block);
      const projected = (carry ? carry + "\n\n" : "") + buf.join("\n\n");
      if (approxTokens(projected) >= opts.maxTokens) flush();
    }
    flush();
  }
  return out.map((c, i) => ({ ...c, chunkIndex: i }));
}
