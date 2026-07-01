import { describe, it, expect } from "vitest";
import { runReadiness } from "./graph";
import type { ReadinessPersistence } from "./persist";
import type { JudgeOutput } from "./assess";
import type { GapSummary, ItemAssessment } from "./types";
import type { Blueprint } from "./types";
import type { RetrieveResult } from "~/lib/rag/retrieve";

const blueprint: Blueprint = {
  id: "test-bp",
  jurisdiction: "TT",
  jurisdictionLabel: "Testland",
  title: "Test",
  version: "1",
  authority: "Test",
  summary: "",
  categories: [{ key: "c", title: "C" }],
  items: [
    { key: "a", title: "Doc A", category: "c", weight: 3, query: "q", evidence: "e" },
    { key: "b", title: "Doc B", category: "c", weight: 2, query: "q", evidence: "e" },
  ],
};

function fakePersistence() {
  const state = {
    running: false,
    events: [] as { node: string; message: string }[],
    items: [] as ItemAssessment[],
    finalized: null as { score: number } | null,
    failed: null as string | null,
  };
  const p: ReadinessPersistence = {
    markRunning: () => {
      state.running = true;
      return Promise.resolve();
    },
    logEvent: (_r, node, message) => {
      state.events.push({ node, message });
      return Promise.resolve();
    },
    saveItems: (_r, items) => {
      state.items.push(...items);
      return Promise.resolve();
    },
    finalize: (_r, score) => {
      state.finalized = { score: score.score };
      return Promise.resolve();
    },
    fail: (_r, error) => {
      state.failed = error;
      return Promise.resolve();
    },
  };
  return { p, state };
}

const retrieveOk = (): Promise<RetrieveResult> =>
  Promise.resolve({
    query: "q",
    chunks: [
      { chunkId: "1", documentId: "d", docName: "Doc A", page: 1, content: "x", score: 1 },
    ],
    weakContext: false,
  });

const judgePresent = (): Promise<JudgeOutput> =>
  Promise.resolve({
    status: "PRESENT",
    confidence: 1,
    rationale: "ok",
    recommendation: null,
    citedPages: [{ docName: "Doc A", page: 1 }],
  });

const summarize = (): Promise<GapSummary> =>
  Promise.resolve({ headline: "Audit-ready.", topFixes: [] });

describe("runReadiness (LangGraph coordinator)", () => {
  it("runs load -> assess -> score -> explain -> finalize and persists each step", async () => {
    const { p, state } = fakePersistence();
    const result = await runReadiness(
      { runId: "run1", userId: "u", sessionId: "s", blueprint },
      {
        persist: p,
        assess: { retrieve: retrieveOk, judge: judgePresent },
        explain: { summarize },
      },
    );

    expect(state.running).toBe(true);
    expect(state.items).toHaveLength(2);
    expect(result.score.score).toBe(100);
    expect(state.finalized).toEqual({ score: 100 });

    // The audit trail visits every node in order.
    const nodes = state.events.map((e) => e.node);
    for (const n of ["load", "assess", "score", "explain", "finalize"]) {
      expect(nodes).toContain(n);
    }
    expect(nodes.indexOf("load")).toBeLessThan(nodes.indexOf("finalize"));
  });

  it("marks the run FAILED and rethrows when a node throws", async () => {
    const { p, state } = fakePersistence();
    const boom: ReadinessPersistence = {
      ...p,
      saveItems: () => Promise.reject(new Error("db exploded")),
    };

    await expect(
      runReadiness(
        { runId: "run2", userId: "u", sessionId: "s", blueprint },
        {
          persist: boom,
          assess: { retrieve: retrieveOk, judge: judgePresent },
          explain: { summarize },
        },
      ),
    ).rejects.toThrow(/db exploded/);

    expect(state.failed).toMatch(/db exploded/);
  });
});
