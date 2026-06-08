"use client";

import Link from "next/link";
import React from "react";
import { ArrowRight, FileText, MessageSquareText } from "lucide-react";

import Globe from "~/components/ui/globe";

const MODES = [
  {
    href: "/uploadFile",
    icon: FileText,
    title: "Chat with a PDF",
    body: "Upload documents and ask questions grounded in their pages — every answer cited to the source.",
  },
  {
    href: "/chatwithtext",
    icon: MessageSquareText,
    title: "Chat with text",
    body: "Paste or type raw text and start a grounded conversation instantly — no upload needed.",
  },
];

const ChatRoom = () => {
  return (
    <div className="relative flex min-h-[72vh] w-full flex-col items-center justify-center overflow-hidden px-4 py-16">
      {/* Dimmed globe backdrop (decorative, non-interactive) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 opacity-50 [mask-image:radial-gradient(circle,#000_40%,transparent_72%)]">
        <Globe />
      </div>
      <div className="aurora pointer-events-none absolute inset-0 opacity-40" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl text-center">
        <span className="border-gradient relative inline-flex items-center gap-2 rounded-full bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--grad-to))]" />
          Your workspace
        </span>

        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
          What would you like to{" "}
          <span className="text-gradient">explore?</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Pick a mode to start a grounded conversation with your content.
        </p>

        <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
          {MODES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-[hsl(var(--accent)/0.5)] hover:shadow-[0_0_44px_-12px_hsl(var(--grad-from)/0.6)]"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[radial-gradient(circle,hsl(var(--grad-from)/0.18),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] text-background shadow-[0_0_24px_-6px_hsl(var(--grad-from)/0.8)]">
                <m.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-5 flex items-center gap-2 text-lg font-semibold">
                {m.title}
                <ArrowRight className="h-4 w-4 -translate-x-1 text-[hsl(var(--accent))] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {m.body}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
