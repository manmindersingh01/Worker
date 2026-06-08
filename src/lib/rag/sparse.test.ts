import { describe, it, expect, vi } from "vitest";
import { sparseSearch } from "./sparse";

describe("sparseSearch", () => {
  it("maps rows to ranked candidates", async () => {
    const $queryRaw = vi.fn().mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    const res = await sparseSearch("hello", { userId: "u1" }, { $queryRaw });
    expect(res).toEqual([
      { chunkId: "c1", rank: 0 },
      { chunkId: "c2", rank: 1 },
    ]);
    expect($queryRaw).toHaveBeenCalledTimes(1);
  });

  it("works with documentIds provided without throwing", async () => {
    const $queryRaw = vi.fn().mockResolvedValue([{ id: "c1" }]);
    const res = await sparseSearch(
      "hello",
      { userId: "u1", documentIds: ["d1", "d2"] },
      { $queryRaw },
    );
    expect(res).toEqual([{ chunkId: "c1", rank: 0 }]);
  });

  it("returns [] on error (FTS must never crash a query)", async () => {
    const $queryRaw = vi.fn().mockRejectedValue(new Error("boom"));
    const res = await sparseSearch("hello", { userId: "u1" }, { $queryRaw });
    expect(res).toEqual([]);
  });
});
