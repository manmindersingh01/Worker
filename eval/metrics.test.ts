import { describe, it, expect } from "vitest";
import { recallAtK, mrr, meanMetric } from "./metrics";

describe("recallAtK", () => {
  it("counts relevant ids found within top-k", () => {
    expect(recallAtK(["a", "b", "c", "d"], ["a", "d"], 3)).toBe(0.5); // only "a" in top3
    expect(recallAtK(["a", "b", "c", "d"], ["a", "d"], 4)).toBe(1);
  });
  it("returns 1 when nothing is relevant", () => {
    expect(recallAtK(["a"], [], 3)).toBe(1);
  });
});

describe("mrr", () => {
  it("uses reciprocal rank of first hit", () => {
    expect(mrr(["x", "a", "b"], ["a"])).toBeCloseTo(1 / 2);
    expect(mrr(["a"], ["a"])).toBe(1);
    expect(mrr(["x", "y"], ["a"])).toBe(0);
  });
});

describe("meanMetric", () => {
  it("averages and handles empty", () => {
    expect(meanMetric([1, 0])).toBe(0.5);
    expect(meanMetric([])).toBe(0);
  });
});
