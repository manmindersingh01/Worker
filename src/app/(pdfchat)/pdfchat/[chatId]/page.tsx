import { redirect } from "next/navigation";
import React from "react";
import ChatWorkspace from "~/components/chatWorkspace";
import { db } from "~/server/db";

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

  const documents = (currentPdf?.documents ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    url: d.url,
    status: d.status,
  }));

  return (
    <ChatWorkspace
      chatId={chatId}
      pdfUrls={pdfUrlArray}
      documents={documents}
    />
  );
};

export default ChatPage;
