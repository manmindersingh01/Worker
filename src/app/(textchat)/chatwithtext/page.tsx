"use client";
import React, { useEffect, useRef, useState } from "react";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { SendIcon, LoaderIcon, MessageSquareText } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useAuthStore } from "~/lib/store";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
interface CodeProps {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}
type Message = {
  role: "user" | "assistant";
  content: string;
};

const PdfChat = () => {
  const { userId, setUserId } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchUserSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        // console.log("data", data);

        if (data?.userId) {
          setUserId(data.userId);
        }
      } catch (error) {
        console.error("Error fetching user session:", error);
      }
    };
    void fetchUserSession();
  }, [setUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage = { role: "user" as const, content: input };

    setMessages((prev) => [...prev, userMessage]);

    const assistantMessage = { role: "assistant" as const, content: "" };
    setMessages((prev) => [...prev, assistantMessage]);

    setInput("");
    console.log("userID", userId);

    try {
      const response = await fetch("/api/chat2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userId,
        }),
      });

      if (!response.ok) throw new Error(response.statusText);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);

          setMessages((prev) => {
            const newMessages = [...prev];

            newMessages[newMessages.length - 1].content += chunk;
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "Sorry, there was an error processing your request.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background p-4">
      <div className="aurora pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative z-10 flex h-full w-full max-w-3xl flex-col">
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] text-background shadow-[0_0_20px_-6px_hsl(var(--grad-from)/0.8)]">
            <MessageSquareText className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold leading-tight">
              Chat with text
            </h2>
            <p className="font-mono text-[11px] text-muted-foreground">
              Ask anything — grounded, streamed answers
            </p>
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1 rounded-xl border border-border bg-card/30 p-4 backdrop-blur-sm">
          <div className="space-y-4">
            {messages.length > 0 ? (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`w-auto max-w-[85%] overflow-x-auto p-3 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-[hsl(var(--grad-from))] to-[hsl(var(--grad-via))] text-background"
                        : "rounded-2xl rounded-bl-sm border border-border bg-card text-foreground"
                    }`}
                  >
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({
                          inline,
                          className,
                          children,
                          ...props
                        }: CodeProps) {
                          const match = /language-(\w+)/.exec(className ?? "");
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {typeof children === "string"
                                ? children.replace(/\n$/, "")
                                : String(children)}
                            </SyntaxHighlighter>
                          ) : (
                            <code
                              className="overflow-scroll text-wrap rounded-md bg-muted px-2 py-1 text-sm text-foreground"
                              {...props}
                            >
                              {typeof children === "string"
                                ? children
                                : String(children)}
                            </code>
                          );
                        },
                        h1: ({ children }) => (
                          <h1 className="mb-4 text-2xl font-bold text-foreground">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="mb-3 text-xl font-semibold">
                            {children}
                          </h2>
                        ),
                        li: ({ children }) => (
                          <li className="ml-6 list-disc">{children}</li>
                        ),
                        ol: ({ children }) => (
                          <ol className="ml-6 list-decimal">{children}</ol>
                        ),
                        ul: ({ children }) => (
                          <ul className="ml-6 list-disc">{children}</ul>
                        ),
                        p: ({ children }) => <p className="mb-2">{children}</p>,
                      }}
                    >
                      {message.content}
                    </Markdown>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 p-10 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[hsl(var(--accent)/0.4)] bg-card text-[hsl(var(--accent))]">
                  <MessageSquareText className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">Start a conversation</h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Ask a question or paste some text below — answers stream in
                    as they&#39;re generated.
                  </p>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="mt-3 rounded-xl border border-border bg-card/60 p-2 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              disabled={isLoading}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0 bg-gradient-to-r from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] text-background shadow-[0_0_20px_-6px_hsl(var(--grad-from)/0.8)] hover:opacity-95 hover:bg-gradient-to-r disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <LoaderIcon className="animate-spin" />
              ) : (
                <SendIcon />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PdfChat;
