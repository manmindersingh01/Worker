import { describe, it, expect } from "vitest";
import { parsePdf } from "~/lib/rag/parse";

describe("parsePdf", () => {
  it("returns llama pages renumbered 1..n on success", async () => {
    const out = await parsePdf(Buffer.from("x"), { fileName: "a.pdf" }, {
      parseWithLlama: async () => [
        { page: 7, markdown: "one" },
        { page: 9, markdown: "two" },
      ],
      fallback: async () => [{ page: 1, markdown: "should-not-be-used" }],
    });
    expect(out).toEqual([
      { page: 1, markdown: "one" },
      { page: 2, markdown: "two" },
    ]);
  });

  it("falls back when llama throws", async () => {
    const out = await parsePdf(Buffer.from("x"), { fileName: "a.pdf" }, {
      parseWithLlama: async () => {
        throw new Error("down");
      },
      fallback: async () => [{ page: 5, markdown: "fb" }],
    });
    expect(out).toEqual([{ page: 1, markdown: "fb" }]);
  });

  it("falls back when llama returns empty", async () => {
    const out = await parsePdf(Buffer.from("x"), { fileName: "a.pdf" }, {
      parseWithLlama: async () => [],
      fallback: async () => [
        { page: 3, markdown: "p1" },
        { page: 4, markdown: "p2" },
      ],
    });
    expect(out).toEqual([
      { page: 1, markdown: "p1" },
      { page: 2, markdown: "p2" },
    ]);
  });
});
