// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";
import { Button } from "~/components/ui/button";
import FileUploadDropZone from "~/components/fileUpload";
import AnimatedBackground from "./AnimatedBackground";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const PdfChat = () => {
  const [loading, setLoading] = useState(false);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 flex flex-col items-center justify-center text-center"
      >
        <h1 className="bg-clip-tex bg-gradient-to-r from-primary to-indigo-700 bg-clip-text text-5xl font-bold tracking-tight text-transparent drop-shadow-lg">
          Welcome to PDF Chat
        </h1>
        <p className="max-w-md text-lg text-white/20">
          Upload your PDF and start an intelligent conversation about its
          contents.
        </p>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="backdrop-blur-lgbg-gradient-to-r w-96 overflow-hidden rounded-lg bg-white/10 from-yellow-400 to-red-500 bg-clip-text p-8 text-lg font-semibold text-transparent"
        >
          <FileUploadDropZone setLoading={setLoading} />
        </motion.div>
        <Button
          variant="secondary"
          size="lg"
          className="mt-2 font-semibold"
          disabled={loading}
        >
          {loading ? (
            "Uploading..."
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Upload PDF
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
};

export default PdfChat;
