"use client";
import React, { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Loader2, SendIcon } from "lucide-react";
import Messagelist, { type ChatUIMessage } from "./Messagelist";
import toast, { Toaster } from "react-hot-toast";

type Props = {
  chatId: string;
  documentIds?: string[];
};

const PdfChatBox = ({ chatId, documentIds }: Props) => {
  const [input, setInput] = useState("");

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
        toast("Insufficient Credits", {
          style: { border: "1px solid red" },
        });
      } else {
        toast("Server error!");
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    const messageConatiner = document.getElementById("message-conatiner");
    messageConatiner?.scrollTo({
      top: messageConatiner.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    void sendMessage({ text });
    setInput("");
  };

  return (
    <div
      id="message-conatiner"
      className="relative h-full overflow-auto"
    >
      <div className="sticky inset-x-0 top-0 z-50 flex items-center gap-2 border-b border-border bg-card/85 px-4 py-3 backdrop-blur-sm">
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
        <h3 className="font-display text-base font-semibold text-foreground">
          Conversation
        </h3>
      </div>

      <div className="px-1">
        <Messagelist message={messages} />
      </div>
      {isLoading && (
        <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          Thinking…
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="sticky inset-x-0 bottom-0 flex gap-2 border-t border-border bg-card/85 p-3 backdrop-blur-sm"
      >
        <Input
          placeholder="Ask anything about your documents…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="bg-background"
        />
        <Button aria-label="Send message">
          <SendIcon />
        </Button>
      </form>
      <Toaster />
    </div>
  );
};

export default PdfChatBox;
