import { describe, it, expect } from "vitest";
import { retrieve } from "./retrieve";

describe("retrieve", () => {
  it("fuses, reranks, and flags weak context", async () => {
    const deps = {
      rewrite: async () => "standalone q",
      dense: async () => [
        { chunkId: "a", rank: 0 },
        { chunkId: "b", rank: 1 },
      ],
      sparse: async () => [
        { chunkId: "b", rank: 0 },
        { chunkId: "c", rank: 1 },
      ],
      hydrate: async (ids: string[]) =>
        new Map(
          ids.map((id) => [
            id,
            {
              chunkId: id,
              documentId: "d",
              docName: "Doc",
              page: 1,
              content: id,
              score: 0,
            },
          ]),
        ),
      rerank: async (_q: string, docs: any[]) =>
        docs.map((d, i) => ({ ...d, rerankScore: i === 0 ? 0.1 : 0.05 })),
    };
    const r = await retrieve(
      { query: "q", history: [], userId: "u", documentIds: undefined },
      deps as any,
    );
    expect(r.query).toBe("standalone q");
    expect(r.weakContext).toBe(true); // top score 0.1 < 0.2
    expect(r.chunks.length).toBeGreaterThan(0);
    expect(r.chunks[0].score).toBe(0.1);
  });

  it("strong context when top rerank score high", async () => {
    const deps = {
      rewrite: async (_h: any, l: string) => l,
      dense: async () => [{ chunkId: "a", rank: 0 }],
      sparse: async () => [],
      hydrate: async (ids: string[]) =>
        new Map(
          ids.map((id) => [
            id,
            {
              chunkId: id,
              documentId: "d",
              docName: "Doc",
              page: 2,
              content: id,
              score: 0,
            },
          ]),
        ),
      rerank: async (_q: string, docs: any[]) =>
        docs.map((d) => ({ ...d, rerankScore: 0.9 })),
    };
    const r = await retrieve({ query: "hi", history: [], userId: "u" }, deps as any);
    expect(r.weakContext).toBe(false);
    expect(r.chunks[0].page).toBe(2);
  });

  it("survives a failing dense arm and still returns sparse hits", async () => {
    // Regression: a throwing dense (vector-store) arm must not discard the
    // sparse arm's results - retrieval degrades to lexical, not to nothing.
    const deps = {
      rewrite: async (_h: any, l: string) => l,
      dense: async () => {
        throw new Error("pinecone index not found");
      },
      sparse: async () => [{ chunkId: "s1", rank: 0 }],
      hydrate: async (ids: string[]) =>
        new Map(
          ids.map((id) => [
            id,
            {
              chunkId: id,
              documentId: "d",
              docName: "Doc",
              page: 5,
              content: id,
              score: 0,
            },
          ]),
        ),
      rerank: async (_q: string, docs: any[]) =>
        docs.map((d) => ({ ...d, rerankScore: 0.8 })),
    };
    const r = await retrieve({ query: "q", history: [], userId: "u" }, deps as any);
    expect(r.chunks.length).toBe(1);
    expect(r.chunks[0].chunkId).toBe("s1");
    expect(r.chunks[0].page).toBe(5);
  });
});
