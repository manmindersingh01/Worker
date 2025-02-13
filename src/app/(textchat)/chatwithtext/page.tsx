"use client";
import React, { useEffect, useRef, useState } from "react";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { SendIcon, LoaderIcon } from "lucide-react";
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
    <div className="mx-w-screen flex h-screen items-center justify-center bg-background p-4">
      <div className="flex h-full w-full max-w-4xl flex-col text-wrap">
        <ScrollArea className="flex-1 p-4">
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
                    className={`w-auto max-w-[85%] overflow-x-auto rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-white"
                        : "bg-secondary"
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
                              className="overflow-scroll text-wrap rounded-md bg-gray-100 px-2 py-1 text-sm text-gray-800"
                              {...props}
                            >
                              {typeof children === "string"
                                ? children
                                : String(children)}
                            </code>
                          );
                        },
                        h1: ({ children }) => (
                          <h1 className="mb-4 text-2xl font-bold text-blue-700">
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
              <div className="flex h-full w-full items-center justify-center p-10">
                <p>Hi, I&#39;m a bot. How can I assist you today?</p>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="mb-10 rounded-lg p-2">
          <form
            onSubmit={handleSubmit}
            className="flex items-center justify-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message"
              disabled={isLoading}
            />
            <Button
              type="submit"
              className="hover:bg-black"
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
