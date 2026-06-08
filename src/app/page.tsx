import { redirect } from "next/navigation";
import Link from "next/link";
import React from "react";
import {
  ArrowRight,
  BookOpenText,
  FileStack,
  Layers,
  MessageSquareText,
  Quote,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

import PlasmaOrb from "~/components/plasmaOrb";
import { getUserSession } from "~/hooks/getUser";

const NAV = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "FAQ", href: "#faq" },
];

const FORMATS = [
  "PDFs",
  "Research papers",
  "Contracts",
  "Financial reports",
  "Manuals",
  "Slide decks",
  "Whitepapers",
  "Case files",
  "Policies",
  "Textbooks",
];

const FEATURES = [
  {
    icon: ScrollText,
    title: "Many PDFs, one conversation",
    body: "Upload a stack of documents and question them together — answers reason across your whole library at once.",
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

const STEPS = [
  {
    icon: Upload,
    title: "Upload your documents",
    body: "Drop in PDFs — one or a hundred. Your library stays private to you.",
  },
  {
    icon: Layers,
    title: "We index every page",
    body: "Each document is parsed and embedded so meaning, not just keywords, is searchable.",
  },
  {
    icon: MessageSquareText,
    title: "Ask, get cited answers",
    body: "Chat naturally. Every response links back to the exact page it came from.",
  },
];

const FAQ = [
  {
    q: "How do citations work?",
    a: "Every answer is generated only from passages retrieved out of your documents, and each claim is linked to the specific document and page number so you can verify it instantly.",
  },
  {
    q: "Can it read across multiple PDFs at once?",
    a: "Yes. Upload as many documents as you like — questions reason across your entire library, not one file at a time.",
  },
  {
    q: "Will it make things up?",
    a: "Answers are grounded in retrieved content. If the documents don't contain the answer, Levia tells you rather than inventing one.",
  },
  {
    q: "Is my data private?",
    a: "Your library is tied to your account and is only used to answer your questions.",
  },
];

async function Page() {
  const session = await getUserSession();

  if (session?.user) {
    redirect("/chatroom");
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-background text-foreground">
      {/* ====== Nav ====== */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] text-background shadow-[0_0_24px_-4px_hsl(var(--grad-from)/0.7)]">
              <BookOpenText className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight">Levia</span>
          </Link>

          <nav className="border-gradient hidden items-center gap-1 rounded-full bg-card/50 px-1.5 py-1.5 backdrop-blur-sm md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/signin"
              className="hidden rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/signin"
              className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] px-4 py-2 text-sm font-semibold text-background shadow-[0_0_24px_-6px_hsl(var(--grad-from)/0.8)] transition-shadow hover:shadow-[0_0_32px_-4px_hsl(var(--grad-from)/0.9)]"
            >
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ====== Hero ====== */}
      <section className="relative isolate overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(80%_70%_at_50%_0%,#000,transparent)]" />
        <div className="aurora pointer-events-none absolute inset-0" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
          {/* Left: copy */}
          <div className="animate-fade-up text-center lg:text-left">
            <span className="border-gradient inline-flex items-center gap-2 rounded-full bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--grad-to))] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--grad-to))]" />
              </span>
              Grounded retrieval · cited answers
            </span>

            <h1
              className="text-balance mx-auto mt-6 max-w-xl text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:mx-0"
              style={{ animationDelay: "60ms" }}
            >
              Chat with your documents,{" "}
              <span className="text-gradient text-gradient-animate">
                get answers with receipts
              </span>
            </h1>

            <p className="text-balance mx-auto mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              Upload your PDFs and have a conversation grounded in their
              contents. Every answer cites the exact page it came from — so
              nothing is invented.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/signin"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] px-6 py-3 text-sm font-semibold text-background shadow-[0_0_36px_-8px_hsl(var(--grad-from)/0.9)] transition-transform hover:-translate-y-0.5"
              >
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#how"
                className="border-gradient inline-flex items-center gap-2 rounded-full bg-card/50 px-6 py-3 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-card"
              >
                See how it works
              </a>
            </div>

            <p className="mt-5 font-mono text-[11px] text-muted-foreground">
              No setup — sign in and start reading.
            </p>
          </div>

          {/* Right: orb */}
          <div
            className="relative mx-auto w-full max-w-md animate-fade-up"
            style={{ animationDelay: "140ms" }}
          >
            <PlasmaOrb className="w-full" />

            {/* Floating proof chips — opposite corners of the orb */}
            <div className="animate-float absolute -left-3 top-2 z-10 rounded-xl border border-[hsl(var(--accent)/0.4)] bg-card/85 px-3 py-2 shadow-lg backdrop-blur-md sm:-left-6 sm:top-6">
              <p className="font-mono text-[10px] uppercase tracking-wide text-[hsl(var(--grad-to))]">
                cited
              </p>
              <p className="font-mono text-[11px] text-foreground">
                report.pdf · p.12
              </p>
            </div>
            <div
              className="animate-float absolute -right-3 bottom-2 z-10 rounded-xl border border-[hsl(var(--success)/0.4)] bg-card/85 px-3 py-2 shadow-lg backdrop-blur-md sm:-right-6 sm:bottom-6"
              style={{ animationDelay: "1.6s" }}
            >
              <p className="font-mono text-[10px] uppercase tracking-wide text-[hsl(var(--success))]">
                indexed
              </p>
              <p className="font-mono text-[11px] text-foreground">
                3 documents
              </p>
            </div>
          </div>
        </div>

        {/* ====== Formats marquee ====== */}
        <div className="relative border-y border-border/40 bg-card/20 py-8">
          <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            Everything you read, in one conversation
          </p>
          <div className="marquee-mask relative flex overflow-hidden">
            <div className="animate-marquee flex shrink-0 items-center gap-4 pr-4">
              {[...FORMATS, ...FORMATS].map((f, i) => (
                <span
                  key={`${f}-${i}`}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground"
                >
                  <FileStack className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====== Features ====== */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[hsl(var(--accent))]">
            Our services
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Built for answers you can{" "}
            <span className="text-gradient">trust</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Levia is a document retrieval system — chat with your files and get
            responses grounded in the source, every time.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-6 transition-all hover:-translate-y-1 hover:border-[hsl(var(--accent)/0.5)] hover:shadow-[0_0_40px_-12px_hsl(var(--grad-from)/0.5)]"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[radial-gradient(circle,hsl(var(--grad-from)/0.18),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] text-background shadow-[0_0_24px_-6px_hsl(var(--grad-from)/0.8)]">
                <f.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
              <span className="pointer-events-none absolute right-5 top-5 font-mono text-xs text-muted-foreground/50">
                0{i + 1}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ====== How it works ====== */}
      <section id="how" className="relative scroll-mt-24 border-y border-border/40 bg-card/20 py-24">
        <div className="aurora pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[hsl(var(--accent))]">
              How it works
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              From upload to <span className="text-gradient">cited answer</span>
            </h2>
          </div>

          <div className="relative mt-14 grid gap-8 md:grid-cols-3">
            {/* connecting line */}
            <div className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.4)] to-transparent md:block" />
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative text-center md:text-left">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--accent)/0.4)] bg-background text-[hsl(var(--accent))] md:mx-0">
                  <s.icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="mt-4 font-mono text-xs text-muted-foreground">
                  Step 0{i + 1}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FAQ ====== */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-5 py-24">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[hsl(var(--accent))]">
            FAQ
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Questions, <span className="text-gradient">answered</span>
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-border bg-card/50 px-5 py-4 transition-colors open:border-[hsl(var(--accent)/0.4)] hover:border-[hsl(var(--accent)/0.3)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium">
                {item.q}
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-transform group-open:rotate-45">
                  <span className="text-lg leading-none">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ====== CTA band ====== */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="border-gradient relative overflow-hidden rounded-3xl bg-card/40 px-6 py-16 text-center">
          <div className="aurora pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative">
            <ShieldCheck className="mx-auto h-8 w-8 text-[hsl(var(--accent))]" />
            <h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Ready to read <span className="text-gradient">smarter?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Sign in and start asking your documents in under a minute.
            </p>
            <Link
              href="/signin"
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] px-7 py-3.5 text-sm font-semibold text-background shadow-[0_0_40px_-8px_hsl(var(--grad-from)/0.9)] transition-transform hover:-translate-y-0.5"
            >
              Get started free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ====== Footer ====== */}
      <footer className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[hsl(var(--grad-from))] to-[hsl(var(--grad-to))] text-background">
              <BookOpenText className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-semibold">Levia</span>
          </div>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
            <Link href="/signin" className="hover:text-foreground">
              Sign in
            </Link>
          </nav>
          <p className="font-mono text-[11px] text-muted-foreground">
            Answers you can trace back to the page.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Page;
