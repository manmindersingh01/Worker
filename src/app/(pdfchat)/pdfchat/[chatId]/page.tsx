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
    },
  });

  const pdfUrlArray: string[] = [];
  currentPdf?.pdfs.forEach((pdf) => {
    pdfUrlArray.push(pdf.url);
  });

  return <ChatWorkspace chatId={chatId} pdfUrls={pdfUrlArray} />;
};

export default ChatPage;
