"use client";

import React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import DocumentViewer, { type ViewerDoc } from "~/components/documentViewer";
import PdfChatBox from "~/components/pdfChatBox";
import DocumentManager from "~/components/documentManager";
import { DocumentViewerProvider } from "~/components/documentViewerContext";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type Props = {
  chatId: string;
  pdfUrls: string[];
  documents?: ViewerDoc[];
};

/* ---------------------------------------------------------------------------
   ChatWorkspace — client shell that holds the document scope and composes the
   PDF viewer + a collapsible DocumentManager + the chat box. The scope
   (selected documentIds) flows from the manager into <PdfChatBox />.
   ------------------------------------------------------------------------- */
const ChatWorkspace = ({ chatId, pdfUrls, documents }: Props) => {
  const [documentIds, setDocumentIds] = React.useState<string[]>([]);
  const [panelOpen, setPanelOpen] = React.useState(true);

  // Prefer the real Document records (these carry the ids/names citations
  // reference). Fall back to legacy `pdfUrls` for sessions that predate them.
  const viewerDocs: ViewerDoc[] = React.useMemo(() => {
    if (documents && documents.length > 0) return documents;
    return pdfUrls.map((url, i) => ({
      id: `pdf-${i}`,
      name: `Document ${i + 1}`,
      url,
    }));
  }, [documents, pdfUrls]);

  return (
    <DocumentViewerProvider>
      <div className="bg-paper flex h-screen w-full overflow-hidden">
        {/* PDF viewer */}
        <div className="hidden min-w-0 flex-[3] overflow-hidden p-4 lg:block">
          <DocumentViewer documents={viewerDocs} />
        </div>

      {/* Right column: manager + chat */}
      <div className="flex min-w-0 flex-[3] overflow-hidden border-l border-border">
        {/* Collapsible document manager */}
        <div
          className={cn(
            "shrink-0 overflow-hidden p-3 transition-[width] duration-300 ease-out",
            panelOpen ? "w-72" : "w-0 p-0",
          )}
        >
          <div className={cn("h-full", panelOpen ? "block" : "hidden")}>
            <DocumentManager
              sessionId={chatId}
              onScopeChange={setDocumentIds}
              className="h-full"
            />
          </div>
        </div>

        {/* Chat */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
          <div className="mb-2 flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setPanelOpen((v) => !v)}
              aria-label={
                panelOpen ? "Hide document panel" : "Show document panel"
              }
            >
              {panelOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
            <span className="font-mono text-[11px] text-muted-foreground">
              {documentIds.length > 0
                ? `scope · ${documentIds.length} document${documentIds.length === 1 ? "" : "s"}`
                : "scope · all documents"}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card/60">
            <PdfChatBox chatId={chatId} documentIds={documentIds} />
          </div>
        </div>
        </div>
      </div>
    </DocumentViewerProvider>
  );
};

export default ChatWorkspace;
