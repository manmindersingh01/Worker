"use client";

import React from "react";
import { CheckCircle2, Loader2, AlertTriangle, FileText } from "lucide-react";
import { cn } from "~/lib/utils";

export type DocStatus = "PROCESSING" | "READY" | "FAILED";

export type DocumentRecord = {
  id: string;
  name: string;
  status: DocStatus;
  pageCount: number | null;
  error: string | null;
  createdAt: string;
};

/* ---------------------------------------------------------------------------
   StatusChip — a single, accessible status pill used across upload + manager.
   ------------------------------------------------------------------------- */
export function StatusChip({
  status,
  className,
}: {
  status: DocStatus;
  className?: string;
}) {
  const map = {
    PROCESSING: {
      label: "Processing",
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />,
      cls: "bg-warning/12 text-warning border-warning/30",
    },
    READY: {
      label: "Ready",
      icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
      cls: "bg-success/12 text-success border-success/30",
    },
    FAILED: {
      label: "Failed",
      icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden />,
      cls: "bg-destructive/12 text-destructive border-destructive/30",
    },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wide",
        map.cls,
        className,
      )}
    >
      {map.icon}
      {map.label}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   useDocumentPolling — polls GET /api/documents?sessionId until everything is
   terminal (READY/FAILED), then stops. Returns documents + meta for the UI.
   ------------------------------------------------------------------------- */
export function useDocumentPolling(sessionId: string | null, intervalMs = 2500) {
  const [documents, setDocuments] = React.useState<DocumentRecord[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(!!sessionId);

  const fetchOnce = React.useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `/api/documents?sessionId=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as DocumentRecord[];
      setDocuments(data);
      setError(null);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      const data = await fetchOnce();
      if (cancelled) return;
      const settled =
        data && data.length > 0
          ? data.every((d) => d.status === "READY" || d.status === "FAILED")
          : false;
      if (!settled) timer = setTimeout(tick, intervalMs);
    };

    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId, intervalMs, fetchOnce]);

  const allSettled =
    documents.length > 0 &&
    documents.every((d) => d.status === "READY" || d.status === "FAILED");

  return { documents, error, loading, allSettled, refetch: fetchOnce, setDocuments };
}

/* ---------------------------------------------------------------------------
   IngestStatus — the live ingestion surface shown after an upload begins.
   ------------------------------------------------------------------------- */
export function IngestStatus({
  sessionId,
  onRetry,
}: {
  sessionId: string;
  onRetry?: (doc: DocumentRecord) => void;
}) {
  const { documents, error, loading, allSettled } =
    useDocumentPolling(sessionId);

  const readyCount = documents.filter((d) => d.status === "READY").length;

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-foreground">
          Ingestion
        </h3>
        <p
          className="font-mono text-xs text-muted-foreground"
          aria-live="polite"
        >
          {documents.length > 0
            ? `${readyCount}/${documents.length} ready`
            : loading
              ? "loading…"
              : ""}
        </p>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {loading && documents.length === 0 && !error && (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg border border-border bg-muted/60"
            />
          ))}
        </div>
      )}

      {!loading && documents.length === 0 && !error && (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No documents yet.
        </p>
      )}

      <ul className="space-y-2" aria-live="polite">
        {documents.map((doc, i) => (
          <li
            key={doc.id}
            className="animate-fade-up rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm"
            style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
                  <FileText className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {doc.name}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {doc.status === "READY" && doc.pageCount != null
                      ? `${doc.pageCount} page${doc.pageCount === 1 ? "" : "s"}`
                      : doc.status === "FAILED"
                        ? (doc.error ?? "Ingestion failed")
                        : "Indexing content…"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusChip status={doc.status} />
                {doc.status === "FAILED" && onRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(doc)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {allSettled && documents.length > 0 && (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          {documents.some((d) => d.status === "FAILED")
            ? "Some documents need attention."
            : "All documents indexed."}
        </p>
      )}
    </div>
  );
}
