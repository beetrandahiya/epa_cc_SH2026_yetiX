"use client";

import { useMemo, useState } from "react";
import { MappingConfidenceHeat, QualityRadar, RiskTrend } from "@/components/charts";

const DATASETS = [
  "epaAC-Data-1",
  "epaAC-Data-2",
  "epaAC-Data-3",
  "synth_labs_1000_cases",
  "synthetic_nursing_daily_reports_en",
  "synthetic_device_motion_fall_data",
  "synthetic_medication_raw_inpatient",
  "synthetic_cases_icd10_ops",
];

const CONFIDENCE_DATA = [
  0.91, 0.88, 0.84, 0.79, 0.83, 0.77, 0.81, 0.76, 0.9, 0.73, 0.7, 0.69, 0.92, 0.86, 0.75,
  0.82, 0.71, 0.67, 0.8, 0.74,
];

const RISK_DATA = [
  0.31, 0.32, 0.35, 0.39, 0.42, 0.46, 0.5, 0.52, 0.49, 0.45, 0.43, 0.47, 0.55, 0.6, 0.63,
  0.58, 0.53, 0.48, 0.44, 0.4,
];

export default function Home() {
  const [status, setStatus] = useState<string>("Ready");
  const [summary, setSummary] = useState({ completeness: 0.91, validity: 0.88, consistency: 0.85 });

  const confidenceData = useMemo(
    () =>
      CONFIDENCE_DATA.map((confidence, index) => ({
        source: `col_${index + 1}`,
        confidence,
      })),
    [],
  );

  const riskData = useMemo(
    () =>
      RISK_DATA.map((risk, index) => ({
        ts: `${index + 1}`,
        risk,
      })),
    [],
  );

  async function runIngestion() {
    setStatus("Ingesting datasets...");
    for (const dataset of DATASETS) {
      await fetch(`/api/ingest/${dataset}`, { method: "POST" });
    }
    setStatus("Ingestion complete.");
  }

  async function runTransformation() {
    setStatus("Running harmonization + AI transforms...");
    const response = await fetch("/api/transform/run", { method: "POST" });
    const payload = await response.json();
    setStatus(`Transform complete: ${payload.transformedRows ?? 0} rows`);

    const quality = await fetch("/api/quality/summary").then((r) => r.json());
    setSummary({
      completeness: quality.completeness ?? 0.9,
      validity: quality.validity ?? 0.85,
      consistency: quality.consistency ?? 0.82,
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
        <h1 className="text-2xl font-semibold">Smart Health Data Mapping</h1>
        <p className="mt-2 text-sm opacity-80">
          AI-powered data harmonization prototype for START HACK 2026. Run ingestion and transformation to populate all dashboard modules.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={runIngestion}
            className="rounded-full bg-foreground px-4 py-2 text-sm text-background"
          >
            1) Ingest Core Datasets
          </button>
          <button
            onClick={runTransformation}
            className="rounded-full border border-black/15 px-4 py-2 text-sm dark:border-white/15"
          >
            2) Run Harmonization + AI
          </button>
          <a
            href="/api/health"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-black/15 px-4 py-2 text-sm dark:border-white/15"
          >
            Health Check
          </a>
        </div>
        <div className="mt-3 rounded-lg bg-black/5 px-3 py-2 text-sm dark:bg-white/10">{status}</div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="text-sm opacity-70">Completeness</div>
          <div className="mt-2 text-3xl font-semibold">{Math.round(summary.completeness * 100)}%</div>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="text-sm opacity-70">Validity</div>
          <div className="mt-2 text-3xl font-semibold">{Math.round(summary.validity * 100)}%</div>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="text-sm opacity-70">Consistency</div>
          <div className="mt-2 text-3xl font-semibold">{Math.round(summary.consistency * 100)}%</div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QualityRadar {...summary} />
        <MappingConfidenceHeat data={confidenceData} />
      </section>

      <section>
        <RiskTrend data={riskData} />
      </section>
    </div>
  );
}
