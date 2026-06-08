import { describe, it, expect } from "vitest";
import { parseCitations, verifyCitations } from "./citations";
describe("citations", () => {
  it("parses [Doc p.3] style refs", () => {
    expect(parseCitations("As shown [Report p.3] and [Report p.12].")).toEqual([
      { docName: "Report", page: 3 }, { docName: "Report", page: 12 }]);
  });
  it("tolerates a space after p.", () => {
    expect(parseCitations("see [My Report p. 7]")).toEqual([{ docName: "My Report", page: 7 }]);
  });
  it("keeps only citations backed by retrieved chunks", () => {
    expect(verifyCitations(
      [{ docName: "Report", page: 3 }, { docName: "Ghost", page: 1 }],
      [{ docName: "Report", page: 3 }])).toEqual([{ docName: "Report", page: 3 }]);
  });
});
