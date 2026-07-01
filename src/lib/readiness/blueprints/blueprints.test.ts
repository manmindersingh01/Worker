import { describe, it, expect } from "vitest";
import {
  assertBlueprintValid,
  getBlueprint,
  getBlueprintByJurisdiction,
  listBlueprints,
  DEFAULT_BLUEPRINT_ID,
} from "./index";

describe("blueprint registry", () => {
  it("every registered blueprint is internally consistent", () => {
    for (const b of listBlueprints()) {
      expect(() => assertBlueprintValid(b)).not.toThrow();
    }
  });

  it("exposes the default blueprint by id and jurisdiction", () => {
    const byId = getBlueprint(DEFAULT_BLUEPRINT_ID);
    expect(byId).toBeDefined();
    expect(getBlueprintByJurisdiction(byId!.jurisdiction)).toBe(byId);
  });

  it("returns undefined for an unknown blueprint id", () => {
    expect(getBlueprint("does-not-exist")).toBeUndefined();
  });
});

describe("CDSCO blueprint content", () => {
  const cdsco = getBlueprint("cdsco-ndct-2019")!;

  it("carries the India-specific credibility items", () => {
    const keys = new Set(
      cdsco.items.filter((i) => i.indiaSpecific).map((i) => i.key),
    );
    for (const k of [
      "ctri-registration",
      "ec-registration",
      "icf-english-local",
      "av-consent",
      "trial-insurance",
      "compensation-provision",
    ]) {
      expect(keys.has(k)).toBe(true);
    }
  });

  it("gives every item a retrieval query and evidence definition", () => {
    for (const item of cdsco.items) {
      expect(item.query.trim().length).toBeGreaterThan(0);
      expect(item.evidence.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("assertBlueprintValid", () => {
  const base = getBlueprint("cdsco-ndct-2019")!;

  it("rejects an item pointing at an unknown category", () => {
    const broken = {
      ...base,
      items: [{ ...base.items[0]!, category: "nope" }],
    };
    expect(() => assertBlueprintValid(broken)).toThrow(/unknown category/);
  });

  it("rejects a non-positive weight", () => {
    const broken = { ...base, items: [{ ...base.items[0]!, weight: 0 }] };
    expect(() => assertBlueprintValid(broken)).toThrow(/invalid weight/);
  });

  it("rejects duplicate item keys", () => {
    const broken = { ...base, items: [base.items[0]!, base.items[0]!] };
    expect(() => assertBlueprintValid(broken)).toThrow(/duplicate item key/);
  });
});
