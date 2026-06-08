import { describe, it, expect } from "vitest";
import { buildRewritePrompt, rewriteQuery } from "./rewrite";
it("includes latest question and standalone instruction", () => {
  const msgs = buildRewritePrompt([{ role: "user", content: "Tell me about Acme" }], "what about its margins?");
  const text = JSON.stringify(msgs);
  expect(text).toContain("its margins");
  expect(text.toLowerCase()).toContain("standalone");
});
it("falls back to latest on llm error", async () => {
  const out = await rewriteQuery([], "hi", async () => { throw new Error("x"); });
  expect(out).toBe("hi");
});
