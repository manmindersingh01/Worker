import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { UIMessage } from "ai";
import { cn } from "~/lib/utils";
import { Bot, UserIcon } from "lucide-react";

type SourceChip = {
  documentId: string;
  docName: string;
  page: number;
  snippet: string;
};

// UI message type for the PDF chat: standard parts plus a `data-sources` part.
export type ChatUIMessage = UIMessage<never, { sources: SourceChip[] }>;

interface CodeProps {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-4 text-sm font-bold text-blue-600">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-3 text-sm font-semibold text-blue-500">{children}</h2>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-4 rounded border-l-4 border-blue-500 bg-blue-50 py-2 pl-4 italic">
      {children}
    </blockquote>
  ),
  code: ({ inline, className, children, ...props }: CodeProps) => {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
        className="rounded-md"
        {...props}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    ) : (
      <code
        className="rounded bg-gray-200 px-1 py-0.5 text-blue-600"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">{children}</table>
    </div>
  ),
};

const MessageList = ({ message }: { message: ChatUIMessage[] }) => {
  if (!message.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="h-8 w-fit text-zinc-400">no chats yet...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4">
      {message.map((m) => {
        const text = m.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("");

        const sources = m.parts
          .filter((p) => p.type === "data-sources")
          .flatMap(
            (p) => (p as { type: "data-sources"; data: SourceChip[] }).data,
          );

        return (
          <div
            key={m.id}
            className={cn("flex items-start gap-4", {
              "justify-end": m.role === "user",
            })}
          >
            {m.role === "user" ? (
              <div className="rounded-full bg-zinc-800 p-2">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
            ) : (
              <div className="rounded-full bg-blue-600 p-2">
                <Bot className="h-6 w-6 text-white" />
              </div>
            )}
            <div
              className={cn("max-w-3xl rounded-lg px-4 py-2", {
                "bg-zinc-800 text-white": m.role === "user",
                "prose prose-zinc bg-gray-100 text-black":
                  m.role === "assistant",
              })}
            >
              {m.role === "assistant" ? (
                <ReactMarkdown components={markdownComponents}>
                  {text}
                </ReactMarkdown>
              ) : (
                <p>{text}</p>
              )}

              {sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {sources.map((s, i) => (
                    <span
                      key={`${s.documentId}-${s.page}-${i}`}
                      title={s.snippet}
                      className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                    >
                      {s.docName} p.{s.page}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
