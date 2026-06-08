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
    const flush = () => {
      if (!buf.length) return;
      const content = buf.join("\n\n");
      out.push({ page, section, chunkIndex: idx++, content, isTable: false });
      const tail = content
        .split(/\s+/)
        .slice(-Math.max(1, overlapTokens))
        .join(" ");
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
