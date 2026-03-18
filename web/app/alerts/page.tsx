"use client";

import { useEffect, useState } from "react";

type Alert = {
  id: string;
  alertType: string;
  severity: "low" | "medium" | "high";
  caseId?: number | null;
  patientId?: string | null;
  title: string;
  detail: string;
  score: number;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  async function explain(alertId: string) {
    setExplanations((prev) => ({ ...prev, [alertId]: "Loading AI explanation..." }));
    const response = await fetch(`/api/ai/explain-alert/${alertId}`, { method: "POST" });
    const payload = await response.json();
    setExplanations((prev) => ({ ...prev, [alertId]: payload.explanation ?? "No explanation generated" }));
  }

  useEffect(() => {
    void fetch("/api/alerts")
      .then((response) => response.json())
      .then((payload) =>
        setAlerts((payload.alerts ?? []).sort((a: Alert, b: Alert) => b.score - a.score)),
      );
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Alerts & Explainability</h1>
        <p className="mt-2 text-sm opacity-80">
          Prioritized quality and clinical-risk alerts with AI-driven root-cause explanations.
        </p>
      </section>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <article key={alert.id} className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm opacity-70">{alert.alertType} · {alert.severity}</div>
                <h2 className="text-lg font-semibold">{alert.title}</h2>
              </div>
              <div className="text-sm">Score {Math.round(alert.score * 100)}%</div>
            </div>

            <p className="mt-2 text-sm opacity-85">{alert.detail}</p>
            <div className="mt-2 text-xs opacity-70">
              Case: {alert.caseId ?? "-"} · Patient: {alert.patientId ?? "-"}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => explain(alert.id)}
                className="rounded-full border border-black/20 px-3 py-1.5 text-xs dark:border-white/20"
              >
                Explain this alert
              </button>
              <button
                onClick={() => {
                  const csv = `id,type,severity,score,title\n${alert.id},${alert.alertType},${alert.severity},${alert.score},"${alert.title.replaceAll(
                    '"',
                    '""',
                  )}"`;
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `alert-${alert.id}.csv`;
                  link.click();
                }}
                className="rounded-full border border-black/20 px-3 py-1.5 text-xs dark:border-white/20"
              >
                Export CSV
              </button>
            </div>

            {explanations[alert.id] ? (
              <div className="mt-3 rounded-lg bg-black/5 p-3 text-sm dark:bg-white/10">
                {explanations[alert.id]}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
