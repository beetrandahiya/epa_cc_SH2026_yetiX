"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RawSummary = {
  dataset: string;
  sourceFile: string;
  totalRows: number;
  validRows: number;
  droppedRows: number;
  retention: number;
};

type RawDetail = {
  dataset: string;
  columns: string[];
  sampleRows: Array<Record<string, unknown>>;
  numericProfiles: Array<{ column: string; avg: number; min: number; max: number; count: number }>;
  timelineDensity: Array<{ bucket: string; count: number }>;
  validity: { valid: number; invalid: number };
};

function encodeDataset(dataset: string) {
  return encodeURIComponent(dataset);
}

export default function RawFilesPage() {
  const [summaries, setSummaries] = useState<RawSummary[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [detail, setDetail] = useState<RawDetail | null>(null);

  useEffect(() => {
    void fetch("/api/raw-files/summary")
      .then((response) => response.json())
      .then((payload) => {
        const datasets = (payload.datasets ?? []) as RawSummary[];
        setSummaries(datasets);
        if (datasets.length > 0) {
          setSelectedDataset(datasets[0].dataset);
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedDataset) {
      return;
    }
    void fetch(`/api/raw-files/${encodeDataset(selectedDataset)}`)
      .then((response) => response.json())
      .then((payload) => setDetail(payload as RawDetail));
  }, [selectedDataset]);

  const stackedData = useMemo(
    () =>
      summaries.map((row) => ({
        dataset: row.dataset,
        valid: row.validRows,
        dropped: row.droppedRows,
      })),
    [summaries],
  );

  const selectedSummary = summaries.find((item) => item.dataset === selectedDataset);

  return (
    <div className="space-y-7">
      <section>
        <h1 className="text-3xl font-semibold">Raw Files Explorer</h1>
        <p className="mt-2 text-sm text-indigo-100/80">
          Drill into each original dataset with row-level samples, column structure, validity outcomes, and chart-based profiling.
        </p>
      </section>

      <section className="surface rounded-2xl p-4">
        <div className="mb-3 text-sm font-semibold text-indigo-100">Dataset Retention Overview</div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 167, 255, 0.2)" />
              <XAxis dataKey="dataset" tick={{ fill: "#bcc6ff", fontSize: 10 }} interval={0} angle={-15} height={80} />
              <YAxis tick={{ fill: "#bcc6ff", fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="valid" stackId="a" fill="#3dd68c" />
              <Bar dataKey="dropped" stackId="a" fill="#ff6b81" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="surface rounded-2xl p-4">
        <label className="text-xs text-indigo-100/80">
          Select dataset
          <select
            className="ghost-button mt-1 w-full rounded-lg px-3 py-2 text-sm md:w-[420px]"
            value={selectedDataset}
            onChange={(event) => setSelectedDataset(event.target.value)}
          >
            {summaries.map((row) => (
              <option key={row.dataset} value={row.dataset}>
                {row.dataset}
              </option>
            ))}
          </select>
        </label>
      </section>

      {selectedSummary ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="surface rounded-2xl p-4">
            <div className="text-sm text-indigo-200/75">Raw Rows</div>
            <div className="mt-2 text-3xl font-semibold">{selectedSummary.totalRows.toLocaleString()}</div>
          </div>
          <div className="surface rounded-2xl p-4">
            <div className="text-sm text-indigo-200/75">Valid Rows</div>
            <div className="mt-2 text-3xl font-semibold">{selectedSummary.validRows.toLocaleString()}</div>
          </div>
          <div className="surface rounded-2xl p-4">
            <div className="text-sm text-indigo-200/75">Dropped Rows</div>
            <div className="mt-2 text-3xl font-semibold">{selectedSummary.droppedRows.toLocaleString()}</div>
          </div>
          <div className="surface rounded-2xl p-4">
            <div className="text-sm text-indigo-200/75">Retention</div>
            <div className="mt-2 text-3xl font-semibold">{Math.round(selectedSummary.retention * 100)}%</div>
          </div>
        </section>
      ) : null}

      {detail ? (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="surface rounded-2xl p-4">
            <div className="mb-2 text-sm font-semibold text-indigo-100">Numeric Column Profile (avg)</div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={detail.numericProfiles.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 167, 255, 0.2)" />
                  <XAxis dataKey="column" tick={{ fill: "#bcc6ff", fontSize: 10 }} interval={0} angle={-15} height={90} />
                  <YAxis tick={{ fill: "#bcc6ff", fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#40d9ff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="surface rounded-2xl p-4">
            <div className="mb-2 text-sm font-semibold text-indigo-100">Timestamp Density</div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={detail.timelineDensity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 167, 255, 0.2)" />
                  <XAxis dataKey="bucket" tick={{ fill: "#bcc6ff", fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#bcc6ff", fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#b15bff" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      ) : null}

      {detail ? (
        <section className="surface overflow-hidden rounded-2xl">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold">Sample Rows ({detail.sampleRows.length})</h2>
            <p className="mt-1 text-xs text-indigo-100/70">Includes validity flags and representative payload values from the selected source.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-indigo-100/85">
                <tr>
                  {(detail.columns.slice(0, 14)).map((column) => (
                    <th key={column} className="px-3 py-2">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.sampleRows.slice(0, 40).map((row, index) => (
                  <tr key={index} className="border-t border-white/10">
                    {detail.columns.slice(0, 14).map((column) => (
                      <td key={`${index}:${column}`} className="px-3 py-2">
                        {String(row[column] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
