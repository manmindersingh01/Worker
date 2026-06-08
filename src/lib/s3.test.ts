import { describe, it, expect } from "vitest";
import { buildObjectKey } from "~/lib/s3";

describe("buildObjectKey", () => {
  it("prefixes the key with uploads/<userId>/", () => {
    const key = buildObjectKey("user_123", "report.pdf");
    expect(key.startsWith("uploads/user_123/")).toBe(true);
  });

  it("preserves a sanitized form of the file name", () => {
    const key = buildObjectKey("u1", "Q3 final (v2).pdf");
    // spaces / parens become dashes; allowed chars (. - _) survive
    expect(key).toContain("Q3-final-v2-.pdf");
    expect(key).not.toMatch(/\s/);
  });

  it("produces unique keys for the same inputs", () => {
    const a = buildObjectKey("u1", "a.pdf");
    const b = buildObjectKey("u1", "a.pdf");
    expect(a).not.toBe(b);
  });
});
