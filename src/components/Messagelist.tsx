"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { UIMessage } from "ai";
import { cn } from "~/lib/utils";
import {
  Bot,
  UserIcon,
  FileText,
  Info,
  BookOpen,
  CornerDownRight,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useDocumentViewer } from "~/components/documentViewerContext";

type SourceChip = {
  documentId: string;
  docName: string;
  page: number;
  snippet: string;
};

// UI message type for the PDF chat: standard parts plus a `data-sources` part.
export type ChatUIMessage = UIMessage<never, { sources: SourceChip[] }>;

/* Matches an inline citation token like "[Annual Report p.12]". The doc name
   is everything up to the trailing " p.<n>" inside the brackets. */
const CITATION_RE = /\[([^[\]]+?)\s+p\.\s*(\d+)\]/g;

interface CodeProps {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-2 mt-1 font-display text-base font-semibold text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-2 mt-1 font-display text-sm font-semibold text-foreground">
      {children}
    </h2>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline underline-offset-2 hover:text-accent/80"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-3 rounded-r-md border-l-2 border-accent bg-accent-soft/50 py-1.5 pl-3 italic text-foreground/90">
      {children}
    </blockquote>
  ),
  code: ({ inline, className, children, ...props }: CodeProps) => {
    const match = /language-(\w+)/.exec(className ?? "");
    return !inline && match ? (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
        className="my-2 rounded-lg text-[13px]"
        {...props}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    ) : (
      <code
        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-accent-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        {children}
      </table>
    </div>
  ),
};

/* ---------------------------------------------------------------------------
   CitationChip — a small saffron pill rendered inline (or in the Sources row).
   ------------------------------------------------------------------------- */
function CitationChip({
  label,
  page,
  onClick,
  className,
}: {
  label: string;
  page: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open source ${label}, page ${page}`}
      className={cn(
        "inline-flex max-w-[14rem] items-center gap-1 rounded-full border border-accent/40 bg-accent-soft px-2 py-0.5 align-baseline font-mono text-[11px] font-medium text-accent-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <BookOpen className="h-3 w-3 shrink-0 text-accent" aria-hidden />
      <span className="truncate">{label}</span>
      <span className="shrink-0 opacity-70">p.{page}</span>
    </button>
  );
}

/* ---------------------------------------------------------------------------
   AssistantBody — renders assistant markdown while turning inline
   `[DocName p.N]` tokens into interactive citation chips. The surrounding text
   is still rendered through ReactMarkdown; chips are spliced between segments.
   ------------------------------------------------------------------------- */
function AssistantBody({
  text,
  onCite,
}: {
  text: string;
  onCite: (docName: string, page: number) => void;
}) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  CITATION_RE.lastIndex = 0;
  while ((match = CITATION_RE.exec(text)) !== null) {
    const [full, rawName, rawPage] = match;
    const docName = (rawName ?? "").trim();
    const page = Number(rawPage);
    const segment = text.slice(lastIndex, match.index);

    if (segment) {
      nodes.push(
        <ReactMarkdown key={`md-${key}`} components={markdownComponents}>
          {segment}
        </ReactMarkdown>,
      );
    }
    nodes.push(
      <CitationChip
        key={`cite-${key}`}
        label={docName}
        page={page}
        onClick={() => onCite(docName, page)}
        className="mx-0.5"
      />,
    );
    lastIndex = match.index + full.length;
    key += 1;
  }

  const tail = text.slice(lastIndex);
  if (tail || nodes.length === 0) {
    nodes.push(
      <ReactMarkdown key={`md-tail`} components={markdownComponents}>
        {tail}
      </ReactMarkdown>,
    );
  }

  return (
    <div className="prose prose-sm prose-zinc max-w-none break-words text-[0.9rem] leading-relaxed text-foreground prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      {nodes}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   StreamingDots — a typing indicator for the in-flight assistant message.
   ------------------------------------------------------------------------- */
function StreamingDots() {
  return (
    <span
      className="inline-flex items-center gap-1 align-middle"
      aria-label="Assistant is typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   EmptyState — shown before any messages exist.
   ------------------------------------------------------------------------- */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-accent shadow-paper">
        <BookOpen className="h-6 w-6" aria-hidden />
      </span>
      <div>
        <p className="font-display text-base font-semibold text-foreground">
          Ask anything about your documents
        </p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Answers are grounded in your uploaded PDFs and cite the exact page
          they came from.
        </p>
      </div>
    </div>
  );
}

const MessageList = ({
  message,
  streaming = false,
}: {
  message: ChatUIMessage[];
  streaming?: boolean;
}) => {
  const { requestPage } = useDocumentViewer();

  // Source panel state: the sources to show + which one to highlight.
  const [panel, setPanel] = React.useState<{
    sources: SourceChip[];
    activeIndex: number;
  } | null>(null);

  const openPanel = React.useCallback(
    (sources: SourceChip[], docName?: string, page?: number) => {
      let activeIndex = 0;
      if (docName != null && page != null) {
        const idx = sources.findIndex(
          (s) =>
            s.docName.trim().toLowerCase() === docName.trim().toLowerCase() &&
            s.page === page,
        );
        if (idx >= 0) activeIndex = idx;
      }
      setPanel({ sources, activeIndex });
    },
    [],
  );

  // Clicking any citation: jump the viewer + open the panel highlighting it.
  const handleCite = React.useCallback(
    (sources: SourceChip[], docName: string, page: number) => {
      const matched = sources.find(
        (s) => s.docName.trim().toLowerCase() === docName.trim().toLowerCase(),
      );
      requestPage({ documentId: matched?.documentId, docName, page });
      openPanel(sources, docName, page);
    },
    [requestPage, openPanel],
  );

  if (!message.length) {
    return <EmptyState />;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-5 px-3 py-4">
        {message.map((m, mi) => {
          const text = m.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("");

          const sources = m.parts
            .filter((p) => p.type === "data-sources")
            .flatMap(
              (p) => (p as { type: "data-sources"; data: SourceChip[] }).data,
            );

          const isUser = m.role === "user";
          const isLastAssistant =
            !isUser && mi === message.length - 1 && streaming;
          // Grounded = has at least one source. The server abstains when it has
          // none, so treat a source-less assistant answer as "not found".
          const grounded = sources.length > 0;
          const showNotFound = !isUser && !grounded && text.length > 0;

          return (
            <div
              key={m.id}
              className={cn(
                "flex animate-fade-up items-start gap-3",
                isUser && "flex-row-reverse",
              )}
            >
              {/* Avatar */}
              <span
                className={cn(
                  "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg shadow-sm",
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent-soft text-accent",
                )}
                aria-hidden
              >
                {isUser ? (
                  <UserIcon className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </span>

              {/* Bubble */}
              <div className={cn("flex min-w-0 flex-col", isUser && "items-end")}>
                <div
                  className={cn(
                    "max-w-[42rem] rounded-2xl px-4 py-2.5 shadow-sm",
                    isUser
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : showNotFound
                        ? "rounded-tl-sm border border-dashed border-border bg-muted/50 text-muted-foreground"
                        : "rounded-tl-sm border border-border bg-card text-foreground",
                  )}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap text-[0.9rem] leading-relaxed">
                      {text}
                    </p>
                  ) : showNotFound ? (
                    <div className="flex items-start gap-2">
                      <Info
                        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                          Not found in your documents
                        </p>
                        <div className="mt-1 text-[0.9rem] leading-relaxed">
                          <AssistantBody
                            text={text}
                            onCite={(d, p) => handleCite(sources, d, p)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : text.length > 0 ? (
                    <AssistantBody
                      text={text}
                      onCite={(d, p) => handleCite(sources, d, p)}
                    />
                  ) : (
                    <StreamingDots />
                  )}

                  {isLastAssistant && text.length > 0 && (
                    <span className="ml-1 inline-block">
                      <StreamingDots />
                    </span>
                  )}
                </div>

                {/* Sources affordance */}
                {grounded && (
                  <div className="mt-2 flex max-w-[42rem] flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <FileText
                        className="h-3 w-3 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                        {sources.length} source
                        {sources.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sources.map((s, i) => (
                        <Tooltip key={`${s.documentId}-${s.page}-${i}`}>
                          <TooltipTrigger asChild>
                            <span>
                              <CitationChip
                                label={s.docName}
                                page={s.page}
                                onClick={() =>
                                  handleCite(sources, s.docName, s.page)
                                }
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <span className="line-clamp-3 text-xs">
                              {s.snippet}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Source panel */}
      <Sheet
        open={panel !== null}
        onOpenChange={(o) => !o && setPanel(null)}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 bg-card p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border px-5 py-4 text-left">
            <SheetTitle className="font-display flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent" aria-hidden />
              Sources
            </SheetTitle>
            <SheetDescription>
              The passages this answer was grounded in. Click a card to open it
              in the viewer.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 px-5 py-4">
            <ul className="space-y-3">
              {panel?.sources.map((s, i) => {
                const active = i === panel.activeIndex;
                return (
                  <li key={`${s.documentId}-${s.page}-${i}`}>
                    <button
                      type="button"
                      onClick={() => {
                        requestPage({
                          documentId: s.documentId,
                          docName: s.docName,
                          page: s.page,
                        });
                        setPanel((p) =>
                          p ? { ...p, activeIndex: i } : p,
                        );
                      }}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-accent bg-accent-soft/60 shadow-paper"
                          : "border-border bg-background hover:border-accent/40 hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <FileText
                            className="h-3.5 w-3.5 shrink-0 text-accent"
                            aria-hidden
                          />
                          <span className="truncate text-sm font-medium text-foreground">
                            {s.docName}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                          p.{s.page}
                        </span>
                      </div>
                      <p className="mt-2 flex gap-1.5 text-[0.8rem] leading-relaxed text-muted-foreground">
                        <CornerDownRight
                          className="mt-0.5 h-3 w-3 shrink-0 opacity-60"
                          aria-hidden
                        />
                        <span className="line-clamp-[8]">{s.snippet}</span>
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
};

export default MessageList;
