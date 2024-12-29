"use client";
import { redirect } from "next/navigation";
import React from "react";
import Globe from "~/components/globe";
import { RainbowButton } from "~/components/ui/rainbow-button";

const ChatRoom = () => {
  return (
    <div className="flex w-full flex-col items-center justify-center">
      <Globe />
      <div className="relative -top-40 z-50 flex gap-4 rounded-lg border-primary-foreground p-2 text-white">
        <RainbowButton onClick={() => redirect("/uploadFile")}>
          Chat with pdf
        </RainbowButton>
        <RainbowButton onClick={() => redirect("/chatwithtext")}>
          Chat with text
        </RainbowButton>
      </div>
    </div>
  );
};

export default ChatRoom;
