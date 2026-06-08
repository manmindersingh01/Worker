"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { DEMO_EMAIL, DEMO_PASSWORD } from "~/server/auth/demo";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/uploadFile");
    }
  }

  function useDemoCredentials() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card/80 p-6 text-left shadow-paper-lg backdrop-blur-sm">
      <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
        Sign in to your archive
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Use the demo account or your own email.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p
            role="alert"
            className="text-sm font-medium text-destructive"
          >
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-accent/40 bg-accent-soft p-4">
        <div className="flex items-center gap-2 text-accent-foreground">
          <KeyRound className="h-4 w-4 text-accent" aria-hidden />
          <span className="font-display text-sm font-semibold">
            Demo account
          </span>
        </div>
        <dl className="mt-2 space-y-1 font-mono text-xs text-accent-foreground/90">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-accent-foreground/70">email</dt>
            <dd>{DEMO_EMAIL}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-accent-foreground/70">password</dt>
            <dd>{DEMO_PASSWORD}</dd>
          </div>
        </dl>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useDemoCredentials}
          className="mt-3 w-full border-accent/50 bg-card/60 hover:bg-card"
        >
          Use demo credentials
        </Button>
      </div>
    </div>
  );
}
