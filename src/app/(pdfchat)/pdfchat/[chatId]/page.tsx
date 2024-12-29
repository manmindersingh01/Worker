import { redirect } from "next/navigation";
import React from "react";
import PdfChatBox from "~/components/pdfChatBox";
import PdfView from "~/components/pdfview";
import { db } from "~/server/db";

type Props = {};
type Params = Promise<{ chatId: string }>;
const ChatPage = async ({ params }: { params: Params }) => {
  const { chatId } = await params;
  if (!chatId) return redirect("/");
  const currentPdf = await db.pDFChatSession.findUnique({
    where: {
      id: chatId,
    },
    include: {
      pdfs: true,
    },
  });
  console.log(currentPdf, "currentPdf-------------------");
  //console.log("gemini", process.env.GEMINI_API_KEY);
  console.log("openai--", process.env.OPENAI_API_KEY);

  const pdfUrlArray = [];
  currentPdf?.pdfs.map((pdf) => {
    pdfUrlArray.push(pdf.url);
  });
  return (
    <div className="flex h-screen overflow-scroll">
      <div className="flex max-h-screen w-full overflow-scroll">
        {/* //pdf view */}
        <div className="max-h-screen flex-[3] overflow-scroll p-4">
          <PdfView pdfUrl={pdfUrlArray} />
        </div>
        {/* //chat */}
        <div className="h-screen flex-[3] overflow-scroll border-l-4 p-4">
          <PdfChatBox chatId={chatId} />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
