import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { inngest } from "~/inngest/client";
import { MAX_PDFS_PER_USER } from "~/lib/limits";

export async function POST(req: Request) {
  try {
    const data = await auth();
    const userId = data?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { keys: string[]; names: string[] };
    const { keys, names } = body;

    if (
      !Array.isArray(keys) ||
      !Array.isArray(names) ||
      keys.length === 0 ||
      keys.length !== names.length
    ) {
      return new Response(
        JSON.stringify({
          error: "INVALID_INPUT",
          message: "keys and names must be non-empty arrays of equal length",
        }),
        { status: 400 },
      );
    }

    // FAILED uploads don't consume the user's quota — let them retry.
    const existing = await db.document.count({
      where: { userId, status: { not: "FAILED" } },
    });
    if (existing >= MAX_PDFS_PER_USER || existing + keys.length > MAX_PDFS_PER_USER) {
      return NextResponse.json(
        { error: "PDF_LIMIT", message: `You can upload at most ${MAX_PDFS_PER_USER} PDF.` },
        { status: 403 },
      );
    }

    const session = await db.pdfChatSession.create({
      data: {
        title: names[0],
        userId,
      },
    });

    for (let i = 0; i < keys.length; i++) {
      const doc = await db.document.create({
        data: {
          pdfChatSessionId: session.id,
          userId,
          name: names[i]!,
          url: keys[i]!,
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
