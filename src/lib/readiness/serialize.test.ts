import { describe, it, expect } from "vitest";
import { serializeRun } from "./serialize";
import { getBlueprint } from "./blueprints";
import type { ReadinessItemResult, ReadinessRun } from "@prisma/client";

const blueprint = getBlueprint("cdsco-ndct-2019")!;

function run(overrides: Partial<ReadinessRun> = {}): ReadinessRun {
  return {
    id: "run1",
    sessionId: "s1",
    userId: "u1",
    jurisdiction: "IN-CDSCO",
    blueprintId: "cdsco-ndct-2019",
    blueprintVersion: "2019.1",
    status: "COMPLETED",
    score: 62,
    maxWeight: 54,
    earnedWeight: 33.5,
    headline: "Not ready (62%): missing CTRI registration.",
    topFixes: ["Register with CTRI."] as unknown as ReadinessRun["topFixes"],
    categoryScores: [] as unknown as ReadinessRun["categoryScores"],
    error: null,
    createdAt: new Date("2026-07-01T10:00:00Z"),
    startedAt: new Date("2026-07-01T10:00:01Z"),
    completedAt: new Date("2026-07-01T10:00:30Z"),
    ...overrides,
  };
}

function item(
  overrides: Partial<ReadinessItemResult> = {},
): ReadinessItemResult {
  return {
    id: "i1",
    runId: "run1",
    itemKey: "ctri-registration",
    category: "regulatory",
    title: "CTRI registration (before first enrolment)",
    status: "MISSING",
    weight: 4,
    confidence: 0.7,
    rationale: "No CTRI registration found.",
    recommendation: "Register the trial with CTRI.",
    citations: [] as unknown as ReadinessItemResult["citations"],
    createdAt: new Date("2026-07-01T10:00:10Z"),
    ...overrides,
  };
}

describe("serializeRun", () => {
  it("merges blueprint metadata (india flag, reference, category title)", () => {
    const out = serializeRun({ ...run(), items: [item()] }, blueprint);
    const ctri = out.items[0]!;
    expect(ctri.indiaSpecific).toBe(true);
    expect(ctri.reference).toMatch(/Clinical Trials Registry/i);
    expect(ctri.categoryTitle).toBe("Regulatory approvals");
    expect(out.jurisdictionLabel).toBe("India - CDSCO");
    expect(out.authority).toMatch(/New Drugs and Clinical Trials Rules/);
  });

  it("passes citations and topFixes through from JSON columns", () => {
    const citations = [
      { documentId: "d1", docName: "Insurance", page: 1, snippet: "..." },
    ];
    const out = serializeRun(
      {
        ...run({
          topFixes: ["Fix A", "Fix B"] as unknown as ReadinessRun["topFixes"],
        }),
        items: [
          item({
            citations: citations as unknown as ReadinessItemResult["citations"],
          }),
        ],
      },
      blueprint,
    );
    expect(out.topFixes).toEqual(["Fix A", "Fix B"]);
    expect(out.items[0]!.citations).toEqual(citations);
  });

  it("degrades gracefully when the blueprint is unknown", () => {
    const out = serializeRun({ ...run(), items: [item()] }, undefined);
    expect(out.jurisdictionLabel).toBe("IN-CDSCO"); // falls back to code
    expect(out.items[0]!.indiaSpecific).toBe(false);
    expect(out.items[0]!.categoryTitle).toBe("regulatory"); // key, no title
  });

  it("serialises timestamps to ISO strings", () => {
    const out = serializeRun({ ...run(), items: [] }, blueprint);
    expect(out.createdAt).toBe("2026-07-01T10:00:00.000Z");
    expect(out.completedAt).toBe("2026-07-01T10:00:30.000Z");
  });
});
