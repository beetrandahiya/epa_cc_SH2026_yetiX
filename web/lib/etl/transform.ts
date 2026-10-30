import { randomUUID } from "node:crypto";
import { getSqlClient } from "@/lib/db/client";
import { extractNursingSignals, suggestMappings } from "@/lib/ai/anthropic";
import { demoStore } from "@/lib/store";
import type { AlertEvent, DatasetKey, MappingSuggestion, QualityIssue } from "@/lib/types";

const LAB_KEYS = ["CRP", "Leukozyten", "Kreatinin", "Glukose", "Laktat", "INR"];
const MAX_AI_NOTE_CALLS = 20;

function simpleNursingExtract(note: string) {
  const lowered = note.toLowerCase();
  return {
    symptoms: lowered.includes("pain") ? ["pain"] : [],
    interventions: lowered.includes("mobil") ? ["mobilization"] : [],
    outcomes: lowered.includes("stable") ? ["stable condition"] : [],
    riskSignals:
      lowered.includes("fall") || lowered.includes("sturz") ? ["fall-risk"] : [],
  };
}

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
          select dataset, source_file, row_hash, payload, is_valid, invalid_reason
          from bronze.raw_records
          order by id asc
        `) as {
          dataset: string;
          source_file: string;
          row_hash: string;
          payload: Record<string, unknown>;
          is_valid: boolean;
          invalid_reason: string | null;
        }[])
      : demoStore.rawRecords.map((item) => ({
          dataset: item.dataset,
          source_file: item.sourceFile,
          row_hash: item.rowHash,
          payload: item.payload,
          is_valid: item.isValid,
          invalid_reason: item.invalidReason ?? null,
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
  const invalidByDataset = new Map<
    string,
    { count: number; sourceFile: string; rowHash: string; reason: string }
  >();
  let nursingAiCalls = 0;
  const medicationAdminByPatient = new Map<string, { total: number; missed: number }>();

  for (const row of rawRecords) {
    if (!row.is_valid) {
      const existing = invalidByDataset.get(row.dataset);
      if (existing) {
        existing.count += 1;
      } else {
        invalidByDataset.set(row.dataset, {
          count: 1,
          sourceFile: row.source_file,
          rowHash: row.row_hash,
          reason: row.invalid_reason ?? "Missing mandatory identifiers",
        });
      }
      continue;
    }

    const payload = row.payload;
    const caseId = typeof payload.case_id === "number" ? payload.case_id : null;
    const patientId = typeof payload.patient_id === "string" ? payload.patient_id : null;

    const columns = datasetColumns.get(row.dataset) ?? new Set<string>();
    Object.keys(payload).forEach((key) => columns.add(key));
    datasetColumns.set(row.dataset, columns);

    if (row.dataset.includes("nursing")) {
      const note = String(payload.nursing_note_free_text ?? "");
      const extracted =
        nursingAiCalls < MAX_AI_NOTE_CALLS
          ? await extractNursingSignals(note)
          : simpleNursingExtract(note);
      nursingAiCalls += 1;
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
      const movementIndex = Number(payload.movement_index_0_100 ?? 0);
      const bedExitDetected = payload.bed_exit_detected_0_1 === 1 || payload.bed_exit_detected_0_1 === "1";

      if (bedExitDetected && movementIndex <= 5) {
        qualityIssues.push(
          buildQualityIssue({
            dataset: row.dataset,
            issueType: "device-event-inconsistency",
            severity: "low",
            message: "Bed-exit detected with near-zero movement index",
            sourceFile: row.source_file,
            rowHash: row.row_hash,
            caseId,
            patientId,
          }),
        );
      }

      if (payload.fall_event_0_1 === 1 || payload.fall_event_0_1 === "1") {
        const impact = payload.impact_magnitude_g;
        if (impact === null || impact === "" || impact === undefined) {
          qualityIssues.push(
            buildQualityIssue({
              dataset: row.dataset,
              issueType: "missing-fall-impact",
              severity: "medium",
              message: "Fall event present without impact magnitude",
              sourceFile: row.source_file,
              rowHash: row.row_hash,
              caseId,
              patientId,
            }),
          );
        }

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

    if (row.dataset.includes("medication_raw_inpatient")) {
      const administrationStatus = String(payload.administration_status ?? "").toLowerCase();
      if (administrationStatus) {
        const key = String(patientId ?? "unknown");
        const aggregate = medicationAdminByPatient.get(key) ?? { total: 0, missed: 0 };
        aggregate.total += 1;
        if (administrationStatus === "missed" || administrationStatus === "refused") {
          aggregate.missed += 1;
        }
        medicationAdminByPatient.set(key, aggregate);
      }
    }
  }

  for (const [patient, aggregate] of medicationAdminByPatient.entries()) {
    if (aggregate.total < 8) {
      continue;
    }
    const missedRate = aggregate.missed / aggregate.total;
    if (missedRate > 0.2) {
      alerts.push(
        buildAlert({
          alertType: "med-adherence-risk",
          severity: missedRate > 0.35 ? "high" : "medium",
          title: "Medication adherence risk",
          detail: `${Math.round(missedRate * 100)}% missed/refused administrations for patient ${patient}`,
          score: Math.min(0.99, 0.55 + missedRate),
          patientId: patient,
        }),
      );
    }
  }

  for (const [dataset, invalid] of invalidByDataset.entries()) {
    qualityIssues.push(
      buildQualityIssue({
        dataset,
        issueType: "mandatory-ids-missing",
        severity: "high",
        message: `${invalid.count} rows dropped before harmonization: ${invalid.reason}`,
        sourceFile: invalid.sourceFile,
        rowHash: invalid.rowHash,
      }),
    );
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
  const transformedRows = rawRecords.filter((row) => row.is_valid).length;
  return {
    status: "ok",
    transformedRows,
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
