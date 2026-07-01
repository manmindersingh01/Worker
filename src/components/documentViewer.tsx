"use client";

import React from "react";
import {
  AlertCircle,
  ExternalLink,
  FileText,
  Loader2,
  Hash,
  MonitorSmartphone,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { useDocumentViewer } from "~/components/documentViewerContext";

export type ViewerDoc = {
  id: string;
  name: string;
  // A presigned, short-lived GET url for the PDF (not the S3 key). When served
  // inline (see presignGetInline) the browser renders it natively and honours
  // #page=N.
  viewUrl: string;
  status?: "PROCESSING" | "READY" | "FAILED";
};

/** Google Docs viewer - the compatibility fallback (cannot deep-link a page). */
function gviewSrc(url: string) {
  return `https://docs.google.com/gview?url=${encodeURIComponent(
    url,
  )}&embedded=true`;
}

/** Native browser PDF viewer, deep-linked to a page when one is requested. */
function nativeSrc(url: string, page: number | null) {
  const hash = page ? `#page=${page}&view=FitH` : "#view=FitH";
  return `${url}${hash}`;
}

/* ---------------------------------------------------------------------------
   DocumentViewer — multi-document embedded PDF viewer.
   - A tab switcher (driven by the session's documents) selects which document
     is shown.
   - Page jump: subscribes to the DocumentViewer context. A citation / gap click
     switches to the matching document and navigates the native PDF viewer to
     the exact page via #page=N (the iframe is re-mounted so the browser lands
     on that page). A compatibility toggle falls back to the Google Docs viewer
     for environments where the native viewer misbehaves.
   ------------------------------------------------------------------------- */
const DocumentViewer = ({ documents }: { documents: ViewerDoc[] }) => {
  const { target } = useDocumentViewer();

  const [activeId, setActiveId] = React.useState<string | null>(
    documents[0]?.id ?? null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  // The page a citation asked for. Drives the #page deep-link and the badge.
  const [targetPage, setTargetPage] = React.useState<number | null>(null);
  // "native" uses the browser PDF viewer (deep-linkable); "compat" uses gview.
  const [mode, setMode] = React.useState<"native" | "compat">("native");

  // Keep a valid active document as the list changes.
  React.useEffect(() => {
    if (documents.length === 0) {
      setActiveId(null);
      return;
    }
    setActiveId((prev) =>
      prev && documents.some((d) => d.id === prev) ? prev : documents[0]!.id,
    );
  }, [documents]);

  // Honour page-jump requests from citation / gap clicks.
  React.useEffect(() => {
    if (!target) return;
    const match =
      (target.documentId &&
        documents.find((d) => d.id === target.documentId)) ||
      documents.find(
        (d) =>
          d.name.trim().toLowerCase() === target.docName.trim().toLowerCase(),
      );
    if (match) {
      setActiveId(match.id);
      setLoading(true);
      setError(false);
      setTargetPage(target.page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.nonce]);

  const active = documents.find((d) => d.id === activeId) ?? null;

  // Zero-document case.
  if (documents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-accent">
          <FileText className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="font-display text-base font-semibold text-foreground">
            No documents to display
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Upload a PDF to this session and it will appear here for reading.
          </p>
        </div>
      </div>
    );
  }

  const src = active
    ? mode === "compat"
      ? gviewSrc(active.viewUrl)
      : nativeSrc(active.viewUrl, targetPage)
    : "";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col rounded-xl border border-border bg-card/60 shadow-paper">
        {/* Switcher */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
          {documents.length > 1 ? (
            <Tabs
              value={activeId ?? undefined}
              onValueChange={(v) => {
                setActiveId(v);
                setLoading(true);
                setError(false);
                setTargetPage(null);
              }}
              className="min-w-0 flex-1"
            >
              <TabsList className="h-8 w-full justify-start overflow-x-auto">
                {documents.map((d) => (
                  <TabsTrigger
                    key={d.id}
                    value={d.id}
                    className="max-w-[12rem] gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{d.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-1.5 px-1">
              <FileText className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span className="truncate text-sm font-medium text-foreground">
                {active?.name}
              </span>
            </div>
          )}

          {/* Page badge - the citation landed here. */}
          {targetPage != null && (
            <button
              type="button"
              onClick={() => setTargetPage(null)}
              className="flex shrink-0 animate-fade-in items-center gap-1 rounded-full border border-accent/50 bg-accent-soft px-2 py-0.5 font-mono text-[11px] font-medium text-accent-foreground"
              aria-label={`Jumped to page ${targetPage}. Dismiss.`}
            >
              <Hash className="h-3 w-3 text-accent" aria-hidden />
              page {targetPage}
            </button>
          )}

          {/* Compatibility toggle: native <-> Google Docs viewer. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === "native" ? "compat" : "native"));
                  setLoading(true);
                  setError(false);
                }}
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  mode === "compat"
                    ? "bg-accent-soft text-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-label="Toggle compatibility viewer"
                aria-pressed={mode === "compat"}
              >
                <MonitorSmartphone className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[15rem]">
              {mode === "native"
                ? "Trouble viewing? Switch to the compatibility viewer (can't jump to a page)."
                : "Compatibility viewer on. Switch back to jump to cited pages."}
            </TooltipContent>
          </Tooltip>

          {active && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={active.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Open this document in a new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent>Open in new tab</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Viewer surface */}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-b-xl bg-muted/30">
          {active?.status === "PROCESSING" ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
              <p className="text-sm">Still indexing this document…</p>
            </div>
          ) : error ? (
            <div className="grid h-full place-items-center p-6">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Could not load this PDF</AlertTitle>
                <AlertDescription>
                  <p className="text-sm">
                    The embedded viewer couldn&apos;t render it (the file may be
                    too large, private, or unsupported).
                  </p>
                  {active && (
                    <a
                      href={active.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 font-medium text-accent underline-offset-2 hover:underline"
                    >
                      Open PDF directly
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            active && (
              <>
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-card/60 text-muted-foreground backdrop-blur-sm">
                    <Loader2
                      className="h-5 w-5 animate-spin text-accent"
                      aria-hidden
                    />
                    <span className="text-sm">Loading document…</span>
                  </div>
                )}
                <iframe
                  // Re-mount per document AND per requested page so the native
                  // viewer reloads and lands on the cited page.
                  key={`${active.id}:${mode}:${targetPage ?? "top"}`}
                  src={src}
                  className={cn(
                    "h-full w-full border-0 transition-opacity",
                    loading ? "opacity-0" : "opacity-100",
                  )}
                  title={`PDF viewer: ${active.name}`}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setError(true);
                  }}
                />
              </>
            )
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DocumentViewer;
