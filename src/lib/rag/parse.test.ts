import { describe, it, expect, vi } from "vitest";
import { parsePdf } from "~/lib/rag/parse";

describe("parsePdf", () => {
  it("uses fast pages renumbered 1..n and does NOT call ocr when text is sufficient", async () => {
    const ocr = vi.fn(async () => [{ page: 1, markdown: "should-not-be-used" }]);
    const out = await parsePdf(Buffer.from("x"), { fileName: "a.pdf" }, {
      fast: async () => [
        { page: 7, markdown: "this is a page with plenty of real text content" },
        { page: 9, markdown: "another page with plenty of real text content too" },
      ],
      ocr,
    });
    expect(out).toEqual([
      { page: 1, markdown: "this is a page with plenty of real text content" },
      { page: 2, markdown: "another page with plenty of real text content too" },
    ]);
    expect(ocr).not.toHaveBeenCalled();
  });

  it("falls back to ocr when fast returns almost no text (< 50 chars)", async () => {
    const out = await parsePdf(Buffer.from("x"), { fileName: "a.pdf" }, {
      fast: async () => [
        { page: 1, markdown: "   " },
        { page: 2, markdown: "" },
      ],
      ocr: async () => [
        { page: 3, markdown: "ocr p1" },
        { page: 4, markdown: "ocr p2" },
      ],
    });
    expect(out).toEqual([
      { page: 1, markdown: "ocr p1" },
      { page: 2, markdown: "ocr p2" },
    ]);
  });

  it("falls back to ocr when fast throws", async () => {
    const out = await parsePdf(Buffer.from("x"), { fileName: "a.pdf" }, {
      fast: async () => {
        throw new Error("boom");
      },
      ocr: async () => [{ page: 5, markdown: "ocr fb" }],
    });
    expect(out).toEqual([{ page: 1, markdown: "ocr fb" }]);
  });

  it("keeps fast output when ocr also fails", async () => {
    const out = await parsePdf(Buffer.from("x"), { fileName: "a.pdf" }, {
      fast: async () => [{ page: 1, markdown: "tiny" }],
      ocr: async () => {
        throw new Error("ocr down");
      },
    });
    expect(out).toEqual([{ page: 1, markdown: "tiny" }]);
  });
});
