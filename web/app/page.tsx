"use client";

import { useEffect, useMemo, useState } from "react";
import { MappingConfidenceHeat, QualityRadar, RiskTrend } from "@/components/charts";
import { Button, Card, CardBody, CardHeader, Chip, Divider } from "@heroui/react";

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
  const [summary, setSummary] = useState({ completeness: 0.91, validity: 0.88, consistency: 0.85, issueCount: 0 });
  const [lineage, setLineage] = useState({
    totalRows: 0,
    validRows: 0,
    transformedRows: 0,
    droppedRows: 0,
    alertCount: 0,
    mappingCount: 0,
  });

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

  async function refreshMetrics() {
    const [quality, lineagePayload] = await Promise.all([
      fetch("/api/quality/summary").then((r) => r.json()),
      fetch("/api/lineage/summary").then((r) => r.json()),
    ]);

    setSummary({
      completeness: quality.completeness ?? 0,
      validity: quality.validity ?? 0,
      consistency: quality.consistency ?? 0,
      issueCount: quality.issueCount ?? 0,
    });

    setLineage({
      totalRows: lineagePayload.totals?.totalRows ?? 0,
      validRows: lineagePayload.totals?.validRows ?? 0,
      transformedRows: lineagePayload.totals?.transformedRows ?? 0,
      droppedRows: lineagePayload.totals?.droppedRows ?? 0,
      alertCount: lineagePayload.totals?.alertCount ?? 0,
      mappingCount: lineagePayload.totals?.mappingCount ?? 0,
    });
  }

  useEffect(() => {
    void Promise.all([
      fetch("/api/quality/summary").then((r) => r.json()),
      fetch("/api/lineage/summary").then((r) => r.json()),
    ]).then(([quality, lineagePayload]) => {
      setSummary({
        completeness: quality.completeness ?? 0,
        validity: quality.validity ?? 0,
        consistency: quality.consistency ?? 0,
        issueCount: quality.issueCount ?? 0,
      });

      setLineage({
        totalRows: lineagePayload.totals?.totalRows ?? 0,
        validRows: lineagePayload.totals?.validRows ?? 0,
        transformedRows: lineagePayload.totals?.transformedRows ?? 0,
        droppedRows: lineagePayload.totals?.droppedRows ?? 0,
        alertCount: lineagePayload.totals?.alertCount ?? 0,
        mappingCount: lineagePayload.totals?.mappingCount ?? 0,
      });
    });
  }, []);

  async function runIngestion() {
    setStatus("Ingesting datasets...");
    for (const dataset of DATASETS) {
      await fetch(`/api/ingest/${dataset}`, { method: "POST" });
    }
    setStatus("Ingestion complete. Refreshing lineage metrics...");
    await refreshMetrics();
  }

  async function runTransformation() {
    setStatus("Running harmonization + AI transforms...");
    const response = await fetch("/api/transform/run", { method: "POST" });
    const payload = await response.json();
    setStatus(`Transform complete: ${payload.transformedRows ?? 0} rows`);
    await refreshMetrics();
  }

  return (
    <div className="space-y-7">
      <Card className="border border-divider bg-content1/90">
        <CardHeader className="flex-col items-start gap-2 px-7 pt-6">
          <Chip variant="flat" color="primary" size="sm" className="uppercase tracking-[0.16em]">EPA START HACK 2026</Chip>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Smart Decisions through
            <span className="bg-gradient-to-r from-indigo-200 via-violet-200 to-cyan-200 bg-clip-text text-transparent"> Harmonized Data</span>
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-indigo-100/85 md:text-base">
            This dashboard turns heterogeneous care data into one trusted analytical layer. Use the controls below to ingest sources,
            run harmonization, and refresh all operational intelligence tabs.
          </p>
        </CardHeader>
        <CardBody className="px-7 pb-6 pt-0">
          <div className="mt-3 flex flex-wrap gap-3">
            <Button
            onClick={runIngestion}
            color="primary"
            radius="full"
            className="font-medium"
          >
            1) Ingest Source Data
            </Button>
            <Button
            onClick={runTransformation}
            color="primary"
            variant="shadow"
            radius="full"
            className="font-medium"
          >
            2) Harmonize + AI Enrich
            </Button>
            <Button
              as="a"
              href="/api/health"
              target="_blank"
              rel="noreferrer"
              variant="bordered"
              radius="full"
            >
              Health Check
            </Button>
          </div>
          <div className="mt-4 rounded-xl border border-divider bg-content2 px-3 py-2 text-sm text-foreground-600">{status}</div>
        </CardBody>
      </Card>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-divider bg-content1">
          <CardBody className="p-4">
            <div className="text-sm text-foreground-500">Completeness</div>
            <div className="mt-2 text-3xl font-semibold">{Math.round(summary.completeness * 100)}%</div>
          </CardBody>
        </Card>
        <Card className="border border-divider bg-content1">
          <CardBody className="p-4">
            <div className="text-sm text-foreground-500">Validity</div>
            <div className="mt-2 text-3xl font-semibold">{Math.round(summary.validity * 100)}%</div>
          </CardBody>
        </Card>
        <Card className="border border-divider bg-content1">
          <CardBody className="p-4">
            <div className="text-sm text-foreground-500">Consistency</div>
            <div className="mt-2 text-3xl font-semibold">{Math.round(summary.consistency * 100)}%</div>
          </CardBody>
        </Card>
        <Card className="border border-divider bg-content1">
          <CardBody className="p-4">
            <div className="text-sm text-foreground-500">Coverage</div>
            <div className="mt-2 text-3xl font-semibold">{lineage.validRows.toLocaleString()}</div>
            <div className="text-xs text-foreground-500">valid rows from {lineage.totalRows.toLocaleString()} total</div>
          </CardBody>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QualityRadar {...summary} />
        <MappingConfidenceHeat data={confidenceData} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RiskTrend data={riskData} />
        <Card className="border border-divider bg-content1 lg:col-span-2">
          <CardBody className="p-5">
          <h2 className="text-lg font-semibold">Dashboard Guide</h2>
          <p className="mt-2 text-sm text-foreground-500">
            Every tab now reflects a specific data-operations function, so the flow from raw ingestion to explainable action is clear.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-divider bg-content2 p-3 text-sm">
              <div className="font-semibold">Data Lineage</div>
              <div className="mt-1 text-foreground-500">Row flow and retention from sources through Bronze/Silver/Gold layers.</div>
            </div>
            <div className="rounded-xl border border-divider bg-content2 p-3 text-sm">
              <div className="font-semibold">Mapping Studio</div>
              <div className="mt-1 text-foreground-500">Human-in-the-loop AI mapping approvals with confidence and rationale.</div>
            </div>
            <div className="rounded-xl border border-divider bg-content2 p-3 text-sm">
              <div className="font-semibold">Data Quality</div>
              <div className="mt-1 text-foreground-500">Grounded quality KPIs derived from valid/dropped rows and concrete issues.</div>
            </div>
            <div className="rounded-xl border border-divider bg-content2 p-3 text-sm">
              <div className="font-semibold">Alerts + Twin</div>
              <div className="mt-1 text-foreground-500">Prioritized alerts and case-level timeline context for decision support.</div>
            </div>
          </div>
          <Divider className="my-4" />
          <div className="text-xs text-foreground-500">
            Quality Issues: {summary.issueCount} · Mappings: {lineage.mappingCount} · Alerts: {lineage.alertCount} · Transformed events: {lineage.transformedRows}
          </div>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
