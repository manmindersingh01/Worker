"use client";

import React from "react";
import {
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

/** hsl token for the score band - matches scoreTone() in statusPill. */
function fillFor(score: number): string {
  if (score >= 80) return "hsl(var(--success))";
  if (score >= 50) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

/**
 * Circular readiness gauge. A single radial bar sweeps proportionally to the
 * score, with the percentage and a short band label in the centre.
 */
export function ReadinessGauge({
  score,
  label,
  size = 168,
}: {
  score: number;
  label: string;
  size?: number;
}) {
  const data = [{ name: "readiness", value: score }];
  const fill = fillFor(score);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="76%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            dataKey="value"
            angleAxisId={0}
            cornerRadius={999}
            fill={fill}
            background={{ fill: "hsl(var(--muted))" }}
            isAnimationActive
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display text-4xl font-bold tabular-nums leading-none"
          style={{ color: fill }}
        >
          {score}
          <span className="text-xl">%</span>
        </span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
