"use client";

import React from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
  Library,
  MessagesSquare,
} from "lucide-react";
import DocumentViewer, { type ViewerDoc } from "~/components/documentViewer";
import PdfChatBox from "~/components/pdfChatBox";
import DocumentManager from "~/components/documentManager";
import { DocumentViewerProvider } from "~/components/documentViewerContext";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";

type Props = {
  chatId: string;
  pdfUrls: string[];
  documents?: ViewerDoc[];
};

/* ---------------------------------------------------------------------------
   ChatWorkspace — client shell that holds the document scope and composes the
   PDF viewer + a collapsible DocumentManager + the chat box.

   Layout:
   - lg+ : three panes side by side (viewer | manager | chat).
   - < lg: a tab bar switches between Reader / Files / Chat so each surface
           gets the full viewport and the chat composer stays reachable.
   The scope (selected documentIds) flows from the manager into <PdfChatBox />.
   ------------------------------------------------------------------------- */
/** Track whether the viewport is at/above the lg breakpoint (1024px). */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

const ChatWorkspace = ({ chatId, pdfUrls, documents }: Props) => {
  const [documentIds, setDocumentIds] = React.useState<string[]>([]);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const isDesktop = useIsDesktop();

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

  const scopeLabel =
    documentIds.length > 0
      ? `scope · ${documentIds.length} document${documentIds.length === 1 ? "" : "s"}`
      : "scope · all documents";

  // Shared chat node (rendered once per breakpoint via CSS, not duplicated).
  const chat = (
    <div className="flex h-full min-w-0 flex-col">
      <div className="mb-2 hidden items-center gap-2 lg:flex">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setPanelOpen((v) => !v)}
          aria-label={panelOpen ? "Hide document panel" : "Show document panel"}
        >
          {panelOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>
        <span className="font-mono text-[11px] text-muted-foreground">
          {scopeLabel}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card/60">
        <PdfChatBox chatId={chatId} documentIds={documentIds} />
      </div>
    </div>
  );

  return (
    <DocumentViewerProvider>
      <div className="bg-paper h-[100dvh] w-full overflow-hidden">
        {/* ---------- Desktop: three panes ---------- */}
        {isDesktop ? (
          <div className="flex h-full">
            <div className="min-w-0 flex-[3] overflow-hidden p-4">
              <DocumentViewer documents={viewerDocs} />
            </div>

            <div className="flex min-w-0 flex-[3] overflow-hidden border-l border-border">
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

              <div className="min-w-0 flex-1 overflow-hidden p-3">{chat}</div>
            </div>
          </div>
        ) : (
          /* ---------- Mobile / tablet: tabbed ---------- */
          <Tabs defaultValue="chat" className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <TabsList className="h-9">
              <TabsTrigger value="reader" className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                Reader
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-1.5">
                <Library className="h-3.5 w-3.5" aria-hidden />
                Files
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-1.5">
                <MessagesSquare className="h-3.5 w-3.5" aria-hidden />
                Chat
              </TabsTrigger>
            </TabsList>
            <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
              {scopeLabel}
            </span>
          </div>

          <TabsContent
            value="reader"
            className="min-h-0 flex-1 overflow-hidden p-3 data-[state=inactive]:hidden"
          >
            <DocumentViewer documents={viewerDocs} />
          </TabsContent>

          <TabsContent
            value="files"
            className="min-h-0 flex-1 overflow-hidden p-3 data-[state=inactive]:hidden"
          >
            <DocumentManager
              sessionId={chatId}
              onScopeChange={setDocumentIds}
              className="h-full"
            />
          </TabsContent>

          <TabsContent
            value="chat"
            forceMount
            className="min-h-0 flex-1 overflow-hidden p-3 data-[state=inactive]:hidden"
          >
            {chat}
          </TabsContent>
          </Tabs>
        )}
      </div>
    </DocumentViewerProvider>
  );
};

export default ChatWorkspace;
