"use client";

import React from "react";
import { Lightbulb, FileWarning, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "~/lib/utils";
import { useDocumentViewer } from "~/components/documentViewerContext";
import { StatusPill } from "./statusPill";
import type { ClientReadinessItem } from "~/lib/readiness/serialize";

const STATUS_RANK: Record<ClientReadinessItem["status"], number> = {
  MISSING: 0,
  NEEDS_REVIEW: 1,
  PARTIAL: 2,
  PRESENT: 3,
};

/** Gaps worst-first: missing before needs-review before partial, heavier first. */
export function orderGaps(items: ClientReadinessItem[]): ClientReadinessItem[] {
  return items
    .filter((i) => i.status !== "PRESENT")
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.weight - a.weight,
    );
}

function CitationChips({ item }: { item: ClientReadinessItem }) {
  const { requestPage } = useDocumentViewer();
  if (item.citations.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {item.citations.map((c, i) => (
        <button
          key={`${c.documentId}-${c.page}-${i}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            requestPage({
              documentId: c.documentId,
              docName: c.docName,
              page: c.page,
            });
          }}
          className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] font-medium text-accent transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={c.snippet}
        >
          <FileWarning className="h-2.5 w-2.5" aria-hidden />
          {c.docName} p.{c.page}
        </button>
      ))}
    </div>
  );
}

function GapRow({ item }: { item: ClientReadinessItem }) {
  const { requestPage } = useDocumentViewer();
  const primary = item.citations[0];
  const jumpable = !!primary;

  const jump = () => {
    if (!primary) return;
    requestPage({
      documentId: primary.documentId,
      docName: primary.docName,
      page: primary.page,
    });
  };

  return (
    <li
      className={cn(
        "group animate-fade-up rounded-lg border border-border bg-card p-3 shadow-sm transition-colors",
        jumpable && "cursor-pointer hover:border-accent/50",
      )}
      onClick={jumpable ? jump : undefined}
      role={jumpable ? "button" : undefined}
      tabIndex={jumpable ? 0 : undefined}
      onKeyDown={
        jumpable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                jump();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {item.title}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {item.categoryTitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {item.indiaSpecific && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full border border-accent/40 bg-accent-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent"
              title="India-specific requirement under the NDCT Rules, 2019"
            >
              <Sparkles className="h-2.5 w-2.5" aria-hidden />
              India
            </span>
          )}
          <StatusPill status={item.status} />
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {item.rationale}
      </p>

      {item.recommendation && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-foreground">
          <Lightbulb
            className="mt-0.5 h-3 w-3 shrink-0 text-warning"
            aria-hidden
          />
          <span>{item.recommendation}</span>
        </p>
      )}

      {jumpable ? (
        <CitationChips item={item} />
      ) : (
        <p className="mt-2 font-mono text-[10px] text-muted-foreground/70">
          No supporting evidence found in the package.
        </p>
      )}

      {item.reference && (
        <p className="mt-2 border-t border-border/60 pt-1.5 font-mono text-[10px] text-muted-foreground/70">
          {item.reference}
        </p>
      )}

      {jumpable && (
        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
          Jump to source <ArrowRight className="h-3 w-3" aria-hidden />
        </span>
      )}
    </li>
  );
}

/** The gap list - items that aren't fully present, worst first. */
export function GapList({ items }: { items: ClientReadinessItem[] }) {
  const gaps = orderGaps(items);
  if (gaps.length === 0) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-center">
        <p className="text-sm font-medium text-success">
          No gaps - every required item is verified present.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {gaps.map((g) => (
        <GapRow key={g.itemKey} item={g} />
      ))}
    </ul>
  );
}
