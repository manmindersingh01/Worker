"use client";
import React, { useEffect } from "react";
import { useChat } from "ai/react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Loader2, LoaderPinwheelIcon, SendIcon } from "lucide-react";
import Messagelist from "./Messagelist";
import axios from "axios";

import toast, { Toaster } from "react-hot-toast";
type Props = {
  chatId: string;
};
const PdfChatBox = ({ chatId }: Props) => {
  const { input, handleInputChange, handleSubmit, messages, isLoading } =
    useChat({
      api: "/api/pdfchat",
      body: {
        chatId,
      },
      onError: (error) => {
        console.error(error);
        if (
          error.message.includes(
            "You don't have enough credits to perform this action",
          )
        ) {
          console.log("toast is comming");
          // alert("Insufficient Credits");
          toast("Insufficient Credits", {
            style: {
              border: "1px solid red",
            },
          });
        } else {
          toast("Serever error!");
        }
      },
    });

  console.log("messages", messages);
  // useEffect(() => {
  //   axios.get(`/api/getcredits`);

  //   console.log("Iput");
  // }, [handleSubmit]);

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
          onChange={handleInputChange}
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
