"use client";

import React from "react";
import {
  BookOpen,
  Library,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";
import DocumentViewer, { type ViewerDoc } from "~/components/documentViewer";
import PdfChatBox from "~/components/pdfChatBox";
import DocumentManager from "~/components/documentManager";
import ReadinessPanel from "~/components/readiness/readinessPanel";
import { DocumentViewerProvider } from "~/components/documentViewerContext";
import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";

type Props = {
  chatId: string;
  pdfUrls: string[];
  documents?: ViewerDoc[];
};

/* ---------------------------------------------------------------------------
   ChatWorkspace — client shell that holds the document scope and composes the
   PDF viewer + a collapsible DocumentManager + the right-hand work surface.

   The right surface switches between two modes:
   - Chat: ask the documents questions (reactive).
   - Readiness: audit the package against a jurisdiction blueprint (proactive).
   Both share the same PDF viewer on the left, so a chat citation or a readiness
   gap both jump the viewer to the exact page.

   Layout:
   - lg+ : viewer | (manager + [Chat/Readiness] surface).
   - < lg: a tab bar switches Reader / Files / Chat / Readiness.
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

type RightView = "chat" | "readiness";

const ChatWorkspace = ({ chatId, pdfUrls, documents }: Props) => {
  const [documentIds, setDocumentIds] = React.useState<string[]>([]);
  // Files panel starts collapsed so the default view is an uncluttered two-pane
  // (reader | work surface); the toggle reveals the document manager on demand.
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [rightView, setRightView] = React.useState<RightView>("chat");
  const isDesktop = useIsDesktop();

  // Prefer the real Document records (these carry the ids/names citations
  // reference). Fall back to legacy `pdfUrls` for sessions that predate them.
  const viewerDocs: ViewerDoc[] = React.useMemo(() => {
    if (documents && documents.length > 0) return documents;
    return pdfUrls.map((url, i) => ({
      id: `pdf-${i}`,
      name: `Document ${i + 1}`,
      viewUrl: url,
    }));
  }, [documents, pdfUrls]);

  const scopeLabel =
    documentIds.length > 0
      ? `scope · ${documentIds.length} document${documentIds.length === 1 ? "" : "s"}`
      : "scope · all documents";

  const chatSurface = (
    <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card/60">
      <PdfChatBox chatId={chatId} documentIds={documentIds} />
    </div>
  );

  const readinessSurface = (
    <div className="min-h-0 flex-1 overflow-hidden">
      <ReadinessPanel sessionId={chatId} className="h-full" />
    </div>
  );

  // Desktop segmented control: Chat | Readiness.
  const segmented = (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
      <SegButton
        active={rightView === "chat"}
        onClick={() => setRightView("chat")}
        icon={<MessagesSquare className="h-3.5 w-3.5" aria-hidden />}
      >
        Chat
      </SegButton>
      <SegButton
        active={rightView === "readiness"}
        onClick={() => setRightView("readiness")}
        icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
      >
        Readiness
      </SegButton>
    </div>
  );

  // The right-hand work surface (Chat / Readiness) plus its top bar. The bar
  // carries the app-sidebar toggle, the files toggle, the mode switch, and scope.
  const desktopRight = (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden border-l border-border p-4">
      <div className="mb-3 flex items-center gap-2">
        <SidebarTrigger className="h-8 w-8 shrink-0 text-muted-foreground" />
        <Button
          variant={panelOpen ? "secondary" : "outline"}
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setPanelOpen((v) => !v)}
          aria-pressed={panelOpen}
          aria-label={panelOpen ? "Hide files" : "Show files"}
        >
          <Library className="h-4 w-4" />
        </Button>
        {segmented}
        <span className="ml-auto hidden truncate font-mono text-[11px] text-muted-foreground xl:inline">
          {scopeLabel}
        </span>
      </div>
      {rightView === "chat" ? chatSurface : readinessSurface}
    </div>
  );

  return (
    <DocumentViewerProvider>
      <div className="bg-paper flex h-full w-full flex-col overflow-hidden">
        {/* ---------- Desktop: reader | (files) | work surface ---------- */}
        {isDesktop ? (
          <div className="flex h-full min-w-0">
            {/* Reader */}
            <div className="min-w-0 flex-1 overflow-hidden p-4">
              <DocumentViewer documents={viewerDocs} />
            </div>

            {/* Files (collapsed by default) */}
            <div
              className={cn(
                "shrink-0 overflow-hidden transition-[width] duration-300 ease-out",
                panelOpen ? "w-72 py-4 pr-2" : "w-0",
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

            {/* Work surface: Chat | Readiness */}
            {desktopRight}
          </div>
        ) : (
          /* ---------- Mobile / tablet: tabbed ---------- */
          <Tabs defaultValue="chat" className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <SidebarTrigger className="h-8 w-8 shrink-0 text-muted-foreground" />
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
                <TabsTrigger value="readiness" className="gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Readiness
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
              className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 data-[state=inactive]:hidden"
            >
              {chatSurface}
            </TabsContent>

            <TabsContent
              value="readiness"
              className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 data-[state=inactive]:hidden"
            >
              {readinessSurface}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DocumentViewerProvider>
  );
};

function SegButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export default ChatWorkspace;
