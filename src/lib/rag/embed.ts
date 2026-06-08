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
// Must match the Pinecone index dimension. The provisioned `chat-pdf-v2` index
// is 1024-dim; text-embedding-3-large supports 1024 via Matryoshka with
// negligible quality loss. If you recreate the index at 1536, change this to 1536.
const DIMENSIONS = 1024;
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
