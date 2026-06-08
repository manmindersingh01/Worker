import { redirect } from "next/navigation";
import React from "react";
import { BookOpenText, Quote, ScrollText, Sparkles } from "lucide-react";
import SignIn from "~/components/discordLogin";
import SignInWithGoogle from "~/components/googleLogin";

import DotPattern from "~/components/ui/dot-pattern";
import { getUserSession } from "~/hooks/getUser";
import { cn } from "~/lib/utils";

const FEATURES = [
  {
    icon: ScrollText,
    title: "Many PDFs, one conversation",
    body: "Upload a stack of documents and question them together — answers reason across the whole shelf.",
  },
  {
    icon: Quote,
    title: "Grounded, cited answers",
    body: "Every claim is footnoted to the exact document and page, so you can trust — and verify — each line.",
  },
  {
    icon: BookOpenText,
    title: "Read alongside the chat",
    body: "An embedded reader sits beside the conversation; jump from a citation straight to its source.",
  },
];

async function Page() {
  const session = await getUserSession();

  if (session?.user) {
    redirect("/chatroom");
  }

  return (
    <div className="bg-paper relative min-h-[100dvh] w-full overflow-hidden">
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(680px_circle_at_50%_22%,white,transparent)] fill-foreground/[0.06]",
        )}
      />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground shadow-paper">
            <BookOpenText className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            Archive
          </span>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur-sm sm:inline-flex">
          <Sparkles className="h-3 w-3 text-accent" aria-hidden />
          grounded retrieval · cited answers
        </span>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-6xl px-6">
        <section className="flex flex-col items-center pt-12 text-center sm:pt-16">
          <span className="animate-fade-up rounded-full border border-accent/40 bg-accent-soft px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-wide text-accent-foreground">
            Your reading room for documents
          </span>

          <h1
            className="text-balance mt-6 max-w-3xl animate-fade-up font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl"
            style={{ animationDelay: "60ms" }}
          >
            Ask your documents.
            <br />
            <span className="text-accent">Get answers with receipts.</span>
          </h1>

          <p
            className="text-balance mt-5 max-w-xl animate-fade-up text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ animationDelay: "120ms" }}
          >
            Upload your PDFs and have a conversation grounded in their contents —
            every answer cites the page it came from, so nothing is invented.
          </p>

          <div
            className="mt-9 flex animate-fade-up flex-col items-center gap-3 sm:flex-row"
            style={{ animationDelay: "180ms" }}
          >
            <SignInWithGoogle />
            <SignIn />
          </div>
          <p
            className="mt-4 animate-fade-in font-mono text-[11px] text-muted-foreground"
            style={{ animationDelay: "260ms" }}
          >
            No setup — sign in and start reading.
          </p>
        </section>

        {/* Hero media */}
        <section
          className="mx-auto mt-14 max-w-4xl animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-card/80 p-2 shadow-paper-lg backdrop-blur-sm">
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="pointer-events-none h-auto w-full object-cover"
              >
                <source src="/hero.mp4" type="video/mp4" />
                <track
                  src="/path/to/captions.vtt"
                  kind="subtitles"
                  srcLang="en"
                  label="English"
                />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mt-20 grid gap-5 pb-24 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="animate-fade-up rounded-2xl border border-border bg-card/70 p-6 shadow-paper backdrop-blur-sm transition-colors hover:border-accent/40"
              style={{ animationDelay: `${300 + i * 80}ms` }}
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                <f.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default Page;
