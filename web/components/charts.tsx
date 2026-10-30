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
    <div className="surface h-72 w-full rounded-2xl p-4">
      <div className="mb-3 text-sm font-semibold text-indigo-100">Quality Shape</div>
      <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(159,170,255,0.34)" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: "#cdd4ff", fontSize: 12 }} />
          <Radar dataKey="value" stroke="#7a74ff" fill="#7a74ff" fillOpacity={0.35} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MappingConfidenceHeat({ data }: { data: Array<{ source: string; confidence: number }> }) {
  return (
    <div className="surface h-80 w-full rounded-2xl p-4">
      <div className="mb-3 text-sm font-semibold text-indigo-100">Mapping Confidence</div>
      <div className="h-[290px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 15)}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 167, 255, 0.2)" />
          <XAxis dataKey="source" hide />
          <YAxis domain={[0, 1]} tick={{ fill: "#bcc6ff", fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="confidence" fill="#40d9ff" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

export function LineageSankey({
  totalRows,
  validRows,
  transformedRows,
}: {
  totalRows: number;
  validRows: number;
  transformedRows: number;
}) {
  const data = {
    nodes: [
      { name: "Raw Sources" },
      { name: "Bronze" },
      { name: "Silver" },
      { name: "Gold" },
      { name: "Dashboards" },
    ],
    links: [
      { source: 0, target: 1, value: Math.max(totalRows, 1) },
      { source: 1, target: 2, value: Math.max(validRows, 1) },
      { source: 2, target: 3, value: Math.max(transformedRows, 1) },
      { source: 3, target: 4, value: Math.max(transformedRows, 1) },
    ],
  };

  return (
    <div className="surface h-80 w-full rounded-2xl p-4">
      <div className="mb-3 text-sm font-semibold text-indigo-100">Source → Bronze → Silver → Gold</div>
      <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={data}
          nodePadding={24}
          margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
          node={{ fill: "#7a74ff", stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 }}
          link={{ stroke: "rgba(64,217,255,0.65)" }}
        />
      </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RiskTrend({ data }: { data: Array<{ ts: string; risk: number }> }) {
  return (
    <div className="surface h-72 w-full rounded-2xl p-4">
      <div className="mb-3 text-sm font-semibold text-indigo-100">Risk Trend Sparkline</div>
      <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 167, 255, 0.2)" />
          <XAxis dataKey="ts" hide />
          <YAxis domain={[0, 1]} tick={{ fill: "#bcc6ff", fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="risk" stroke="#b15bff" fill="#b15bff" fillOpacity={0.35} />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
