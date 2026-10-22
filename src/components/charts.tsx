"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PLATFORM_COLORS, PLATFORM_LABELS, type Platform } from "@/lib/constants";

export type RatingPointData = {
  date: string;
  [key: string]: string | number | null;
};

function tooltipStyle() {
  return {
    contentStyle: {
      background: "#0d1220",
      border: "1px solid #212a42",
      borderRadius: "0.6rem",
      color: "#e8edf9",
      fontSize: "0.78rem",
    },
    labelStyle: { color: "#93a0bd" },
    itemStyle: { color: "#e8edf9" },
  };
}

export function RatingTrendChart({
  data,
  platforms,
}: {
  data: RatingPointData[];
  platforms: Platform[];
}) {
  if (!data.length) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-line text-sm text-ink-faint">
        No rating history yet — link a platform and sync to start tracking.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            {platforms.map((platform) => (
              <linearGradient
                key={platform}
                id={`grad-${platform}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={PLATFORM_COLORS[platform]}
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor={PLATFORM_COLORS[platform]}
                  stopOpacity={0.02}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="#182034" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#64708c", fontSize: 11 }}
            axisLine={{ stroke: "#212a42" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#64708c", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={["auto", "auto"]}
          />
          <Tooltip {...tooltipStyle()} />
          <Legend
            wrapperStyle={{ fontSize: "0.72rem", color: "#93a0bd" }}
            formatter={(value, entry) => {
              const name = typeof entry === "string" ? entry : (entry?.value ?? String(value));
              return [String(value), PLATFORM_LABELS[name as Platform] ?? name];
            }}
          />
          {platforms.map((platform) => (
            <Area
              key={platform}
              type="monotone"
              dataKey={platform}
              stroke={PLATFORM_COLORS[platform]}
              strokeWidth={2}
              fill={`url(#grad-${platform})`}
              connectNulls
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreBreakdownChart({
  skill,
  consistency,
  improvement,
}: {
  skill: number;
  consistency: number;
  improvement: number;
}) {
  const data = [
    { name: "Skill", value: Math.round(skill), color: "#6366f1" },
    { name: "Consistency", value: Math.round(consistency), color: "#22d3ee" },
    { name: "Improvement", value: Math.round(improvement), color: "#fbbf24" },
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-3">
        {data.map((slice) => (
          <div
            key={slice.name}
            style={{
              width: `${(slice.value / total) * 100}%`,
              backgroundColor: slice.color,
            }}
            title={`${slice.name}: ${slice.value}`}
          />
        ))}
      </div>
      <dl className="space-y-1.5 text-sm">
        {data.map((slice) => (
          <div key={slice.name} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: slice.color }}
              aria-hidden
            />
            <dt className="text-ink-muted">{slice.name}</dt>
            <dd className="ml-auto font-mono text-ink">{slice.value}</dd>
            <dd className="w-12 text-right font-mono text-xs text-ink-faint">
              {Math.round((slice.value / total) * 100)}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ParticipationBars({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-ink-faint">{row.label}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
            <span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </span>
          <span className="w-8 text-right font-mono text-xs text-ink-muted">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export function MiniSparkline({
  values,
  color = "#6366f1",
}: {
  values: number[];
  color?: string;
}) {
  if (values.length < 2) {
    return <span className="text-xs text-ink-faint">Not enough data</span>;
  }
  const data = values.map((value, index) => ({ index, value }));
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
