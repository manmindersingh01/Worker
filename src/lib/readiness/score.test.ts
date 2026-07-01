import { describe, it, expect } from "vitest";
import { scoreReadiness, STATUS_FRACTION } from "./score";
import type { Blueprint, ItemAssessment, ItemStatus } from "./types";

const bp: Blueprint = {
  id: "test",
  jurisdiction: "TT",
  jurisdictionLabel: "Test",
  title: "Test blueprint",
  version: "1",
  authority: "Test",
  summary: "",
  categories: [
    { key: "a", title: "Category A" },
    { key: "b", title: "Category B" },
  ],
  items: [
    { key: "a1", title: "A1", category: "a", weight: 3, query: "q", evidence: "e" },
    { key: "a2", title: "A2", category: "a", weight: 1, query: "q", evidence: "e" },
    { key: "b1", title: "B1", category: "b", weight: 2, query: "q", evidence: "e" },
  ],
};

function assess(key: string, status: ItemStatus): ItemAssessment {
  const item = bp.items.find((i) => i.key === key)!;
  return {
    itemKey: key,
    category: item.category,
    title: item.title,
    weight: item.weight,
    status,
    confidence: 1,
    rationale: "",
    recommendation: null,
    citations: [],
  };
}

describe("scoreReadiness", () => {
  it("scores a fully present package at 100", () => {
    const r = scoreReadiness(bp, [
      assess("a1", "PRESENT"),
      assess("a2", "PRESENT"),
      assess("b1", "PRESENT"),
    ]);
    expect(r.score).toBe(100);
    expect(r.earnedWeight).toBe(6);
    expect(r.maxWeight).toBe(6);
    expect(r.counts).toMatchObject({ present: 3, total: 3 });
  });

  it("scores an entirely missing package at 0", () => {
    const r = scoreReadiness(bp, [
      assess("a1", "MISSING"),
      assess("a2", "MISSING"),
      assess("b1", "MISSING"),
    ]);
    expect(r.score).toBe(0);
    expect(r.earnedWeight).toBe(0);
    expect(r.maxWeight).toBe(6);
  });

  it("gives partial items half their weight", () => {
    // a1=PARTIAL(1.5) + a2=PRESENT(1) + b1=MISSING(0) = 2.5 / 6 = 42%
    const r = scoreReadiness(bp, [
      assess("a1", "PARTIAL"),
      assess("a2", "PRESENT"),
      assess("b1", "MISSING"),
    ]);
    expect(r.earnedWeight).toBeCloseTo(2.5);
    expect(r.score).toBe(42);
  });

  it("counts NEEDS_REVIEW as zero credit but keeps it in the denominator", () => {
    const r = scoreReadiness(bp, [
      assess("a1", "PRESENT"),
      assess("a2", "PRESENT"),
      assess("b1", "NEEDS_REVIEW"),
    ]);
    // 4 earned of 6 possible; the unverified item still drags the score down.
    expect(r.maxWeight).toBe(6);
    expect(r.earnedWeight).toBe(4);
    expect(r.score).toBe(67);
    expect(r.counts.needsReview).toBe(1);
  });

  it("treats a blueprint item with no assessment as NEEDS_REVIEW, not absent", () => {
    const r = scoreReadiness(bp, [assess("a1", "PRESENT")]);
    // Only a1 assessed; a2 and b1 default to NEEDS_REVIEW and stay counted.
    expect(r.counts.total).toBe(3);
    expect(r.counts.needsReview).toBe(2);
    expect(r.maxWeight).toBe(6);
    expect(r.earnedWeight).toBe(3);
  });

  it("produces per-category scores in blueprint order", () => {
    const r = scoreReadiness(bp, [
      assess("a1", "PRESENT"),
      assess("a2", "MISSING"),
      assess("b1", "PARTIAL"),
    ]);
    expect(r.categories.map((c) => c.category)).toEqual(["a", "b"]);
    // Category A: 3 of 4 -> 75; Category B: 1 of 2 -> 50.
    expect(r.categories[0]).toMatchObject({ score: 75, earnedWeight: 3, maxWeight: 4 });
    expect(r.categories[1]).toMatchObject({ score: 50, earnedWeight: 1, maxWeight: 2 });
  });

  it("is deterministic - identical inputs give an identical score", () => {
    const input = [
      assess("a1", "PARTIAL"),
      assess("a2", "PRESENT"),
      assess("b1", "NEEDS_REVIEW"),
    ];
    expect(scoreReadiness(bp, input)).toEqual(scoreReadiness(bp, input));
  });

  it("exposes the status weighting it uses", () => {
    expect(STATUS_FRACTION).toEqual({
      PRESENT: 1,
      PARTIAL: 0.5,
      MISSING: 0,
      NEEDS_REVIEW: 0,
    });
  });
});
