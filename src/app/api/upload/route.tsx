import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { loadFileIntoPinecone } from "~/server/pineconeDb";

export async function POST(req: Request) {
  const body = await req.json();
  const { url, name } = body;
  const data = await auth();
  const userId = data.user.id;

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const pages = await loadFileIntoPinecone(url);
  console.log(pages, "loadFileIntoPinecone--------------------------------");

  console.log("_______------------", url, name, userId);

  const session = await db.pDFChatSession.create({
    data: {
      title: name[0],
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
    return new Response(
      JSON.stringify({
        id: session.id,
      }),
      { status: 200 },
    );
  }

  try {
  } catch (error) {
    return NextResponse.json(error);
  }
}
