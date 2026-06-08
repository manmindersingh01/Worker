// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import FileUploadDropZone from "~/components/fileUpload";

const PdfChat = () => {
  const [loading, setLoading] = useState(false);

  return (
    <div className="bg-paper relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-12">
      {/* Atmosphere: a warm saffron bloom anchored top-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-accent/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-32 h-[30rem] w-[30rem] rounded-full bg-success/8 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-xl"
      >
        <div className="mb-7 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-accent" aria-hidden />
            Document intelligence
          </span>
          <h1 className="font-display text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Bring your <span className="text-accent">documents</span> into the
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
      </motion.div>
    </div>
  );
};

export default PdfChat;
