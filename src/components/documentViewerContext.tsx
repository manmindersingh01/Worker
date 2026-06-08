"use client";

import React from "react";

export type PageJumpTarget = {
  /** Database id of the document, when known (from a source chip). */
  documentId?: string;
  /** Human-readable document name, used to match by name as a fallback. */
  docName: string;
  /** 1-based page number the citation points at. */
  page: number;
  /** Bumped on every request so identical targets still trigger an effect. */
  nonce: number;
};

type DocumentViewerContextValue = {
  /** The page-jump the viewer should honour, or null. */
  target: PageJumpTarget | null;
  /**
   * Ask the viewer to switch to the document for a citation and surface its
   * page. The embedded Google Docs viewer cannot deep-link to a page, so the
   * viewer switches documents and visibly indicates the target page.
   */
  requestPage: (req: { documentId?: string; docName: string; page: number }) => void;
};

const DocumentViewerContext =
  React.createContext<DocumentViewerContextValue | null>(null);

export function DocumentViewerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [target, setTarget] = React.useState<PageJumpTarget | null>(null);
  const nonceRef = React.useRef(0);

  const requestPage = React.useCallback(
    (req: { documentId?: string; docName: string; page: number }) => {
      nonceRef.current += 1;
      setTarget({ ...req, nonce: nonceRef.current });
    },
    [],
  );

  const value = React.useMemo(
    () => ({ target, requestPage }),
    [target, requestPage],
  );

  return (
    <DocumentViewerContext.Provider value={value}>
      {children}
    </DocumentViewerContext.Provider>
  );
}

/**
 * Access the viewer bridge. Returns a no-op `requestPage` when used outside a
 * provider so the chat surface degrades gracefully (e.g. on mobile where the
 * viewer is in a separate tab).
 */
export function useDocumentViewer(): DocumentViewerContextValue {
  const ctx = React.useContext(DocumentViewerContext);
  if (ctx) return ctx;
  return {
    target: null,
    requestPage: () => {
      /* no viewer mounted */
    },
  };
}
