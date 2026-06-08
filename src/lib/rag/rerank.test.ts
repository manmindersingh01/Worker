import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rerank } from "./rerank";

describe("rerank", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  it("reorders docs by cohere results with rerankScore", async () => {
    const rerankFn = vi.fn().mockResolvedValue({
      results: [
        { index: 1, relevanceScore: 0.9 },
        { index: 0, relevanceScore: 0.2 },
      ],
    });
    const client = { v2: { rerank: rerankFn } } as any;
    const res = await rerank(
      "q",
      [{ content: "a" }, { content: "b" }],
      2,
      client,
    );
    expect(res).toEqual([
      { content: "b", rerankScore: 0.9 },
      { content: "a", rerankScore: 0.2 },
    ]);
    expect(rerankFn).toHaveBeenCalledWith({
      model: "rerank-v3.5",
      query: "q",
      documents: ["a", "b"],
      topN: 2,
    });
  });

  it("limits to topN", async () => {
    const rerankFn = vi.fn().mockResolvedValue({
      results: [
        { index: 2, relevanceScore: 0.9 },
        { index: 0, relevanceScore: 0.5 },
        { index: 1, relevanceScore: 0.1 },
      ],
    });
    const client = { v2: { rerank: rerankFn } } as any;
    const res = await rerank(
      "q",
      [{ content: "a" }, { content: "b" }, { content: "c" }],
      2,
      client,
    );
    expect(res).toEqual([
      { content: "c", rerankScore: 0.9 },
      { content: "a", rerankScore: 0.5 },
    ]);
  });

  it("falls back to first topN with rerankScore 0 when the call throws", async () => {
    const rerankFn = vi.fn().mockRejectedValue(new Error("api down"));
    const client = { v2: { rerank: rerankFn } } as any;
    const res = await rerank(
      "q",
      [{ content: "a" }, { content: "b" }, { content: "c" }],
      2,
      client,
    );
    expect(res).toEqual([
      { content: "a", rerankScore: 0 },
      { content: "b", rerankScore: 0 },
    ]);
    expect(warn).toHaveBeenCalled();
  });

  it("preserves extra fields on docs", async () => {
    const rerankFn = vi.fn().mockResolvedValue({
      results: [{ index: 0, relevanceScore: 0.7 }],
    });
    const client = { v2: { rerank: rerankFn } } as any;
    const res = await rerank(
      "q",
      [{ content: "a", chunkId: "c1" }],
      1,
      client,
    );
    expect(res).toEqual([{ content: "a", chunkId: "c1", rerankScore: 0.7 }]);
  });
});
