import { describe, it, expect } from "vitest";
import { buildContextPrompt, contextualizeChunk } from "~/lib/rag/contextualize";

describe("contextualizeChunk", () => {
  it("prefixes context then the chunk", async () => {
    const out = await contextualizeChunk(
      "Annual Report",
      "Revenue grew 10%.",
      async () => "From the Q3 financials section.",
    );
    expect(out).toBe("From the Q3 financials section.\n\nRevenue grew 10%.");
  });

  it("returns chunk unchanged on llm error", async () => {
    const out = await contextualizeChunk("D", "body", async () => {
      throw new Error("x");
    });
    expect(out).toBe("body");
  });

  it("returns chunk unchanged on empty llm output", async () => {
    const out = await contextualizeChunk("D", "body", async () => "   ");
    expect(out).toBe("body");
  });
});

describe("buildContextPrompt", () => {
  it("prompt includes title and chunk", () => {
    const p = buildContextPrompt("MyDoc", "some content");
    expect(p).toContain("MyDoc");
    expect(p).toContain("some content");
  });
});
