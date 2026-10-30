"use client";

import { useEffect, useMemo, useState } from "react";

type Mapping = {
  dataset: string;
  sourceColumn: string;
  targetField: string;
  confidence: number;
  rationale: string;
  status: "suggested" | "accepted" | "rejected";
};

export default function MappingPage() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  async function loadMappings() {
    const response = await fetch("/api/mapping/suggestions");
    const payload = await response.json();
    setMappings(payload.mappings ?? []);
  }

  async function decide(mapping: Mapping, status: "accepted" | "rejected") {
    await fetch("/api/mapping/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset: mapping.dataset,
        sourceColumn: mapping.sourceColumn,
        status,
      }),
    });
    await loadMappings();
  }

  useEffect(() => {
    void fetch("/api/mapping/suggestions")
      .then((response) => response.json())
      .then((payload) => setMappings(payload.mappings ?? []));
  }, []);

  const datasets = useMemo(
    () => ["all", ...Array.from(new Set(mappings.map((entry) => entry.dataset)))],
    [mappings],
  );

  const filtered = useMemo(
    () =>
      mappings.filter((entry) => {
        const datasetOk = selectedDataset === "all" || entry.dataset === selectedDataset;
        const statusOk = selectedStatus === "all" || entry.status === selectedStatus;
        const queryOk =
          query.length === 0 ||
          `${entry.sourceColumn} ${entry.targetField} ${entry.rationale}`
            .toLowerCase()
            .includes(query.toLowerCase());
        return datasetOk && statusOk && queryOk;
      }),
    [mappings, selectedDataset, selectedStatus, query],
  );

  const summary = useMemo(
    () => ({
      suggested: mappings.filter((entry) => entry.status === "suggested").length,
      accepted: mappings.filter((entry) => entry.status === "accepted").length,
      rejected: mappings.filter((entry) => entry.status === "rejected").length,
      avgConfidence:
        mappings.length === 0
          ? 0
          : Math.round((mappings.reduce((sum, entry) => sum + entry.confidence, 0) / mappings.length) * 100),
    }),
    [mappings],
  );

  return (
    <div className="space-y-7">
      <section>
        <h1 className="text-3xl font-semibold">Mapping Studio</h1>
        <p className="mt-2 text-sm text-indigo-100/80">
          Review AI mapping proposals, filter by dataset/status, and approve only what should enter the canonical model.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Pending Review</div>
          <div className="mt-1 text-2xl font-semibold">{summary.suggested}</div>
        </div>
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Accepted</div>
          <div className="mt-1 text-2xl font-semibold">{summary.accepted}</div>
        </div>
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Rejected</div>
          <div className="mt-1 text-2xl font-semibold">{summary.rejected}</div>
        </div>
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Avg Confidence</div>
          <div className="mt-1 text-2xl font-semibold">{summary.avgConfidence}%</div>
        </div>
      </section>

      <section className="surface rounded-2xl p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="text-xs text-indigo-100/80">
            Dataset
            <select
              className="ghost-button mt-1 w-full rounded-lg px-3 py-2 text-sm"
              value={selectedDataset}
              onChange={(event) => setSelectedDataset(event.target.value)}
            >
              {datasets.map((dataset) => (
                <option key={dataset} value={dataset}>
                  {dataset}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-indigo-100/80">
            Status
            <select
              className="ghost-button mt-1 w-full rounded-lg px-3 py-2 text-sm"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
            >
              <option value="all">all</option>
              <option value="suggested">suggested</option>
              <option value="accepted">accepted</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
          <label className="text-xs text-indigo-100/80 md:col-span-2">
            Search column / target / rationale
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. patient_id, case_id, medication"
              className="ghost-button mt-1 w-full rounded-lg px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <div className="surface overflow-hidden rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-indigo-100/85">
            <tr>
              <th className="px-3 py-2">Dataset</th>
              <th className="px-3 py-2">Source Column</th>
              <th className="px-3 py-2">Target Field</th>
              <th className="px-3 py-2">Confidence</th>
              <th className="px-3 py-2">Rationale</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 80).map((mapping) => (
              <tr key={`${mapping.dataset}:${mapping.sourceColumn}`} className="border-t border-white/10">
                <td className="px-3 py-2">{mapping.dataset}</td>
                <td className="px-3 py-2">{mapping.sourceColumn}</td>
                <td className="px-3 py-2">{mapping.targetField}</td>
                <td className="px-3 py-2">{Math.round(mapping.confidence * 100)}%</td>
                <td className="max-w-sm px-3 py-2 text-xs text-indigo-100/80">{mapping.rationale}</td>
                <td className="px-3 py-2 capitalize">{mapping.status}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      className="glow-button rounded-md px-2 py-1 text-xs"
                      onClick={() => decide(mapping, "accepted")}
                    >
                      Accept
                    </button>
                    <button
                      className="ghost-button rounded-md px-2 py-1 text-xs"
                      onClick={() => decide(mapping, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
