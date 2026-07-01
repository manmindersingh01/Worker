import { describe, it, expect, vi } from "vitest";
import { assessItem, assessBlueprint, type JudgeOutput } from "./assess";
import type { RetrieveResult } from "~/lib/rag/retrieve";
import type { RetrievedChunk } from "~/lib/rag/types";
import type { Blueprint, BlueprintItem } from "./types";

const item: BlueprintItem = {
  key: "trial-insurance",
  title: "Clinical trial insurance policy",
  category: "protection",
  weight: 5,
  query: "clinical trial insurance policy",
  evidence: "A valid clinical trial insurance policy covering subjects.",
};

const ctx = { userId: "u1" };

function chunk(over: Partial<RetrievedChunk>): RetrievedChunk {
  return {
    chunkId: "c1",
    documentId: "doc-insurance",
    docName: "Insurance Policy",
    page: 1,
    content: "This policy insures all trial subjects...",
    score: 0.9,
    ...over,
  };
}

function retrieveWith(chunks: RetrievedChunk[], weak = false) {
  return (): Promise<RetrieveResult> =>
    Promise.resolve({ query: item.query, chunks, weakContext: weak });
}

describe("assessItem", () => {
  it("passes through a PRESENT verdict with a verifiable citation", async () => {
    const judge = vi.fn(
      (): Promise<JudgeOutput> =>
        Promise.resolve({
          status: "PRESENT",
          confidence: 0.9,
          rationale: "Policy present and valid.",
          recommendation: null,
          citedPages: [{ docName: "Insurance Policy", page: 1 }],
        }),
    );
    const a = await assessItem(item, ctx, {
      retrieve: retrieveWith([chunk({})]),
      judge,
    });
    expect(a.status).toBe("PRESENT");
    expect(a.citations).toHaveLength(1);
    expect(a.citations[0]).toMatchObject({ documentId: "doc-insurance", page: 1 });
  });

  it("returns MISSING without calling the judge when nothing is retrieved", async () => {
    const judge = vi.fn();
    const a = await assessItem(item, ctx, {
      retrieve: retrieveWith([]),
      judge: judge as never,
    });
    expect(a.status).toBe("MISSING");
    expect(judge).not.toHaveBeenCalled();
    expect(a.recommendation).toMatch(/insurance/i);
  });

  it("downgrades PRESENT to NEEDS_REVIEW when the citation cannot be verified", async () => {
    // Judge cites a page that was never retrieved -> provenance fails.
    const judge = (): Promise<JudgeOutput> =>
      Promise.resolve({
        status: "PRESENT",
        confidence: 0.95,
        rationale: "Looks present.",
        recommendation: null,
        citedPages: [{ docName: "Insurance Policy", page: 9 }],
      });
    const a = await assessItem(item, ctx, {
      retrieve: retrieveWith([chunk({ page: 1 })]),
      judge,
    });
    expect(a.status).toBe("NEEDS_REVIEW");
    expect(a.citations).toHaveLength(0);
    expect(a.rationale).toMatch(/human check/i);
  });

  it("keeps a genuine MISSING verdict from the judge", async () => {
    const judge = (): Promise<JudgeOutput> =>
      Promise.resolve({
        status: "MISSING",
        confidence: 0.8,
        rationale: "Only an unrelated cover letter was found.",
        recommendation: "Add the insurance policy.",
        citedPages: [],
      });
    const a = await assessItem(item, ctx, {
      retrieve: retrieveWith([chunk({ content: "cover letter" })]),
      judge,
    });
    expect(a.status).toBe("MISSING");
    expect(a.recommendation).toBe("Add the insurance policy.");
  });

  it("degrades to NEEDS_REVIEW when retrieval throws", async () => {
    const a = await assessItem(item, ctx, {
      retrieve: () => Promise.reject(new Error("pinecone down")),
      judge: vi.fn() as never,
    });
    expect(a.status).toBe("NEEDS_REVIEW");
    expect(a.confidence).toBe(0);
  });

  it("degrades to NEEDS_REVIEW when the judge throws", async () => {
    const a = await assessItem(item, ctx, {
      retrieve: retrieveWith([chunk({})]),
      judge: () => Promise.reject(new Error("model error")),
    });
    expect(a.status).toBe("NEEDS_REVIEW");
  });

  it("deduplicates citations by document and page", async () => {
    const judge = (): Promise<JudgeOutput> =>
      Promise.resolve({
        status: "PARTIAL",
        confidence: 0.6,
        rationale: "Present but draft.",
        recommendation: "Finalise the policy.",
        citedPages: [
          { docName: "Insurance Policy", page: 1 },
          { docName: "insurance policy", page: 1 }, // same page, different case
        ],
      });
    const a = await assessItem(item, ctx, {
      retrieve: retrieveWith([chunk({ page: 1 })]),
      judge,
    });
    expect(a.status).toBe("PARTIAL");
    expect(a.citations).toHaveLength(1);
  });
});

describe("assessBlueprint", () => {
  const bp: Blueprint = {
    id: "test",
    jurisdiction: "TT",
    jurisdictionLabel: "Test",
    title: "Test",
    version: "1",
    authority: "Test",
    summary: "",
    categories: [{ key: "protection", title: "Protection" }],
    items: [
      { ...item, key: "a" },
      { ...item, key: "b" },
      { ...item, key: "c" },
    ],
  };

  it("assesses every item, preserves order, and reports progress", async () => {
    const judge = (): Promise<JudgeOutput> =>
      Promise.resolve({
        status: "PRESENT",
        confidence: 1,
        rationale: "ok",
        recommendation: null,
        citedPages: [{ docName: "Insurance Policy", page: 1 }],
      });
    const seen: string[] = [];
    const results = await assessBlueprint(
      bp,
      ctx,
      { retrieve: retrieveWith([chunk({})]), judge },
      { concurrency: 2, onItem: (a) => seen.push(a.itemKey) },
    );
    expect(results.map((r) => r.itemKey)).toEqual(["a", "b", "c"]);
    expect(new Set(seen)).toEqual(new Set(["a", "b", "c"]));
  });
});
