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
});
