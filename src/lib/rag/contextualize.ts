import OpenAI from "openai";

const CONTEXT_MODEL = "gpt-4o-mini";

/**
 * Build a prompt asking the model for a short (<=2 sentence) context that
 * situates a chunk within its document, for retrieval purposes.
 */
export function buildContextPrompt(
  docTitle: string,
  chunkContent: string,
): string {
  return [
    `You are situating a chunk of text within a larger document for search retrieval.`,
    `Document title: ${docTitle}`,
    ``,
    `Chunk:`,
    chunkContent,
    ``,
    `Write a short context (at most 2 sentences) that situates this chunk within the overall document so it can be found by search. Respond with only the context and nothing else.`,
  ].join("\n");
}

/**
 * Produce a contextualized chunk by prefixing an LLM-generated context.
 * On empty output or any error, returns the original chunk unchanged.
 */
export async function contextualizeChunk(
  docTitle: string,
  chunkContent: string,
  llm: (prompt: string) => Promise<string>,
): Promise<string> {
  try {
    const prefix = (await llm(buildContextPrompt(docTitle, chunkContent))).trim();
    if (!prefix) return chunkContent;
    return `${prefix}\n\n${chunkContent}`;
  } catch {
    return chunkContent;
  }
}

let defaultClient: OpenAI | undefined;

/**
 * Default LLM for contextualization: a cheap OpenAI chat model.
 * Lazily imports env so test (which inject a fake llm) stay env-free.
 */
export async function defaultContextLlm(prompt: string): Promise<string> {
  if (!defaultClient) {
    const { env } = await import("~/server/env");
    defaultClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  const res = await defaultClient.chat.completions.create({
    model: CONTEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
  });
  return res.choices[0]?.message?.content ?? "";
}
