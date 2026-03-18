import { randomUUID } from "node:crypto";
import { getSqlClient } from "@/lib/db/client";
import { extractNursingSignals, suggestMappings } from "@/lib/ai/anthropic";
import { demoStore } from "@/lib/store";
import type { AlertEvent, DatasetKey, MappingSuggestion, QualityIssue } from "@/lib/types";

const LAB_KEYS = ["CRP", "Leukozyten", "Kreatinin", "Glukose", "Laktat", "INR"];

function buildQualityIssue(params: {
  dataset: string;
  issueType: string;
  severity: "low" | "medium" | "high";
  message: string;
  sourceFile: string;
  rowHash: string;
  caseId?: number | null;
  patientId?: string | null;
}): QualityIssue {
  return {
    id: randomUUID(),
    dataset: params.dataset,
    issueType: params.issueType,
    severity: params.severity,
    message: params.message,
    sourceFile: params.sourceFile,
    rowHash: params.rowHash,
    caseId: params.caseId,
    patientId: params.patientId,
  };
}

function buildAlert(params: {
  alertType: string;
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  score: number;
  caseId?: number | null;
  patientId?: string | null;
}): AlertEvent {
  return {
    id: randomUUID(),
    alertType: params.alertType,
    severity: params.severity,
    title: params.title,
    detail: params.detail,
    score: params.score,
    caseId: params.caseId,
    patientId: params.patientId,
    createdAt: new Date().toISOString(),
  };
}

export async function runTransform() {
  const sql = getSqlClient();
  const rawRecords =
    sql !== null
      ? ((await sql`
          select dataset, source_file, row_hash, payload
          from bronze.raw_records
          order by id asc
        `) as {
          dataset: string;
          source_file: string;
          row_hash: string;
          payload: Record<string, unknown>;
        }[])
      : demoStore.rawRecords.map((item) => ({
          dataset: item.dataset,
          source_file: item.sourceFile,
          row_hash: item.rowHash,
          payload: item.payload,
        }));

  const qualityIssues: QualityIssue[] = [];
  const alerts: AlertEvent[] = [];
  const mappingSuggestions: MappingSuggestion[] = [];
  const timelineRows: Array<{
    caseId: number | null;
    patientId: string | null;
    ts: string;
    type: string;
    value: string;
    unit?: string;
    detail?: string;
  }> = [];

  const datasetColumns = new Map<string, Set<string>>();

  for (const row of rawRecords) {
    const payload = row.payload;
    const caseId = typeof payload.case_id === "number" ? payload.case_id : null;
    const patientId = typeof payload.patient_id === "string" ? payload.patient_id : null;

    const columns = datasetColumns.get(row.dataset) ?? new Set<string>();
    Object.keys(payload).forEach((key) => columns.add(key));
    datasetColumns.set(row.dataset, columns);

    if (row.dataset.includes("nursing")) {
      const note = String(payload.nursing_note_free_text ?? "");
      const extracted = await extractNursingSignals(note);
      const ts = String(payload.report_date ?? new Date().toISOString());

      timelineRows.push({
        caseId,
        patientId,
        ts,
        type: "nursing_note",
        value: extracted.riskSignals.join(", ") || "daily note",
        detail: note.slice(0, 200),
      });

      if (extracted.riskSignals.length > 0) {
        alerts.push(
          buildAlert({
            alertType: "nursing-risk",
            severity: "medium",
            title: "Nursing note indicates elevated risk",
            detail: extracted.riskSignals.join(", "),
            score: 0.72,
            caseId,
            patientId,
          }),
        );
      }
    }

    if (row.dataset.includes("labs")) {
      for (const labKey of LAB_KEYS) {
        const value = payload[labKey];
        if (typeof value === "number") {
          const specimenTs = String(payload.specimen_datetime ?? new Date().toISOString());
          timelineRows.push({
            caseId,
            patientId,
            ts: specimenTs,
            type: `lab_${labKey.toLowerCase()}`,
            value: String(value),
          });

          const flag = payload[`${labKey}_flag`];
          if (typeof flag === "string" && flag.toLowerCase() !== "normal") {
            qualityIssues.push(
              buildQualityIssue({
                dataset: row.dataset,
                issueType: "lab-out-of-range",
                severity: labKey === "CRP" ? "high" : "medium",
                message: `${labKey} flagged as ${flag}`,
                sourceFile: row.source_file,
                rowHash: row.row_hash,
                caseId,
                patientId,
              }),
            );
          }
        }
      }
    }

    if (row.dataset.includes("device_motion_fall_data")) {
      if (payload.fall_event_0_1 === 1 || payload.fall_event_0_1 === "1") {
        alerts.push(
          buildAlert({
            alertType: "fall-event",
            severity: "high",
            title: "Fall event detected",
            detail: `Impact ${String(payload.impact_magnitude_g ?? "n/a")}g`,
            score: 0.95,
            caseId,
            patientId,
          }),
        );
      }
    }
  }

  for (const [dataset, setOfColumns] of datasetColumns.entries()) {
    const suggestions = await suggestMappings(dataset, [...setOfColumns].slice(0, 30));
    mappingSuggestions.push(...suggestions);
  }

  const severeIssues = qualityIssues.filter((issue) => issue.severity === "high").length;
  if (severeIssues > 0) {
    alerts.push(
      buildAlert({
        alertType: "quality",
        severity: "high",
        title: "Critical data quality issues detected",
        detail: `${severeIssues} high-severity quality findings detected in transformed data.`,
        score: 0.88,
      }),
    );
  }

  if (sql) {
    await sql`truncate table silver.mapping_decision`;
    await sql`truncate table silver.data_quality_issue`;
    await sql`truncate table gold.alert_event`;
    await sql`truncate table gold.case_timeline`;

    for (const mapping of mappingSuggestions) {
      await sql`
        insert into silver.mapping_decision
          (dataset, source_column, target_field, confidence, rationale, status)
        values
          (${mapping.dataset}, ${mapping.sourceColumn}, ${mapping.targetField}, ${mapping.confidence}, ${mapping.rationale}, ${mapping.status})
      `;
    }

    for (const issue of qualityIssues) {
      await sql`
        insert into silver.data_quality_issue
          (dataset, issue_type, severity, case_id, patient_id, message, source_file, row_hash)
        values
          (${issue.dataset}, ${issue.issueType}, ${issue.severity}, ${issue.caseId ?? null}, ${
            issue.patientId ?? null
          }, ${issue.message}, ${issue.sourceFile}, ${issue.rowHash ?? null})
      `;
    }

    for (const alert of alerts) {
      await sql`
        insert into gold.alert_event
          (alert_type, severity, case_id, patient_id, title, detail, score, created_at)
        values
          (${alert.alertType}, ${alert.severity}, ${alert.caseId ?? null}, ${
            alert.patientId ?? null
          }, ${alert.title}, ${alert.detail}, ${alert.score}, ${alert.createdAt})
      `;
    }

    for (const event of timelineRows) {
      await sql`
        insert into gold.case_timeline
          (case_id, patient_id, event_ts, event_type, event_value, unit, detail)
        values
          (${event.caseId}, ${event.patientId}, ${event.ts}, ${event.type}, ${event.value}, ${
            event.unit ?? null
          }, ${event.detail ?? null})
      `;
    }
  } else {
    demoStore.mappingSuggestions = mappingSuggestions;
    demoStore.qualityIssues = qualityIssues;
    demoStore.alerts = alerts;

    for (const event of timelineRows) {
      const key = String(event.caseId ?? "unknown");
      const timeline = demoStore.caseTimeline[key] ?? [];
      timeline.push({
        ts: event.ts,
        type: event.type,
        value: event.value,
        unit: event.unit,
        detail: event.detail,
      });
      demoStore.caseTimeline[key] = timeline;
    }
  }

  const sourceCount = datasetColumns.size;
  return {
    status: "ok",
    transformedRows: rawRecords.length,
    mappings: mappingSuggestions.length,
    qualityIssues: qualityIssues.length,
    alerts: alerts.length,
    sourceCount,
  };
}

export async function ingestCoreDatasets() {
  const core: DatasetKey[] = [
    "epaAC-Data-1",
    "epaAC-Data-2",
    "epaAC-Data-3",
    "synth_labs_1000_cases",
    "synthetic_nursing_daily_reports_en",
    "synthetic_device_motion_fall_data",
    "synthetic_medication_raw_inpatient",
    "synthetic_cases_icd10_ops",
  ];

  return core;
}
