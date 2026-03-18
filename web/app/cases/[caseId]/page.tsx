"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TimelineEvent = {
  ts: string;
  type: string;
  value: string;
  detail?: string;
};

export default function CaseDigitalTwinPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId ?? "135";
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    void fetch(`/api/cases/${caseId}/timeline`)
      .then((response) => response.json())
      .then((payload) => setTimeline(payload.timeline ?? []));
  }, [caseId]);

  const chartData = useMemo(
    () =>
      timeline.slice(0, 100).map((event, index) => ({
        index,
        value: Number(event.value) || 0,
        type: event.type,
      })),
    [timeline],
  );

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Case Digital Twin — Case {caseId}</h1>
        <p className="mt-2 text-sm opacity-80">
          Unified timeline combining labs, nursing signals, medication context, and fall-related device events.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Timeline Trend</div>
          <button
            onClick={() => window.print()}
            className="rounded-full border border-black/20 px-3 py-1 text-xs dark:border-white/20"
          >
            Export PNG Snapshot (use browser print/save)
          </button>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="currentColor" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 dark:bg-white/10">
            <tr>
              <th className="px-3 py-2">Timestamp</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {timeline.slice(0, 120).map((event, index) => (
              <tr key={`${event.ts}-${event.type}-${index}`} className="border-t border-black/10 dark:border-white/10">
                <td className="px-3 py-2">{event.ts}</td>
                <td className="px-3 py-2">{event.type}</td>
                <td className="px-3 py-2">{event.value}</td>
                <td className="px-3 py-2">{event.detail ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
