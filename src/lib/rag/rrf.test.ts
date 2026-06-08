import { describe, it, expect } from "vitest";
import { reciprocalRankFusion } from "./rrf";
describe("reciprocalRankFusion", () => {
  it("ranks an item appearing high in both lists first", () => {
    expect(reciprocalRankFusion([["a","b","c"],["a","d","b"]], 60)[0]).toBe("a");
  });
  it("dedupes and includes items from any list", () => {
    expect(new Set(reciprocalRankFusion([["x"],["y"]], 60))).toEqual(new Set(["x","y"]));
  });
  it("returns [] for empty input", () => {
    expect(reciprocalRankFusion([], 60)).toEqual([]);
  });
});
