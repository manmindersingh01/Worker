import { describe, it, expect } from "vitest";
import { hydrateChunks, type HydrateDbLike } from "./hydrate";

describe("hydrateChunks", () => {
  it("maps chunk ids to RetrievedChunk with docName from document.name", async () => {
    const db: HydrateDbLike = {
      chunk: {
        findMany: async () => [
          {
            id: "a",
            content: "alpha",
            page: 1,
            documentId: "doc1",
            document: { name: "First Doc" },
          },
          {
            id: "b",
            content: "beta",
            page: 3,
            documentId: "doc2",
            document: { name: "Second Doc" },
          },
        ],
      },
    };

    const map = await hydrateChunks(["a", "b"], db);

    expect(map.size).toBe(2);
    expect(map.get("a")).toEqual({
      chunkId: "a",
      documentId: "doc1",
      docName: "First Doc",
      page: 1,
      content: "alpha",
      score: 0,
    });
    expect(map.get("b")?.docName).toBe("Second Doc");
    expect(map.get("b")?.page).toBe(3);
  });
});
