"use client";
import { useMutation } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import React from "react";
import { UploadDropzone } from "~/lib/uploadthing";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { IngestStatus, type DocumentRecord } from "~/components/ingestStatus";
import { cn } from "~/lib/utils";

type UploadResponse = { id: string };

const FileUploadDropZone = ({
  setLoading,
}: {
  setLoading: (v: boolean) => void;
}) => {
  const router = useRouter();
  const [sessionId, setSessionId] = React.useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: async ({ url, name }: { url: string[]; name: string[] }) => {
      setLoading(true);
      const res = await axios.post<UploadResponse>("/api/upload", { url, name });
      return res.data;
    },
    onSuccess: (data) => {
      setSessionId(data.id);
      setLoading(false);
      toast.success("Upload complete — indexing started");
    },
    onError: (error) => {
      setLoading(false);
      toast.error(
        error instanceof Error ? error.message : "Failed to start ingestion",
      );
    },
  });

  // Honest retry: a failed document can't be re-indexed in place (no retry
  // endpoint exists), so we delete it and route the user back to re-upload.
  const handleRetry = async (doc: DocumentRecord) => {
    try {
      await axios.delete(`/api/documents?documentId=${doc.id}`);
      toast("Removed failed file — please upload it again", { icon: "↻" });
      setSessionId(null);
    } catch {
      toast.error("Could not reset that document");
    }
  };

  if (sessionId) {
    return (
      <div className="w-full text-left">
        <IngestStatus sessionId={sessionId} onRetry={handleRetry} />
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSessionId(null)}
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Upload more
          </button>
          <Button onClick={() => router.push(`/pdfchat/${sessionId}`)}>
            Open chat
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <Toaster position="bottom-center" />
      </div>
    );
  }

  return (
    <div className="w-full text-left">
      <UploadDropzone
        endpoint="imageUploader"
        config={{ mode: "auto" }}
        appearance={{
          container: cn(
            "group relative w-full rounded-xl border-2 border-dashed border-border bg-card/60 p-8",
            "transition-colors duration-200 ut-uploading:border-accent",
            "ut-readying:border-accent hover:border-accent/70",
          ),
          uploadIcon: "hidden",
          label:
            "text-foreground font-medium text-sm hover:text-accent ut-uploading:text-accent",
          allowedContent: "font-mono text-[11px] text-muted-foreground mt-1",
          button: cn(
            "ut-ready:bg-primary ut-ready:text-primary-foreground ut-ready:shadow",
            "ut-uploading:bg-accent ut-uploading:text-accent-foreground",
            "rounded-md px-4 py-2 text-sm font-medium transition-colors after:bg-accent/40",
            "focus-within:ring-2 focus-within:ring-ring",
          ),
        }}
        content={{
          label: ({ ready, isUploading }) =>
            isUploading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading…
              </span>
            ) : ready ? (
              "Drop PDFs here, or click to browse"
            ) : (
              "Preparing uploader…"
            ),
          allowedContent: "PDF only · up to 16MB each · max 3 files",
          uploadIcon: () => null,
        }}
        onBeforeUploadBegin={(files) => {
          const ok = files.filter((f) => f.type === "application/pdf");
          if (ok.length !== files.length) {
            toast.error("Only PDF files are allowed");
          }
          return ok;
        }}
        onClientUploadComplete={(res) => {
          if (!res?.length) return;
          const fileUrl = res.map((v) => v.url);
          const filesName = res.map((v) => v.name);
          mutate({ url: fileUrl, name: filesName });
        }}
        onUploadError={(error: Error) => {
          toast.error(`Upload failed: ${error.message}`);
        }}
      />

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { icon: FileText, label: "PDF only" },
          { icon: UploadCloud, label: "Up to 3 files" },
          { icon: ShieldCheck, label: "16MB max" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-2"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
            <span className="font-mono text-[11px] text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>

      {isPending && (
        <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Registering documents…
        </p>
      )}
      <Toaster position="bottom-center" />
    </div>
  );
};

export default FileUploadDropZone;
