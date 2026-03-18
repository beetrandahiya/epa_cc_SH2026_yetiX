"use client";

import { useEffect, useState } from "react";

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

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Mapping Studio</h1>
        <p className="mt-2 text-sm opacity-80">
          AI-suggested source-to-canonical mapping with confidence scoring and manual corrections.
        </p>
      </section>

      <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 dark:bg-white/10">
            <tr>
              <th className="px-3 py-2">Dataset</th>
              <th className="px-3 py-2">Source Column</th>
              <th className="px-3 py-2">Target Field</th>
              <th className="px-3 py-2">Confidence</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mappings.slice(0, 40).map((mapping) => (
              <tr key={`${mapping.dataset}:${mapping.sourceColumn}`} className="border-t border-black/10 dark:border-white/10">
                <td className="px-3 py-2">{mapping.dataset}</td>
                <td className="px-3 py-2">{mapping.sourceColumn}</td>
                <td className="px-3 py-2">{mapping.targetField}</td>
                <td className="px-3 py-2">{Math.round(mapping.confidence * 100)}%</td>
                <td className="px-3 py-2">{mapping.status}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      className="rounded-md border border-black/20 px-2 py-1 text-xs dark:border-white/20"
                      onClick={() => decide(mapping, "accepted")}
                    >
                      Accept
                    </button>
                    <button
                      className="rounded-md border border-black/20 px-2 py-1 text-xs dark:border-white/20"
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
