import { describe, it, expect } from "vitest";
import { structureAwareChunk } from "./chunk";
const pages = [
  { page: 1, markdown: "# Intro\n\nHello world. " + "A".repeat(2000) },
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
    expect(chunks.filter((c) => c.page === 1 && !c.isTable).length).toBeGreaterThan(1);
    expect(chunks.map((c) => c.chunkIndex)).toEqual([...chunks.keys()]);
  });
  it("carries the nearest heading as section", () => {
    const chunks = structureAwareChunk(pages, { maxTokens: 400, overlapRatio: 0.15 });
    expect(chunks[0].section).toBe("Intro");
  });
  it("does not emit a chunk that is only the carried overlap tail", () => {
    const pages = [{ page: 1, markdown: "Alpha beta gamma. " + "word ".repeat(60) }];
    const chunks = structureAwareChunk(pages, { maxTokens: 50, overlapRatio: 0.2 });
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].content).not.toBe(chunks[i - 1].content);
      // no chunk may be a pure suffix (overlap tail) of its predecessor with no new content
      expect(chunks[i - 1].content.trimEnd().endsWith(chunks[i].content.trim())).toBe(false);
    }
    const last = chunks[chunks.length - 1].content.trim();
    expect(last.length).toBeGreaterThan(0);
  });
  it("produces exactly one chunk for short single-page content", () => {
    const chunks = structureAwareChunk([{ page: 1, markdown: "Just a short sentence." }], { maxTokens: 400, overlapRatio: 0.15 });
    expect(chunks.filter((c) => !c.isTable)).toHaveLength(1);
  });
});
