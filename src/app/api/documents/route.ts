import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { deleteByDocument, namespaceFor } from "~/lib/rag/pinecone";

export async function GET(req: NextRequest) {
  const data = await auth();
  const userId = data?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const session = await db.pdfChatSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const documents = await db.document.findMany({
    where: { pdfChatSessionId: sessionId },
    select: {
      id: true,
      name: true,
      status: true,
      pageCount: true,
      error: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(documents);
}

export async function DELETE(req: NextRequest) {
  const data = await auth();
  const userId = data?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documentId = req.nextUrl.searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }

  const document = await db.document.findUnique({
    where: { id: documentId },
  });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (document.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteByDocument(namespaceFor(userId), documentId);
  await db.document.delete({ where: { id: documentId } });

  return NextResponse.json({ ok: true });
}
