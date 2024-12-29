"use client";
import React, { useEffect } from "react";
import { useChat } from "ai/react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { SendIcon } from "lucide-react";
import Messagelist from "./Messagelist";
type Props = {
  chatId: string;
};

const PdfChatBox = ({ chatId }: Props) => {
  const { input, handleInputChange, handleSubmit, messages } = useChat({
    api: "/api/pdfchat",
    body: {
      chatId,
    },
  });
  useEffect(() => {
    const messageConatiner = document.getElementById("message-conatiner");
    messageConatiner?.scrollTo({
      top: messageConatiner.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);
  return (
    <div
      id="message-conatiner"
      className="relative max-h-screen overflow-scroll"
    >
      <div className="sticky inset-x-0 top-0 z-50 h-fit bg-white p-2">
        <h3 className="text-xl font-bold">Chat</h3>
      </div>

      <Messagelist message={messages} />
      <form
        onSubmit={handleSubmit}
        className="sticky inset-x-0 bottom-0 flex gap-2 p-2"
      >
        <Input
          placeholder="ask any question"
          value={input}
          onChange={handleInputChange}
        />
        <Button>
          <SendIcon />
        </Button>
      </form>
    </div>
  );
};

export default PdfChatBox;
