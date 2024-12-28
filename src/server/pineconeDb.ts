import { Pinecone } from "@pinecone-database/pinecone";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

import { downloadAndSavePDFs } from "~/lib/download-server";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { getEmbeddings } from "~/lib/emmebding";
import md5 from "md5";
import { Vector } from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch/db_data";
import { removeNonAsciiChar } from "~/lib/utils";

let pinecone: Pinecone | null = null;
//const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
type PDFPage = {
  pageContent: string;
  metadata: {
    source: string;
    pdf: object;
    loc: object;
  };
  id: undefined;
};
export const pineconeClient = async () => {
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY ?? "",
    });
  }
  return pinecone;
};

export const loadFileIntoPinecone = async (url: string[]) => {
  console.log("downlaoding file");
  const fileName = await downloadAndSavePDFs(url);
  if (!fileName) {
    throw new Error("Failed to download file");
  }
  console.log("file name from atfer downloaded file", fileName);

  //const file = fileName[0];
  const allPages = [];
  for (const file of fileName) {
    const loader = new PDFLoader(file);
    const pages = (await loader.load()) as PDFPage[];
    allPages.push(...pages);
  }
  // const loader = new PDFLoader(file);
  // const pages = await loader.load();
  const docs = await Promise.all(allPages.map(prepareDocs));

  const vectors = await Promise.all(docs.flat().map(embedDocument));

  const client = await pineconeClient();
  const index = client.Index("chat-pdf");
  console.log("interting into pinecone database ");
  const nameSpace = removeNonAsciiChar(url[0]);
  // @ts-expect-error: Handle dynamic types for namespace
  await index.namespace(nameSpace).upsert(vectors);
  return docs;
};
async function embedDocument(doc: Document) {
  try {
    const embeddings = await getEmbeddings(doc.pageContent);
    const hash = md5(doc.pageContent);
    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
      },
    } as Vector;
  } catch (error) {
    console.error("error embedding document", error);
    throw error;
  }
}
export function turncateStringByBytes(str: string, bytes: number) {
  const enc = new TextEncoder();
  return new TextDecoder("utf8").decode(enc.encode(str).slice(0, bytes));
}
async function prepareDocs(pages: PDFPage) {
  let { pageContent } = pages;
  const { metadata } = pages;
  pageContent = pageContent.replace(/\n/g, "");
  const textSplitter = new RecursiveCharacterTextSplitter();
  const docs = await textSplitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        text: turncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
  return docs;
}
