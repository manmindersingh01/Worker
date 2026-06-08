import OpenAI from "openai";

export interface OpenAILike {
  embeddings: {
    create: (args: {
      model: string;
      input: string[];
      dimensions: number;
      encoding_format: "float";
    }) => Promise<{ data: { embedding: number[] }[] }>;
  };
}

const MODEL = "text-embedding-3-large";
const DIMENSIONS = 1536;
const BATCH_SIZE = 96;

let defaultClient: OpenAILike | undefined;
async function getDefaultClient(): Promise<OpenAILike> {
  if (!defaultClient) {
    const { env } = await import("~/server/env");
    defaultClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    }) as unknown as OpenAILike;
  }
  return defaultClient;
}

export async function embedTexts(
  texts: string[],
  client?: OpenAILike,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const c = client ?? (await getDefaultClient());
  const inputs = texts.map((t) => t.replace(/\n/g, " "));
  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);
    const res = await c.embeddings.create({
      model: MODEL,
      input: batch,
      dimensions: DIMENSIONS,
      encoding_format: "float",
    });
    for (const d of res.data) out.push(d.embedding);
  }
  return out;
}

export async function embedText(
  text: string,
  client?: OpenAILike,
): Promise<number[]> {
  const [vec] = await embedTexts([text], client);
  return vec ?? [];
}
