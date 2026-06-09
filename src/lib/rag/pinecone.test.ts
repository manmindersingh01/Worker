import { describe, it, expect, vi } from "vitest";
import {
  namespaceFor,
  upsertChunks,
  denseQuery,
  deleteByDocument,
} from "./pinecone";

function fakeIndex() {
  const upsert = vi.fn().mockResolvedValue(undefined);
  const query = vi.fn().mockResolvedValue({ matches: [] });
  const deleteMany = vi.fn().mockResolvedValue(undefined);
  const namespace = vi.fn().mockReturnValue({ upsert, query, deleteMany });
  return { index: { namespace } as any, namespace, upsert, query, deleteMany };
}

describe("namespaceFor", () => {
  it("prefixes user id", () => {
    expect(namespaceFor("abc")).toBe("user:abc");
  });
});

describe("upsertChunks", () => {
  it("maps records to vectors with metadata and upserts to the namespace", async () => {
    const f = fakeIndex();
    await upsertChunks(
      "user:u1",
      [{ id: "c1", values: [0.1], documentId: "d1", page: 3 }],
      f.index,
    );
    expect(f.namespace).toHaveBeenCalledWith("user:u1");
    expect(f.upsert).toHaveBeenCalledWith([
      {
        id: "c1",
        values: [0.1],
        metadata: { chunkId: "c1", documentId: "d1", page: 3 },
      },
    ]);
  });

  it("batches upserts into groups of 100", async () => {
    const f = fakeIndex();
    const records = Array.from({ length: 250 }, (_, i) => ({
      id: `c${i}`,
      values: [i],
      documentId: "d1",
      page: i,
    }));
    await upsertChunks("user:u1", records, f.index);

    expect(f.upsert).toHaveBeenCalledTimes(3);
    expect(f.upsert.mock.calls[0][0]).toHaveLength(100);
    expect(f.upsert.mock.calls[1][0]).toHaveLength(100);
    expect(f.upsert.mock.calls[2][0]).toHaveLength(50);

    // metadata mapping preserved across batches
    expect(f.upsert.mock.calls[0][0][0]).toEqual({
      id: "c0",
      values: [0],
      metadata: { chunkId: "c0", documentId: "d1", page: 0 },
    });
    expect(f.upsert.mock.calls[2][0][49]).toEqual({
      id: "c249",
      values: [249],
      metadata: { chunkId: "c249", documentId: "d1", page: 249 },
    });
  });
});

describe("denseQuery", () => {
  it("includes filter only when provided", async () => {
    const f = fakeIndex();
    f.query.mockResolvedValue({ matches: [{ id: "a" }, { id: "b" }] });

    const withFilter = await denseQuery(
      "user:u1",
      [1, 2],
      5,
      { documentId: { $in: ["d1"] } },
      f.index,
    );
    expect(withFilter).toEqual([{ id: "a" }, { id: "b" }]);
    expect(f.query).toHaveBeenCalledWith({
      vector: [1, 2],
      topK: 5,
      includeMetadata: true,
      filter: { documentId: { $in: ["d1"] } },
    });

    f.query.mockClear();
    await denseQuery("user:u1", [1, 2], 5, undefined, f.index);
    expect(f.query).toHaveBeenCalledWith({
      vector: [1, 2],
      topK: 5,
      includeMetadata: true,
    });
    expect(f.query.mock.calls[0][0]).not.toHaveProperty("filter");
  });

  it("returns [] when no matches", async () => {
    const f = fakeIndex();
    f.query.mockResolvedValue({});
    const r = await denseQuery("user:u1", [1], 5, undefined, f.index);
    expect(r).toEqual([]);
  });
});

describe("deleteByDocument", () => {
  it("calls deleteMany with the documentId filter", async () => {
    const f = fakeIndex();
    await deleteByDocument("user:u1", "d1", f.index);
    expect(f.deleteMany).toHaveBeenCalledWith({ documentId: "d1" });
  });

  it("swallows errors", async () => {
    const f = fakeIndex();
    f.deleteMany.mockRejectedValue(new Error("not found"));
    await expect(
      deleteByDocument("user:u1", "d1", f.index),
    ).resolves.toBeUndefined();
  });
});
