import { redirect } from "next/navigation";
import React from "react";
import ChatWorkspace from "~/components/chatWorkspace";
import { db } from "~/server/db";
import { presignGet } from "~/lib/s3";

type Params = Promise<{ chatId: string }>;
const ChatPage = async ({ params }: { params: Params }) => {
  const { chatId } = await params;
  if (!chatId) return redirect("/");
  const currentPdf = await db.pdfChatSession.findUnique({
    where: {
      id: chatId,
    },
    include: {
      pdfs: true,
      documents: {
        select: { id: true, name: true, url: true, status: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const pdfUrlArray: string[] = [];
  currentPdf?.pdfs.forEach((pdf) => {
    pdfUrlArray.push(pdf.url);
  });

  // `d.url` holds the S3 object key; presign a short-lived GET url for viewing.
  const documents = await Promise.all(
    (currentPdf?.documents ?? []).map(async (d) => ({
      id: d.id,
      name: d.name,
      viewUrl: await presignGet(d.url),
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
