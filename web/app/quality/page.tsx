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
  const [summary, setSummary] = useState({ completeness: 0.9, validity: 0.9, consistency: 0.9, issueCount: 0 });
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

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Data Quality & Completeness</h1>
        <p className="mt-2 text-sm opacity-80">
          Validity, completeness, and consistency checks with issue-level traceability.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="text-sm opacity-70">Completeness</div>
          <div className="mt-1 text-2xl font-semibold">{Math.round(summary.completeness * 100)}%</div>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="text-sm opacity-70">Validity</div>
          <div className="mt-1 text-2xl font-semibold">{Math.round(summary.validity * 100)}%</div>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="text-sm opacity-70">Consistency</div>
          <div className="mt-1 text-2xl font-semibold">{Math.round(summary.consistency * 100)}%</div>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="text-sm opacity-70">Issue Count</div>
          <div className="mt-1 text-2xl font-semibold">{summary.issueCount ?? issues.length}</div>
        </div>
      </section>

      <QualityRadar
        completeness={summary.completeness ?? 0.9}
        validity={summary.validity ?? 0.9}
        consistency={summary.consistency ?? 0.9}
      />

      <section className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 dark:bg-white/10">
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
              <tr key={issue.id} className="border-t border-black/10 dark:border-white/10">
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
