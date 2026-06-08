export type ChatMessage = { role: "user" | "assistant"; content: string };
export type RewriteMessage = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM_INSTRUCTION =
  "Given the conversation history and the user's latest question, rewrite the latest question as a standalone question that can be understood without the prior context. Resolve any pronouns or references using the history. Respond with only the rewritten standalone question and nothing else.";

export function buildRewritePrompt(
  history: ChatMessage[],
  latest: string,
): RewriteMessage[] {
  return [
    { role: "system", content: SYSTEM_INSTRUCTION },
    ...history,
    { role: "user", content: latest },
  ];
}

export async function rewriteQuery(
  history: ChatMessage[],
  latest: string,
  llm: (msgs: RewriteMessage[]) => Promise<string>,
): Promise<string> {
  try {
    const result = (await llm(buildRewritePrompt(history, latest))).trim();
    return result || latest;
  } catch {
    return latest;
  }
}
