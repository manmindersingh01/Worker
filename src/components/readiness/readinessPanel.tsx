"use client";

import React from "react";
import {
  ShieldCheck,
  Play,
  RefreshCw,
  Loader2,
  AlertCircle,
  ListChecks,
  MapPin,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { ReadinessGauge } from "./readinessGauge";
import { CategoryChart } from "./categoryChart";
import { GapList } from "./gapList";
import { scoreTone } from "./statusPill";
import type { ClientReadinessRun } from "~/lib/readiness/serialize";

type Props = { sessionId: string; className?: string };

const RUN_STEPS = [
  "Loading the CDSCO blueprint",
  "Retrieving evidence for each requirement",
  "Judging present / partial / missing",
  "Scoring and explaining the gaps",
];

/* ---------------------------------------------------------------------------
   ReadinessPanel — the auditor surface.
   Fetches the latest run for the session on mount, runs a new check on demand,
   and renders the score gauge, per-category breakdown, and the clickable gap
   list. Gap / citation clicks drive the shared DocumentViewer to the exact page.
   ------------------------------------------------------------------------- */
const ReadinessPanel = ({ sessionId, className }: Props) => {
  const [run, setRun] = React.useState<ClientReadinessRun | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState(0);
  // Once a run has been started/finished in this session, a late-arriving
  // initial GET must not overwrite the fresher result.
  const supersededRef = React.useRef(false);

  // Load the latest run for this session.
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/readiness?sessionId=${sessionId}`);
        const data = (await res.json()) as { run: ClientReadinessRun | null };
        if (!cancelled && !supersededRef.current) setRun(data.run);
      } catch {
        /* first-load failure is non-fatal - user can still run a check */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Cosmetic step ticker while a run is in flight (mirrors the coordinator).
  React.useEffect(() => {
    if (!running) return;
    setStep(0);
    const id = setInterval(
      () => setStep((s) => Math.min(s + 1, RUN_STEPS.length - 1)),
      2600,
    );
    return () => clearInterval(id);
  }, [running]);

  const runCheck = async () => {
    supersededRef.current = true;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json()) as {
        run?: ClientReadinessRun;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.run) {
        setError(
          data.message ?? "The readiness check could not be completed.",
        );
        return;
      }
      setRun(data.run);
    } catch {
      setError("Network error while running the readiness check.");
    } finally {
      setRunning(false);
    }
  };

  const tone = run?.score != null ? scoreTone(run.score) : null;

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-border bg-card/80 backdrop-blur-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-accent-soft text-accent">
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-sm font-semibold leading-none text-foreground">
              Trial readiness
            </h2>
            <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" aria-hidden />
              {run?.jurisdictionLabel ?? "India - CDSCO"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => void runCheck()}
          disabled={running}
          className="gap-1.5"
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : run ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {running ? "Running…" : run ? "Re-run" : "Run check"}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {/* Running state */}
          {running && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden />
                Auditing the package…
              </div>
              <ul className="mt-3 space-y-1.5">
                {RUN_STEPS.map((label, i) => (
                  <li
                    key={label}
                    className={cn(
                      "flex items-center gap-2 text-xs transition-colors",
                      i < step
                        ? "text-muted-foreground line-through"
                        : i === step
                          ? "font-medium text-foreground"
                          : "text-muted-foreground/50",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        i <= step ? "bg-accent" : "bg-muted-foreground/30",
                      )}
                    />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Initial skeleton */}
          {loading && !running && (
            <div className="space-y-3">
              <div className="h-44 animate-pulse rounded-xl border border-border bg-muted/50" />
              <div className="h-40 animate-pulse rounded-xl border border-border bg-muted/50" />
            </div>
          )}

          {/* Empty state */}
          {!loading && !running && !run && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-accent">
                <ListChecks className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="font-display text-base font-semibold text-foreground">
                  Check this package against CDSCO
                </p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  Instead of waiting for a question, the app checks your trial
                  package against India&apos;s New Drugs and Clinical Trials
                  Rules, 2019 - and shows what&apos;s missing, with a citation
                  for every finding.
                </p>
              </div>
              <Button onClick={() => void runCheck()} className="gap-1.5">
                <Play className="h-4 w-4" />
                Run readiness check
              </Button>
            </div>
          )}

          {/* Result */}
          {!running && run?.score != null && tone && (
            <>
              {/* Score + headline */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-4">
                  <ReadinessGauge score={run.score} label={tone.label} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {run.headline}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <CountChip
                        label="present"
                        value={countBy(run, "PRESENT")}
                        className="border-success/40 bg-success/10 text-success"
                      />
                      <CountChip
                        label="partial"
                        value={countBy(run, "PARTIAL")}
                        className="border-warning/40 bg-warning/10 text-warning"
                      />
                      <CountChip
                        label="missing"
                        value={countBy(run, "MISSING")}
                        className="border-destructive/40 bg-destructive/10 text-destructive"
                      />
                      <CountChip
                        label="review"
                        value={countBy(run, "NEEDS_REVIEW")}
                        className="border-muted-foreground/30 bg-muted text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>

                {run.topFixes.length > 0 && (
                  <div className="mt-4 border-t border-border pt-3">
                    <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      Top fixes
                    </p>
                    <ol className="mt-1.5 space-y-1">
                      {run.topFixes.map((fix, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-foreground"
                        >
                          <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                            {i + 1}
                          </span>
                          {fix}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              {/* Category breakdown */}
              {run.categories.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Readiness by category
                  </p>
                  <CategoryChart categories={run.categories} />
                </div>
              )}

              {/* Gaps */}
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  Gaps to close · click to open the source
                </p>
                <GapList items={run.items} />
              </div>

              {run.completedAt && (
                <p className="pt-1 text-center font-mono text-[10px] text-muted-foreground/70">
                  {run.blueprintTitle} · v{run.blueprintVersion} · as of{" "}
                  {new Date(run.completedAt).toLocaleString()}
                </p>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

function countBy(run: ClientReadinessRun, status: string): number {
  return run.items.filter((i) => i.status === status).length;
}

function CountChip({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums",
        className,
      )}
    >
      {value} {label}
    </span>
  );
}

export default ReadinessPanel;
