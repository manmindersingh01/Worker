"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FileText, History, Sparkles } from "lucide-react";
import FileUploadDropZone from "~/components/fileUpload";

export type RecentChat = {
  id: string;
  title: string;
  documentCount: number;
  /** Pre-formatted on the server so SSR and hydration render identically. */
  updatedLabel: string;
};

/* ---------------------------------------------------------------------------
   UploadWorkspace — the post-login landing surface.
   Upload new PDFs, or jump straight back into an existing chat: the recent
   list below the dropzone is the direct path to previous sessions (before
   this, existing chats were only reachable by URL or from inside a chat).
   ------------------------------------------------------------------------- */
const UploadWorkspace = ({ recentChats }: { recentChats: RecentChat[] }) => {
  const [, setLoading] = useState(false);

  return (
    <div className="bg-paper relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-12">
      {/* Atmosphere: layered violet/cyan blooms */}
      <div className="aurora pointer-events-none absolute inset-0 opacity-50" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[hsl(var(--grad-from)/0.12)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-32 h-[30rem] w-[30rem] rounded-full bg-[hsl(var(--grad-to)/0.1)] blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-xl"
      >
        <div className="mb-7 text-center">
          <span className="border-gradient relative mb-4 inline-flex items-center gap-2 rounded-full bg-card/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-[hsl(var(--accent))]" aria-hidden />
            Document intelligence
          </span>
          <h1 className="font-display text-balance text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Bring your <span className="text-gradient">documents</span> into the
            conversation
          </h1>
          <p className="mx-auto mt-3 max-w-md text-balance text-sm text-muted-foreground sm:text-base">
            Upload your PDFs and start an intelligent, cited conversation about
            their contents. We index every page as you go.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-paper-lg backdrop-blur-sm sm:p-6">
          <FileUploadDropZone setLoading={setLoading} />
        </div>

        {recentChats.length > 0 && (
          <section className="mt-6" aria-label="Your PDF chats">
            <p className="mb-2 flex items-center gap-1.5 px-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <History className="h-3 w-3" aria-hidden />
              Your PDF chats
            </p>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/80 shadow-paper-lg backdrop-blur-sm">
              {recentChats.map((chat) => (
                <li key={chat.id}>
                  <Link
                    href={`/pdfchat/${chat.id}`}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                      <FileText className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {chat.title}
                      </span>
                      <span className="block font-mono text-[10px] text-muted-foreground">
                        {chat.documentCount} document
                        {chat.documentCount === 1 ? "" : "s"} ·{" "}
                        {chat.updatedLabel}
                      </span>
                    </span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </motion.div>
    </div>
  );
};

export default UploadWorkspace;
