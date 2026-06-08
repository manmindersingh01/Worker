import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpenText, Quote, ShieldCheck } from "lucide-react";

import LoginForm from "~/components/loginForm";
import PlasmaOrb from "~/components/plasmaOrb";
import { getUserSession } from "~/hooks/getUser";

const HIGHLIGHTS = [
  { icon: Quote, text: "Every answer cited to the exact page" },
  { icon: BookOpenText, text: "Chat across many PDFs at once" },
  { icon: ShieldCheck, text: "Your library stays private to you" },
];

export default async function SignInPage() {
  const session = await getUserSession();

  if (session?.user) {
    redirect("/chatroom");
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent)]" />
      <div className="aurora pointer-events-none absolute inset-0" />

      <header className="relative z-10 mx-auto max-w-6xl px-5 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100dvh-72px)] max-w-6xl items-center gap-12 px-5 pb-12 lg:grid-cols-2">
        {/* Brand panel */}
        <div className="hidden flex-col lg:flex">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] text-background shadow-[0_0_24px_-4px_hsl(var(--grad-from)/0.7)]">
              <BookOpenText className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight">Levia</span>
          </div>

          <div className="relative mt-8">
            <PlasmaOrb className="w-64" />
          </div>

          <h1 className="mt-8 max-w-md text-4xl font-extrabold leading-[1] tracking-tight">
            Ask your documents,{" "}
            <span className="text-gradient">get answers with receipts.</span>
          </h1>

          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li
                key={h.text}
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-[hsl(var(--accent)/0.4)] bg-card/60 text-[hsl(var(--accent))]">
                  <h.icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Form */}
        <div className="flex w-full flex-col items-center lg:items-start">
          {/* compact brand for mobile */}
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] text-background">
              <BookOpenText className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight">Levia</span>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
