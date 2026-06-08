"use client";

import React from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Trash2,
  FileText,
  Library,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Checkbox } from "~/components/ui/checkbox";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import {
  StatusChip,
  useDocumentPolling,
  type DocumentRecord,
} from "~/components/ingestStatus";

type Props = {
  sessionId: string;
  /** Called with the active scope. Empty array = all documents. */
  onScopeChange?: (documentIds: string[]) => void;
  className?: string;
};

/* ---------------------------------------------------------------------------
   DocumentManager — session document panel + scope selector.
   - Lists documents (name, status, page count) with optimistic delete.
   - Multi-select over READY documents yields a `documentIds` scope.
   - "All documents" (no selection) is the default → empty array upstream.
   ------------------------------------------------------------------------- */
const DocumentManager = ({ sessionId, onScopeChange, className }: Props) => {
  const { documents, error, loading, refetch, setDocuments } =
    useDocumentPolling(sessionId);

  // Selection holds explicit per-document choices. Empty = "All".
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const readyDocs = React.useMemo(
    () => documents.filter((d) => d.status === "READY"),
    [documents],
  );

  // Prune selections that point at documents which no longer exist / are not ready.
  React.useEffect(() => {
    setSelected((prev) => {
      const readyIds = new Set(readyDocs.map((d) => d.id));
      const next = new Set([...prev].filter((id) => readyIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [readyDocs]);

  // Surface scope upstream. Empty set == all documents == empty array.
  const selectedKey = [...selected].sort().join(",");
  React.useEffect(() => {
    onScopeChange?.([...selected]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const allSelected = selected.size === 0;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (doc: DocumentRecord) => {
    setDeletingId(doc.id);
    const prev = documents;
    // Optimistic removal.
    setDocuments(documents.filter((d) => d.id !== doc.id));
    setSelected((s) => {
      const next = new Set(s);
      next.delete(doc.id);
      return next;
    });
    try {
      await axios.delete(`/api/documents?documentId=${doc.id}`);
      toast.success(`Removed "${doc.name}"`);
    } catch {
      setDocuments(prev); // rollback
      toast.error("Could not delete document");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-border bg-card/80 backdrop-blur-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent-soft text-accent">
            <Library className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-sm font-semibold leading-none text-foreground">
              Documents
            </h2>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              {documents.length} file{documents.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => void refetch()}
          aria-label="Refresh documents"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Scope: "All documents" default */}
      <button
        type="button"
        onClick={() => setSelected(new Set())}
        aria-pressed={allSelected}
        className={cn(
          "mx-3 mt-3 flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          allSelected
            ? "border-accent/50 bg-accent-soft"
            : "border-border bg-transparent hover:bg-muted/60",
        )}
      >
        <span
          className={cn(
            "grid h-5 w-5 place-items-center rounded border",
            allSelected
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border",
          )}
        >
          {allSelected && <Library className="h-3 w-3" aria-hidden />}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium text-foreground">
            All documents
          </span>
          <span className="block font-mono text-[10px] text-muted-foreground">
            {allSelected ? "answering across everything" : "tap to reset scope"}
          </span>
        </span>
      </button>

      {/* List */}
      <ScrollArea className="mt-2 flex-1 px-3">
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading && documents.length === 0 && !error && (
          <div className="space-y-2 py-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg border border-border bg-muted/60"
              />
            ))}
          </div>
        )}

        {!loading && documents.length === 0 && !error && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <FileText className="h-7 w-7 text-muted-foreground/60" aria-hidden />
            <p className="text-sm text-muted-foreground">No documents yet</p>
          </div>
        )}

        <ul className="space-y-2 pb-3">
          {documents.map((doc, i) => {
            const isReady = doc.status === "READY";
            const isChecked = selected.has(doc.id);
            return (
              <li
                key={doc.id}
                className={cn(
                  "animate-fade-up rounded-lg border bg-card px-3 py-2.5 shadow-sm transition-colors",
                  isChecked ? "border-accent/50" : "border-border",
                )}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    checked={isChecked}
                    disabled={!isReady}
                    onCheckedChange={() => toggle(doc.id)}
                    aria-label={`Include ${doc.name} in scope`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {doc.name}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <StatusChip status={doc.status} />
                      {isReady && doc.pageCount != null && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {doc.pageCount} pg
                        </span>
                      )}
                    </div>
                    {doc.status === "FAILED" && doc.error && (
                      <p className="mt-1 truncate font-mono text-[10px] text-destructive/80">
                        {doc.error}
                      </p>
                    )}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${doc.name}`}
                        disabled={deletingId === doc.id}
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-display">
                          Delete document?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          “{doc.name}” and its indexed content will be removed
                          from this chat. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => void handleDelete(doc)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>

      {/* Scope footer */}
      <div className="border-t border-border px-4 py-2.5">
        <p className="font-mono text-[10px] text-muted-foreground" aria-live="polite">
          {allSelected
            ? "Scope · all documents"
            : `Scope · ${selected.size} of ${readyDocs.length} selected`}
        </p>
      </div>
    </div>
  );
};

export default DocumentManager;
