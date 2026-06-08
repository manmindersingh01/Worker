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
      className="relative max-h-screen overflow-scroll"
    >
      <div className="sticky inset-x-0 top-0 z-50 h-fit bg-white p-2">
        <h3 className="text-xl font-bold">Chat</h3>
      </div>

      <Messagelist message={messages} />
      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="animate-spin" />
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="sticky inset-x-0 bottom-0 flex gap-2 p-2"
      >
        <Input
          placeholder="ask any question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button>
          <SendIcon />
        </Button>
      </form>
      <Toaster />
    </div>
  );
};

export default PdfChatBox;
