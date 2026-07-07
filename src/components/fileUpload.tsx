"use client";
import { useMutation } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  Loader2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import React from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { IngestStatus, type DocumentRecord } from "~/components/ingestStatus";
import { cn } from "~/lib/utils";

type UploadResponse = { id: string };
type PresignResponse = {
  uploads: { key: string; name: string; url: string }[];
};

const MAX_FILES = 10;
const MAX_SIZE = 32 * 1024 * 1024; // 32 MB

/** Per-file progress surfaced while the browser streams bytes to S3. */
type FileProgress = { name: string; state: "uploading" | "done" | "error" };

const FileUploadDropZone = ({
  setLoading,
}: {
  setLoading: (v: boolean) => void;
}) => {
  const router = useRouter();
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<FileProgress[]>([]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (files: File[]) => {
      setLoading(true);
      setProgress(files.map((f) => ({ name: f.name, state: "uploading" })));

      // 1. Ask the server for presigned PUT urls (one per file).
      const presign = await axios.post<PresignResponse>("/api/upload/presign", {
        files: files.map((f) => ({
          name: f.name,
          type: f.type || "application/pdf",
          size: f.size,
        })),
      });
      const uploads = presign.data.uploads;

      // 2. Upload each file straight to S3. The Content-Type header MUST equal
      //    the `type` we sent to presign, or the signature check fails.
      await Promise.all(
        uploads.map(async (u, i) => {
          const file = files[i]!;
          const contentType = file.type || "application/pdf";
          try {
            await fetch(u.url, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": contentType },
            }).then((res) => {
              if (!res.ok) throw new Error(`S3 PUT failed (${res.status})`);
            });
            setProgress((prev) =>
              prev.map((p, j) => (j === i ? { ...p, state: "done" } : p)),
            );
          } catch (err) {
            setProgress((prev) =>
              prev.map((p, j) => (j === i ? { ...p, state: "error" } : p)),
            );
            throw err;
          }
        }),
      );

      // 3. Register the uploaded objects so ingestion can begin.
      const res = await axios.post<UploadResponse>("/api/upload", {
        keys: uploads.map((u) => u.key),
        names: uploads.map((u) => u.name),
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSessionId(data.id);
      setLoading(false);
      setProgress([]);
      toast.success("Upload complete — indexing started");
    },
    onError: (error) => {
      setLoading(false);
      setProgress([]);
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 403 &&
        (error.response.data as { error?: string })?.error === "PDF_LIMIT"
      ) {
        toast.error(
          (error.response.data as { message?: string })?.message ??
            "You've reached your PDF upload limit.",
        );
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to upload documents",
      );
    },
  });

  const onDrop = React.useCallback(
    (accepted: File[], rejected: { file: File }[]) => {
      if (rejected.length > 0) {
        toast.error("Only PDF files up to 32MB are allowed");
      }
      if (accepted.length === 0) return;
      if (accepted.length > MAX_FILES) {
        toast.error(`Up to ${MAX_FILES} files at a time`);
        return;
      }
      mutate(accepted);
    },
    [mutate],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: MAX_FILES,
    maxSize: MAX_SIZE,
    multiple: true,
    disabled: isPending,
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
      <div
        {...getRootProps()}
        className={cn(
          "group relative w-full cursor-pointer rounded-xl border-2 border-dashed border-border bg-card/60 p-8",
          "transition-colors duration-200 hover:border-accent/70",
          (isDragActive || isPending) && "border-accent",
          isPending && "pointer-events-none opacity-80",
        )}
        role="button"
        tabIndex={0}
        aria-label="Upload PDF files"
      >
        <input {...getInputProps()} aria-label="PDF file input" />
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-accent">
            {isPending ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            ) : (
              <UploadCloud className="h-6 w-6" aria-hidden />
            )}
          </span>
          <p className="text-sm font-medium text-foreground group-hover:text-accent">
            {isPending
              ? "Uploading…"
              : isDragActive
                ? "Drop PDFs to upload"
                : "Drop PDFs here, or click to browse"}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            PDF only · up to 32MB · max {MAX_FILES} files
          </p>
        </div>
      </div>

      {progress.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {progress.map((p) => (
            <li
              key={p.name}
              className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 text-xs"
            >
              {p.state === "uploading" ? (
                <Loader2
                  className="h-3.5 w-3.5 shrink-0 animate-spin text-accent"
                  aria-hidden
                />
              ) : p.state === "done" ? (
                <CheckCircle2
                  className="h-3.5 w-3.5 shrink-0 text-accent"
                  aria-hidden
                />
              ) : (
                <ShieldCheck
                  className="h-3.5 w-3.5 shrink-0 text-destructive"
                  aria-hidden
                />
              )}
              <span className="truncate text-muted-foreground">{p.name}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { icon: FileText, label: "PDF only" },
          { icon: UploadCloud, label: "1 file" },
          { icon: ShieldCheck, label: "32MB max" },
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
