import React from "react";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import UploadWorkspace, { type RecentChat } from "./uploadClient";

/**
 * Post-login landing page: upload new PDFs, plus direct links back into the
 * user's existing chat sessions (fetched here, server-side).
 */
const PdfChatPage = async () => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/signin");

  const sessions = await db.pdfChatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      _count: { select: { documents: true } },
    },
  });

  // Format dates here with a fixed locale so SSR and client hydration match.
  const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const recentChats: RecentChat[] = sessions.map((s) => ({
    id: s.id,
    title: s.title ?? "Untitled chat",
    documentCount: s._count.documents,
    updatedLabel: fmt.format(s.updatedAt),
  }));

  return <UploadWorkspace recentChats={recentChats} />;
};

export default PdfChatPage;
