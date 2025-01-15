import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Message } from "ai";
import { cn } from "~/lib/utils";
import { Bot, UserIcon } from "lucide-react";
interface CodeProps {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}
const MessageList = ({ message }: { message: Message[] }) => {
  if (!message.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin text-zinc-400">...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4">
      {message.map((message) => (
        <div
          key={message.id}
          className={cn("flex items-start gap-4", {
            "justify-end": message.role === "user",
          })}
        >
          {message.role === "user" ? (
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
              "bg-zinc-800 text-white": message.role === "user",
              "prose prose-zinc bg-gray-100 text-black":
                message.role === "assistant",
            })}
          >
            {message.role === "assistant" ? (
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="mb-4 text-2xl font-bold text-blue-600">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mb-3 text-xl font-semibold text-blue-500">
                      {children}
                    </h2>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-4 rounded border-l-4 border-blue-500 bg-blue-50 py-2 pl-4 italic">
                      {children}
                    </blockquote>
                  ),
                  code: ({
                    inline,
                    className,
                    children,
                    ...props
                  }: CodeProps) => {
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
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        {children}
                      </table>
                    </div>
                  ),
                  // Add styles for other elements as needed
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;
