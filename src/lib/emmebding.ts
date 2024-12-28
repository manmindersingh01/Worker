import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getEmbeddings(text: string) {
  try {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text.replace(/\n/g, " "),
      encoding_format: "float",
    });
    console.log(embedding);
    return embedding.data[0].embedding as number[];
  } catch (error) {
    console.error("Error calling open ai embeddings model:", error);
    throw error;
  }
}
