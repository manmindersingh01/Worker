import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { inngest } from "~/inngest/client";

export async function POST(req: Request) {
  try {
    const data = await auth();
    const userId = data?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { url: string[]; name: string[] };
    const { url, name } = body;

    const session = await db.pdfChatSession.create({
      data: {
        title: name[0],
        userId,
      },
    });

    for (let i = 0; i < url.length; i++) {
      const doc = await db.document.create({
        data: {
          pdfChatSessionId: session.id,
          userId,
          name: name[i]!,
          url: url[i]!,
          status: "PROCESSING",
        },
      });
      await inngest.send({
        name: "document/uploaded",
        data: { documentId: doc.id },
      });
    }

    return NextResponse.json({ id: session.id }, { status: 200 });
  } catch (error) {
    console.error("upload error", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 },
    );
  }
}
