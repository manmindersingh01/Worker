import { redirect } from "next/navigation";
import React from "react";
import ChatWorkspace from "~/components/chatWorkspace";
import { db } from "~/server/db";
import { presignGetInline } from "~/lib/s3";
import { auth } from "~/server/auth";

type Params = Promise<{ chatId: string }>;
const ChatPage = async ({ params }: { params: Params }) => {
  const { chatId } = await params;
  if (!chatId) return redirect("/");

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return redirect("/signin");

  // Scope to the owner: a session (and its documents) may only be opened by the
  // user it belongs to. Otherwise the viewer would render someone else's PDFs
  // by URL while the document/readiness APIs (correctly scoped) return 404.
  const currentPdf = await db.pdfChatSession.findFirst({
    where: {
      id: chatId,
      userId,
    },
    include: {
      pdfs: true,
      documents: {
        select: { id: true, name: true, url: true, status: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!currentPdf) return redirect("/chatroom");

  const pdfUrlArray: string[] = [];
  currentPdf.pdfs.forEach((pdf) => {
    pdfUrlArray.push(pdf.url);
  });

  // `d.url` holds the S3 object key; presign a short-lived inline GET url so the
  // viewer can render the PDF and deep-link to a cited page (#page=N).
  const documents = await Promise.all(
    currentPdf.documents.map(async (d) => ({
      id: d.id,
      name: d.name,
      viewUrl: await presignGetInline(d.url),
      status: d.status,
    })),
  );

  return (
    <ChatWorkspace
      chatId={chatId}
      pdfUrls={pdfUrlArray}
      documents={documents}
    />
  );
};

export default ChatPage;
