import { describe, it, expect } from "vitest";
import {
  rankGaps,
  deterministicSummary,
  explainGaps,
  stripFixOrdinal,
} from "./explain";
import { scoreReadiness } from "./score";
import type { Blueprint, ItemAssessment, ItemStatus } from "./types";

const bp: Blueprint = {
  id: "test",
  jurisdiction: "TT",
  jurisdictionLabel: "Testland",
  title: "Test",
  version: "1",
  authority: "Test",
  summary: "",
  categories: [{ key: "c", title: "C" }],
  items: [
    { key: "insurance", title: "Trial insurance", category: "c", weight: 5, query: "q", evidence: "e" },
    { key: "protocol", title: "Protocol", category: "c", weight: 4, query: "q", evidence: "e" },
    { key: "gcp", title: "GCP training", category: "c", weight: 2, query: "q", evidence: "e" },
    { key: "ib", title: "Investigator brochure", category: "c", weight: 2, query: "q", evidence: "e" },
  ],
};

function assess(
  key: string,
  status: ItemStatus,
  recommendation: string | null = null,
): ItemAssessment {
  const item = bp.items.find((i) => i.key === key)!;
  return {
    itemKey: key,
    category: item.category,
    title: item.title,
    weight: item.weight,
    status,
    confidence: 1,
    rationale: "",
    recommendation,
    citations: [],
  };
}

describe("rankGaps", () => {
  it("excludes present items and orders by readiness cost", () => {
    const gaps = rankGaps([
      assess("insurance", "MISSING"), // lost 5
      assess("protocol", "PRESENT"), // excluded
      assess("gcp", "MISSING"), // lost 2
      assess("ib", "PARTIAL"), // lost 1
    ]);
    expect(gaps.map((g) => g.itemKey)).toEqual(["insurance", "gcp", "ib"]);
  });

  it("orders MISSING before NEEDS_REVIEW at equal cost", () => {
    const gaps = rankGaps([
      assess("gcp", "NEEDS_REVIEW"), // lost 2
      assess("ib", "MISSING"), // lost 2
    ]);
    expect(gaps.map((g) => g.status)).toEqual(["MISSING", "NEEDS_REVIEW"]);
  });
});

describe("deterministicSummary", () => {
  it("declares audit-ready when there are no gaps", () => {
    const assessments = bp.items.map((i) => assess(i.key, "PRESENT"));
    const score = scoreReadiness(bp, assessments);
    const s = deterministicSummary({ blueprint: bp, score, gaps: [] });
    expect(s.headline).toMatch(/audit-ready/i);
    expect(s.topFixes).toEqual([]);
  });

  it("names the missing items and lists deduped fixes", () => {
    const assessments = [
      assess("insurance", "MISSING", "Add the insurance policy."),
      assess("protocol", "MISSING", "Add the protocol."),
      assess("gcp", "PARTIAL", "Renew GCP training."),
      assess("ib", "PRESENT"),
    ];
    const score = scoreReadiness(bp, assessments);
    const gaps = rankGaps(assessments);
    const s = deterministicSummary({ blueprint: bp, score, gaps });
    expect(s.headline.toLowerCase()).toContain("not ready");
    expect(s.headline.toLowerCase()).toContain("trial insurance");
    expect(s.topFixes).toContain("Add the insurance policy.");
    expect(s.topFixes.length).toBeLessThanOrEqual(3);
  });

  it("strips list ordinals/bullets a model may bake into a fix", () => {
    expect(stripFixOrdinal("1. Secure the insurance policy")).toBe(
      "Secure the insurance policy",
    );
    expect(stripFixOrdinal("2) Obtain CTRI registration")).toBe(
      "Obtain CTRI registration",
    );
    expect(stripFixOrdinal("- Renew GCP training")).toBe("Renew GCP training");
    expect(stripFixOrdinal("• Add the AV consent recording")).toBe(
      "Add the AV consent recording",
    );
    // A bare sentence is left untouched (no false stripping of "3M" etc.).
    expect(stripFixOrdinal("Register with CDSCO")).toBe("Register with CDSCO");
  });

  it("only names genuinely missing items after 'missing'", () => {
    // One MISSING item alongside a PARTIAL and a NEEDS_REVIEW one: the headline
    // must not label the partial/needs-review items as missing.
    const assessments = [
      assess("insurance", "MISSING", "Add insurance."),
      assess("protocol", "PARTIAL", "Finalise the protocol."),
      assess("gcp", "NEEDS_REVIEW"),
      assess("ib", "PRESENT"),
    ];
    const score = scoreReadiness(bp, assessments);
    const gaps = rankGaps(assessments);
    const s = deterministicSummary({ blueprint: bp, score, gaps });
    const h = s.headline.toLowerCase();
    expect(h).toContain("missing trial insurance");
    expect(h).not.toContain("protocol"); // PARTIAL - not "missing"
    expect(h).not.toContain("gcp"); // NEEDS_REVIEW - not "missing"
  });
});

describe("explainGaps", () => {
  it("uses the injected summarizer over the ranked gaps", async () => {
    const assessments = [
      assess("insurance", "MISSING"),
      assess("protocol", "PRESENT"),
    ];
    const score = scoreReadiness(bp, assessments);
    const out = await explainGaps(bp, score, assessments, {
      summarize: (input) =>
        Promise.resolve({
          headline: `custom for ${input.gaps.length} gaps`,
          topFixes: ["fix it"],
        }),
    });
    expect(out.headline).toBe("custom for 1 gaps");
  });
});
