import { Message } from "ai/react";
import React from "react";
import { cn } from "~/lib/utils";

type Props = {
  message: Message[];
};

const Messagelist = ({ message }: Props) => {
  if (!message) return <></>;
  return (
    <div className="flex flex-col gap-2 px-4">
      {message.map((msg, index) => (
        <div
          className={cn(
            "flex text-sm",
            msg.role === "user" ? "justify-end pl-10" : "justify-start pr-10",
          )}
          key={msg.id}
        >
          <div
            className={cn("rounded-lg px-3 py-1 text-sm shadow-md ring-1", {
              "bg-primary text-white": msg.role === "user",
              "bg-secondary": msg.role === "assistant",
            })}
          >
            {msg.content}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Messagelist;
