"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function QualityRadar({
  completeness,
  validity,
  consistency,
}: {
  completeness: number;
  validity: number;
  consistency: number;
}) {
  const data = [
    { metric: "Completeness", value: Math.round(completeness * 100) },
    { metric: "Validity", value: Math.round(validity * 100) },
    { metric: "Consistency", value: Math.round(consistency * 100) },
  ];

  return (
    <div className="h-72 w-full rounded-xl border border-black/10 p-3 dark:border-white/10">
      <div className="mb-2 text-sm font-semibold">Data Quality Radar</div>
      <ResponsiveContainer width="100%" height="88%">
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" />
          <Radar dataKey="value" stroke="currentColor" fill="currentColor" fillOpacity={0.3} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MappingConfidenceHeat({ data }: { data: Array<{ source: string; confidence: number }> }) {
  return (
    <div className="h-80 w-full rounded-xl border border-black/10 p-3 dark:border-white/10">
      <div className="mb-2 text-sm font-semibold">Mapping Confidence Heatmap (bar proxy)</div>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data.slice(0, 15)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="source" hide />
          <YAxis domain={[0, 1]} />
          <Tooltip />
          <Bar dataKey="confidence" fill="currentColor" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineageSankey() {
  const data = {
    nodes: [
      { name: "Raw Sources" },
      { name: "Bronze" },
      { name: "Silver" },
      { name: "Gold" },
      { name: "Dashboards" },
    ],
    links: [
      { source: 0, target: 1, value: 100 },
      { source: 1, target: 2, value: 86 },
      { source: 2, target: 3, value: 79 },
      { source: 3, target: 4, value: 79 },
    ],
  };

  return (
    <div className="h-80 w-full rounded-xl border border-black/10 p-3 dark:border-white/10">
      <div className="mb-2 text-sm font-semibold">Data Lineage Sankey</div>
      <ResponsiveContainer width="100%" height="88%">
        <Sankey data={data} nodePadding={25} margin={{ top: 10, right: 20, bottom: 10, left: 20 }} />
      </ResponsiveContainer>
    </div>
  );
}

export function RiskTrend({ data }: { data: Array<{ ts: string; risk: number }> }) {
  return (
    <div className="h-72 w-full rounded-xl border border-black/10 p-3 dark:border-white/10">
      <div className="mb-2 text-sm font-semibold">Risk Trend Sparkline</div>
      <ResponsiveContainer width="100%" height="88%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ts" hide />
          <YAxis domain={[0, 1]} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="risk" stroke="currentColor" fill="currentColor" fillOpacity={0.25} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
