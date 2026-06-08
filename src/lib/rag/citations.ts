import type { Citation, RetrievedChunk } from "./types";

export function parseCitations(text: string): Citation[] {
  const re = /\[([^\]]+?)\s+p\.(\d+)\]/g;
  const out: Citation[] = [];
  for (const m of text.matchAll(re)) out.push({ docName: m[1].trim(), page: Number(m[2]) });
  return out;
}

export function verifyCitations(
  cited: Citation[],
  retrieved: Pick<RetrievedChunk, "docName" | "page">[],
): Citation[] {
  const ok = new Set(retrieved.map((r) => `${r.docName}::${r.page}`));
  const seen = new Set<string>();
  return cited.filter((c) => {
    const key = `${c.docName}::${c.page}`;
    if (!ok.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
