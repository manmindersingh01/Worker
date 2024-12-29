import { Pinecone } from "@pinecone-database/pinecone";
import { removeNonAsciiChar } from "./utils";
import { getEmbeddings } from "./emmebding";

export async function getMachesFromEmbedding(
  embedding: number[],
  fileKey: string,
) {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.Index("chat-pdf");
  try {
    const nameSpace = removeNonAsciiChar(fileKey);
    const queryResults = await index.namespace(nameSpace).query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });
    return queryResults.matches || [];
  } catch (error) {}
}

export async function getContext(query: string, fileKey: string) {
  console.log("entered context function", query);

  const queryEmbeddings = await getEmbeddings(query);
  console.log(
    "----------------------------------------------------------------These are embedding of query",
    queryEmbeddings,
  );

  const matches = await getMachesFromEmbedding(queryEmbeddings, fileKey);
  console.log("----matches query from pinecone:", matches);

  const qualifyingDocs = matches.filter(
    (matches) => matches.score && matches.score >= 0.7,
  );
  console.log("-------------------docs that quilify criteria:", qualifyingDocs);

  type Metadat = { text: string };
  let docs = [];

  qualifyingDocs.map((match) => docs.push(match.metadata.text));
  const result = docs.join("\n").substring(0, 3000);
  console.log("result of context function:", result);
  return result;
}
