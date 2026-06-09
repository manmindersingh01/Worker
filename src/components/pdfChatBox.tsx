"use client";
import React, { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "./ui/button";
import { SendIcon } from "lucide-react";
import Messagelist, { type ChatUIMessage } from "./Messagelist";
import toast, { Toaster } from "react-hot-toast";
import { cn } from "~/lib/utils";
import { MAX_MESSAGES_PER_USER } from "~/lib/limits";

type Props = {
  chatId: string;
  documentIds?: string[];
};

const PdfChatBox = ({ chatId, documentIds }: Props) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/pdfchat",
      body: { chatId, documentIds },
    }),
    onError: (error) => {
      console.error(error);
      if (
        error.message.includes(
          "You don't have enough credits to perform this action",
        )
      ) {
        toast.error("Insufficient credits to send this message.");
      } else if (
        error.message.includes("MESSAGE_LIMIT") ||
        error.message.toLowerCase().includes("message limit")
      ) {
        toast.error("You've reached the demo message limit.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    },
  });

  const isSubmitting = status === "submitted";
  const isStreaming = status === "streaming";
  const isLoading = isSubmitting || isStreaming;

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const limitReached = userMessageCount >= MAX_MESSAGES_PER_USER;

  // Auto-scroll to the newest content as messages stream in.
  useEffect(() => {
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const submit = () => {
    const text = input.trim();
    if (!text || isLoading || limitReached) return;
    void sendMessage({ text });
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card/85 px-4 py-3 backdrop-blur-sm">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <h3 className="font-display text-base font-semibold text-foreground">
          Conversation
        </h3>
      </div>

      {/* Scrollable message area */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <Messagelist message={messages} streaming={isStreaming} />

        {/* Submitted (pre-stream) skeleton */}
        {isSubmitting && (
          <div className="flex animate-fade-in items-start gap-3 px-3 pb-4">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            </span>
            <div className="w-full max-w-[42rem] space-y-2 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border bg-card/85 p-3 backdrop-blur-sm"
      >
        <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-3 py-2 transition-colors focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-ring/40">
          <textarea
            ref={textareaRef}
            placeholder="Ask anything about your documents…"
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
            }}
            onKeyDown={handleKeyDown}
            aria-label="Message"
            disabled={limitReached}
            className="max-h-40 flex-1 resize-none bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || limitReached || !input.trim()}
            aria-label="Send message"
            className={cn("h-8 w-8 shrink-0 transition-opacity")}
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 px-1 font-mono text-[10px] text-muted-foreground">
          {limitReached
            ? `Demo limit reached (${MAX_MESSAGES_PER_USER} messages).`
            : "Enter to send · Shift+Enter for a new line"}
        </p>
      </form>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
            fontSize: "13px",
          },
        }}
      />
    </div>
  );
};

export default PdfChatBox;
