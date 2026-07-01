"use client";

import React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { CategoryScore } from "~/lib/readiness/types";

function fillFor(score: number): string {
  if (score >= 80) return "hsl(var(--success))";
  if (score >= 50) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

interface Row {
  title: string;
  score: number;
  present: number;
  partial: number;
  missing: number;
  needsReview: number;
  total: number;
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
}) {
  if (!active || !payload?.length) return null;
  const r = payload[0]!.payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-paper">
      <p className="font-medium text-foreground">{r.title}</p>
      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
        {r.score}% · {r.present}/{r.total} present
      </p>
      <p className="font-mono text-[11px] text-muted-foreground">
        {r.partial} partial · {r.missing} missing · {r.needsReview} review
      </p>
    </div>
  );
}

/** Horizontal bar per category, coloured by readiness band. */
export function CategoryChart({ categories }: { categories: CategoryScore[] }) {
  const data: Row[] = categories.map((c) => ({
    title: c.title,
    score: c.score,
    present: c.counts.present,
    partial: c.counts.partial,
    missing: c.counts.missing,
    needsReview: c.counts.needsReview,
    total: c.counts.total,
  }));

  const height = Math.max(140, data.length * 34 + 16);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 34, bottom: 4, left: 4 }}
          barCategoryGap={8}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="title"
            width={116}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
            content={<CategoryTooltip />}
          />
          <Bar dataKey="score" radius={[0, 5, 5, 0]} label={renderScoreLabel}>
            {data.map((r, i) => (
              <Cell key={i} fill={fillFor(r.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Draw the "NN%" just past the end of each bar. */
function renderScoreLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props;
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      dominantBaseline="central"
      className="fill-muted-foreground font-mono"
      style={{ fontSize: 11 }}
    >
      {value}%
    </text>
  );
}
