import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { loadFileIntoPinecone } from "~/server/pineconeDb";

export async function POST(req: Request) {
  const body = await req.json();
  const { url, name, userId } = body;

  const pages = await loadFileIntoPinecone(url);
  console.log(
    "-----LIST-----",
    pages,
    "loadFileIntoPinecone--------------------------------",
  );

  console.log("_______------------", url, name, userId);

  // const pdfData = url.map((pdfUrl: string, index: number) => ({
  //   url: pdfUrl,
  //   name: name[index],
  // }));

  // const result = await db.pDFChatSession.create({
  //   data: {
  //     title: "new session",
  //     userId,
  //     pdfs: {
  //       createMany: {
  //         name: name,
  //         url: url,
  //       },
  //     },
  //   },
  // });
  const session = await db.pDFChatSession.create({
    data: {
      title: "new session",
      userId,
    },
  });

  for (let i = 0; i < url.length; i++) {
    await db.pDF.create({
      data: {
        url: url[i],
        name: name[i],
        chatSessions: {
          connect: { id: session.id }, // Associate with the created session
        },
      },
    });
    return new Response("ok", { status: 200 });
  }
  try {
  } catch (error) {
    return NextResponse.json(error);
  }
}
