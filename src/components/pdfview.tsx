"use client";
import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

const PdfView = ({ pdfUrl }: { pdfUrl: string[] }) => {
  const [viewerStates, setViewerStates] = useState<
    Array<{
      loading: boolean;
      error: boolean;
      fallbackAttempted: boolean;
    }>
  >([]);

  useEffect(() => {
    // Initialize states for each PDF
    setViewerStates(
      pdfUrl.map(() => ({
        loading: true,
        error: false,
        fallbackAttempted: false,
      })),
    );
  }, [pdfUrl]);

  const handleLoadError = (index: number) => {
    setViewerStates((prev) => {
      const newStates = [...prev];
      newStates[index] = {
        loading: false,
        error: true,
        fallbackAttempted: false,
      };
      return newStates;
    });
  };

  const handleLoadSuccess = (index: number) => {
    setViewerStates((prev) => {
      const newStates = [...prev];
      newStates[index] = {
        loading: false,
        error: false,
        fallbackAttempted: false,
      };
      return newStates;
    });
  };

  return (
    <div className="flex w-full flex-col gap-4">
      {pdfUrl.map((url, index) => (
        <div key={index} className="relative">
          {viewerStates[index]?.error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading PDF</AlertTitle>
              <AlertDescription>
                <p>The PDF could not be loaded. This might be due to:</p>
                <ul className="ml-6 mt-2 list-disc">
                  <li>
                    The PDF file is too large (Google Docs viewer has a size
                    limit)
                  </li>
                  <li>The PDF URL is not publicly accessible</li>
                  <li>The PDF requires authentication</li>
                  <li>The file format is not supported</li>
                </ul>
                <div className="mt-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Open PDF directly
                  </a>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="h-96 w-full">
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
                className="h-full w-full border-0"
                title={`PDF Viewer ${index + 1}`}
                onLoad={() => handleLoadSuccess(index)}
                onError={() => handleLoadError(index)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PdfView;
