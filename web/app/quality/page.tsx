"use client";

import { useEffect, useState } from "react";
import { QualityRadar } from "@/components/charts";

type QualityIssue = {
  id: string;
  dataset: string;
  issueType: string;
  severity: string;
  caseId?: number | null;
  patientId?: string | null;
  message: string;
  sourceFile: string;
};

export default function QualityPage() {
  const [summary, setSummary] = useState({
    completeness: 0,
    validity: 0,
    consistency: 0,
    issueCount: 0,
    bySeverity: { high: 0, medium: 0, low: 0 },
    ingestion: { totalRows: 0, validRows: 0, droppedRows: 0, datasetCount: 0 },
  });
  const [issues, setIssues] = useState<QualityIssue[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/quality/summary").then((r) => r.json()),
      fetch("/api/quality/issues").then((r) => r.json()),
    ]).then(([summaryPayload, issuesPayload]) => {
      setSummary(summaryPayload);
      setIssues(issuesPayload.issues ?? []);
    });
  }, []);

  const droppedRate =
    summary.ingestion.totalRows === 0
      ? 0
      : Math.round((summary.ingestion.droppedRows / summary.ingestion.totalRows) * 100);

  return (
    <div className="space-y-7">
      <section>
        <h1 className="text-3xl font-semibold">Data Quality & Completeness</h1>
        <p className="mt-2 text-sm text-indigo-100/80">
          Metrics are now computed from actual ingestion outcomes and real detected issues, not static placeholders.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Completeness</div>
          <div className="mt-1 text-2xl font-semibold">{Math.round(summary.completeness * 100)}%</div>
        </div>
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Validity</div>
          <div className="mt-1 text-2xl font-semibold">{Math.round(summary.validity * 100)}%</div>
        </div>
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Mapping Consistency</div>
          <div className="mt-1 text-2xl font-semibold">{Math.round(summary.consistency * 100)}%</div>
        </div>
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Issue Count</div>
          <div className="mt-1 text-2xl font-semibold">{summary.issueCount ?? issues.length}</div>
        </div>
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Dropped Rows</div>
          <div className="mt-1 text-2xl font-semibold">{summary.ingestion.droppedRows.toLocaleString()}</div>
          <div className="text-xs text-rose-200/80">{droppedRate}% of source rows</div>
        </div>
        <div className="surface rounded-2xl p-4">
          <div className="text-sm text-indigo-200/75">Datasets</div>
          <div className="mt-1 text-2xl font-semibold">{summary.ingestion.datasetCount}</div>
          <div className="text-xs text-indigo-100/70">active ingestion sources</div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QualityRadar
          completeness={summary.completeness ?? 0}
          validity={summary.validity ?? 0}
          consistency={summary.consistency ?? 0}
        />
        <div className="surface rounded-2xl p-5">
          <h2 className="text-sm font-semibold">Issue Severity Breakdown</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-rose-200">High severity</span>
              <span className="font-semibold">{summary.bySeverity.high}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-amber-200">Medium severity</span>
              <span className="font-semibold">{summary.bySeverity.medium}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-emerald-200">Low severity</span>
              <span className="font-semibold">{summary.bySeverity.low}</span>
            </div>
          </div>
          <div className="mt-4 text-xs text-indigo-100/70">
            Formula basis: completeness from valid/total rows; validity penalized by severity-weighted issues; consistency from mapping confidence.
          </div>
        </div>
      </section>

      <section className="surface overflow-hidden rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-indigo-100/85">
            <tr>
              <th className="px-3 py-2">Severity</th>
              <th className="px-3 py-2">Dataset</th>
              <th className="px-3 py-2">Issue</th>
              <th className="px-3 py-2">Case</th>
              <th className="px-3 py-2">Patient</th>
              <th className="px-3 py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {issues.slice(0, 60).map((issue) => (
              <tr key={issue.id} className="border-t border-white/10">
                <td className="px-3 py-2">{issue.severity}</td>
                <td className="px-3 py-2">{issue.dataset}</td>
                <td className="px-3 py-2">{issue.message}</td>
                <td className="px-3 py-2">{issue.caseId ?? "-"}</td>
                <td className="px-3 py-2">{issue.patientId ?? "-"}</td>
                <td className="px-3 py-2">{issue.sourceFile}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
