import { describe, it, expect, vi } from "vitest";
import { embedTexts, embedText } from "./embed";

describe("embedTexts", () => {
  it("returns one vector per input across batches of <=96 preserving order", async () => {
    const create = vi
      .fn()
      .mockImplementation(async ({ input }: { input: string[] }) => ({
        data: input.map((_, i) => ({ embedding: [i] })),
      }));
    const vecs = await embedTexts(
      Array.from({ length: 100 }, (_, i) => `t${i}`),
      { embeddings: { create } } as any,
    );
    expect(vecs).toHaveLength(100);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0]).toMatchObject({
      model: "text-embedding-3-large",
      dimensions: 1024,
      encoding_format: "float",
    });
    // batch sizes: 96 then 4
    expect(create.mock.calls[0][0].input).toHaveLength(96);
    expect(create.mock.calls[1][0].input).toHaveLength(4);
    // order preserved: each batch restarts embedding at index 0
    expect(vecs[0]).toEqual([0]);
    expect(vecs[95]).toEqual([95]);
    expect(vecs[96]).toEqual([0]);
    expect(vecs[99]).toEqual([3]);
  });

  it("replaces newlines with spaces in inputs", async () => {
    const create = vi
      .fn()
      .mockImplementation(async ({ input }: { input: string[] }) => ({
        data: input.map(() => ({ embedding: [1] })),
      }));
    await embedTexts(["a\nb\nc"], { embeddings: { create } } as any);
    expect(create.mock.calls[0][0].input).toEqual(["a b c"]);
  });

  it("returns [] for empty input without calling the client", async () => {
    const create = vi.fn();
    const vecs = await embedTexts([], { embeddings: { create } } as any);
    expect(vecs).toEqual([]);
    expect(create).not.toHaveBeenCalled();
  });
});

describe("embedText", () => {
  it("returns a single vector", async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ data: [{ embedding: [1, 2, 3] }] });
    const vec = await embedText("hello", { embeddings: { create } } as any);
    expect(vec).toEqual([1, 2, 3]);
  });
});
