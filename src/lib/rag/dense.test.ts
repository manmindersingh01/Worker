import { describe, it, expect, vi } from "vitest";
import { denseSearch } from "./dense";

function fakeIndex(matches: { id: string }[]) {
  const query = vi.fn().mockResolvedValue({ matches });
  const namespace = vi.fn().mockReturnValue({ query });
  return { index: { namespace } as any, namespace, query };
}

describe("denseSearch", () => {
  it("embeds query, queries namespace, returns ranked candidates with no filter when no documentIds", async () => {
    const f = fakeIndex([{ id: "c1" }, { id: "c2" }, { id: "c3" }]);
    const embed = vi.fn().mockResolvedValue([0.1, 0.2]);

    const res = await denseSearch(
      "what is x",
      { userId: "u1" },
      { embed, index: f.index },
    );

    expect(embed).toHaveBeenCalledWith("what is x");
    expect(f.namespace).toHaveBeenCalledWith("user:u1");
    const queryArg = f.query.mock.calls[0][0];
    expect(queryArg.vector).toEqual([0.1, 0.2]);
    expect(queryArg.topK).toBe(40);
    expect(queryArg).not.toHaveProperty("filter");
    expect(res).toEqual([
      { chunkId: "c1", rank: 0 },
      { chunkId: "c2", rank: 1 },
      { chunkId: "c3", rank: 2 },
    ]);
  });

  it("includes $in filter when documentIds provided and respects topK override", async () => {
    const f = fakeIndex([{ id: "c1" }]);
    const embed = vi.fn().mockResolvedValue([1]);

    const res = await denseSearch(
      "q",
      { userId: "u1", documentIds: ["d1", "d2"] },
      { embed, index: f.index, topK: 10 },
    );

    const queryArg = f.query.mock.calls[0][0];
    expect(queryArg.topK).toBe(10);
    expect(queryArg.filter).toEqual({ documentId: { $in: ["d1", "d2"] } });
    expect(res).toEqual([{ chunkId: "c1", rank: 0 }]);
  });

  it("omits filter when documentIds is an empty array", async () => {
    const f = fakeIndex([]);
    const embed = vi.fn().mockResolvedValue([1]);
    await denseSearch(
      "q",
      { userId: "u1", documentIds: [] },
      { embed, index: f.index },
    );
    expect(f.query.mock.calls[0][0]).not.toHaveProperty("filter");
  });
});
