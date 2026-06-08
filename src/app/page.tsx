import { redirect } from "next/navigation";
import React from "react";
import {
  BookOpenText,
  FileText,
  Quote,
  ScrollText,
  Sparkles,
} from "lucide-react";
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

const TRUST = [
  "Page-level citations",
  "No hallucinated facts",
  "Your library stays private",
];

async function Page() {
  const session = await getUserSession();

  if (session?.user) {
    redirect("/chatroom");
  }

  return (
    <div className="bg-paper relative min-h-[100dvh] w-full overflow-hidden">
      {/* Atmosphere: warm key-light + faint dot grain + a soft saffron wash */}
      <div className="glow-saffron pointer-events-none absolute inset-x-0 top-0 z-0 h-[640px]" />
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(700px_circle_at_50%_18%,white,transparent)] fill-foreground/[0.06]",
        )}
      />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
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
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-wide text-accent-foreground shadow-paper">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Your reading room for documents
          </span>

          <h1
            className="text-balance mt-6 max-w-3xl animate-fade-up font-display text-4xl font-semibold leading-[1.04] tracking-tight text-foreground sm:text-6xl"
            style={{ animationDelay: "60ms" }}
          >
            Ask your documents.
            <br />
            <span className="text-accent">
              Get answers with{" "}
              <span className="marker animate-marker text-foreground">
                receipts.
              </span>
            </span>
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

          {/* Trust strip */}
          <ul
            className="mt-7 flex animate-fade-in flex-wrap items-center justify-center gap-x-5 gap-y-2"
            style={{ animationDelay: "320ms" }}
          >
            {TRUST.map((t) => (
              <li
                key={t}
                className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground"
              >
                <span className="h-1 w-1 rounded-full bg-accent" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* Hero media — a live-feeling preview of the reading room */}
        <section
          className="relative mx-auto mt-16 max-w-4xl animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          {/* Floating citation chips for depth */}
          <div className="animate-float pointer-events-none absolute -left-3 top-10 z-20 hidden rotate-[-4deg] rounded-lg border border-border bg-card px-3 py-2 shadow-paper-lg sm:block">
            <p className="font-mono text-[10px] uppercase tracking-wide text-accent">
              cited
            </p>
            <p className="font-mono text-[11px] text-foreground">
              report.pdf · p.12
            </p>
          </div>
          <div
            className="animate-float pointer-events-none absolute -right-4 top-24 z-20 hidden rotate-[5deg] rounded-lg border border-border bg-card px-3 py-2 shadow-paper-lg sm:block"
            style={{ animationDelay: "1.5s" }}
          >
            <p className="font-mono text-[10px] uppercase tracking-wide text-success">
              indexed
            </p>
            <p className="font-mono text-[11px] text-foreground">3 documents</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card/90 p-2 shadow-paper-xl backdrop-blur-sm">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="h-3 w-3 rounded-full bg-destructive/70" />
              <span className="h-3 w-3 rounded-full bg-warning/70" />
              <span className="h-3 w-3 rounded-full bg-success/70" />
              <span className="ml-3 truncate font-mono text-[11px] text-muted-foreground">
                archive — annual-report.pdf · 3 docs
              </span>
            </div>

            <div className="grid gap-2 overflow-hidden rounded-xl border border-border bg-background md:grid-cols-[1.15fr_1fr]">
              {/* Chat column */}
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                {/* User question */}
                <div className="self-end rounded-2xl rounded-br-sm bg-secondary px-4 py-2.5 text-left text-sm text-secondary-foreground shadow-paper">
                  What was the YoY revenue growth, and where is it stated?
                </div>

                {/* Assistant answer with inline citation */}
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 text-left shadow-paper">
                  <p className="text-sm leading-relaxed text-foreground">
                    Revenue grew{" "}
                    <span className="marker font-medium">24% year-over-year</span>
                    , from $4.1B to $5.1B
                    <sup className="ml-0.5 font-mono text-[10px] font-semibold text-accent">
                      [1]
                    </sup>
                    .
                  </p>
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-accent-soft/60 px-2.5 py-1.5">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      [1] annual-report.pdf — page 12
                    </span>
                  </div>
                </div>

                {/* Mock input */}
                <div className="mt-1 flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">
                    Ask anything across your library
                  </span>
                  <span className="animate-caret ml-0.5 h-4 w-px bg-accent" />
                  <span className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              </div>

              {/* Source / reader column */}
              <div className="ruled hidden flex-col border-l border-border bg-card/40 p-5 sm:p-6 md:flex">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Source · page 12
                  </span>
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] text-accent-foreground">
                    [1]
                  </span>
                </div>
                <h4 className="mt-4 font-display text-sm font-semibold text-foreground">
                  Financial Highlights
                </h4>
                <div className="mt-3 space-y-2">
                  <span className="block h-2 w-full rounded bg-foreground/10" />
                  <span className="block h-2 w-[88%] rounded bg-foreground/10" />
                  <p className="!mt-3 text-xs leading-relaxed text-muted-foreground">
                    Total revenue for the fiscal year reached{" "}
                    <span className="marker font-medium text-foreground">
                      $5.1 billion, up 24%
                    </span>{" "}
                    from the prior year, driven by expansion across all segments.
                  </p>
                  <span className="block h-2 w-[94%] rounded bg-foreground/10" />
                  <span className="block h-2 w-[70%] rounded bg-foreground/10" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features — set like footnotes in the margin */}
        <section className="mt-24 pb-28">
          <p className="mb-8 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Why it reads differently
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="group animate-fade-up relative overflow-hidden rounded-2xl border border-border bg-card/70 p-6 shadow-paper backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-accent/50 hover:shadow-paper-lg"
                style={{ animationDelay: `${300 + i * 80}ms` }}
              >
                <span className="pointer-events-none absolute right-5 top-4 font-display text-5xl font-semibold text-accent/10 transition-colors group-hover:text-accent/20">
                  {`0${i + 1}`}
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent ring-1 ring-accent/10">
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
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-accent-foreground">
              <BookOpenText className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="font-display text-sm font-semibold text-foreground">
              Archive
            </span>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            Answers you can trace back to the page.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Page;
