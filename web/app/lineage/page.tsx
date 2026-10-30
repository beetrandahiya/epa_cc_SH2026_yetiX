"use client";

import { useEffect, useMemo, useState } from "react";
import { LineageSankey } from "@/components/charts";

type DatasetLineage = {
  dataset: string;
  totalRows: number;
  validRows: number;
  droppedRows: number;
};

export default function LineagePage() {
  const [datasets, setDatasets] = useState<DatasetLineage[]>([]);
  const [totals, setTotals] = useState({
    totalRows: 0,
    validRows: 0,
    droppedRows: 0,
    transformedRows: 0,
    mappingCount: 0,
    qualityIssueCount: 0,
    alertCount: 0,
  });

  useEffect(() => {
    void fetch("/api/lineage/summary")
      .then((response) => response.json())
      .then((payload) => {
        setDatasets(payload.datasets ?? []);
        setTotals(
          payload.totals ?? {
            totalRows: 0,
            validRows: 0,
            droppedRows: 0,
            transformedRows: 0,
            mappingCount: 0,
            qualityIssueCount: 0,
            alertCount: 0,
          },
        );
      });
  }, []);

  const retentionRate = useMemo(
    () => (totals.totalRows === 0 ? 0 : Math.round((totals.validRows / totals.totalRows) * 100)),
    [totals.totalRows, totals.validRows],
  );

  return (
    <div className="space-y-7">
      <section>
        <h1 className="text-3xl font-semibold">Data Lineage & Structure</h1>
        <p className="mt-2 text-sm text-indigo-100/80">
          This view explains exactly how many rows survive harmonization and where data loss happens.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Raw Rows</div>
          <div className="mt-2 text-3xl font-semibold">{totals.totalRows.toLocaleString()}</div>
        </div>
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Valid Rows</div>
          <div className="mt-2 text-3xl font-semibold">{totals.validRows.toLocaleString()}</div>
        </div>
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Dropped Rows</div>
          <div className="mt-2 text-3xl font-semibold">{totals.droppedRows.toLocaleString()}</div>
        </div>
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Retention</div>
          <div className="mt-2 text-3xl font-semibold">{retentionRate}%</div>
        </div>
      </section>

      <LineageSankey
        totalRows={totals.totalRows}
        validRows={totals.validRows}
        transformedRows={totals.transformedRows}
      />

      <section className="surface rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold">Dataset-level row retention</h2>
          <div className="text-xs text-indigo-100/70">shows source quality and harmonization eligibility</div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-indigo-100/85">
            <tr>
              <th className="px-4 py-2">Dataset</th>
              <th className="px-4 py-2">Total Rows</th>
              <th className="px-4 py-2">Valid</th>
              <th className="px-4 py-2">Dropped</th>
              <th className="px-4 py-2">Retention</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((row) => {
              const rowRetention = row.totalRows === 0 ? 0 : Math.round((row.validRows / row.totalRows) * 100);
              return (
                <tr key={row.dataset} className="border-t border-white/10">
                  <td className="px-4 py-2">{row.dataset}</td>
                  <td className="px-4 py-2">{row.totalRows.toLocaleString()}</td>
                  <td className="px-4 py-2 text-emerald-200">{row.validRows.toLocaleString()}</td>
                  <td className="px-4 py-2 text-rose-200">{row.droppedRows.toLocaleString()}</td>
                  <td className="px-4 py-2">{rowRetention}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Transformed Timeline Events</div>
          <div className="mt-1 text-2xl font-semibold">{totals.transformedRows.toLocaleString()}</div>
        </div>
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Mapping Entries</div>
          <div className="mt-1 text-2xl font-semibold">{totals.mappingCount.toLocaleString()}</div>
        </div>
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Quality / Alerts</div>
          <div className="mt-1 text-2xl font-semibold">{totals.qualityIssueCount} / {totals.alertCount}</div>
        </div>
      </section>
    </div>
  );
}
