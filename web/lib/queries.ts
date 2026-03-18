import { getSqlClient } from "@/lib/db/client";
import { demoStore } from "@/lib/store";
import type { AlertEvent, MappingSuggestion, QualityIssue } from "@/lib/types";

export async function getMappingSuggestions(): Promise<MappingSuggestion[]> {
  const sql = getSqlClient();
  if (!sql) {
    return demoStore.mappingSuggestions;
  }

  const rows = (await sql`
    select dataset, source_column, target_field, confidence, rationale, status
    from silver.mapping_decision
    order by dataset, source_column
  `) as Array<{
      dataset: string;
      source_column: string;
      target_field: string;
      confidence: number;
      rationale: string;
      status: "suggested" | "accepted" | "rejected";
    }>;

  return rows.map((row) => ({
    dataset: row.dataset,
    sourceColumn: row.source_column,
    targetField: row.target_field,
    confidence: Number(row.confidence),
    rationale: row.rationale,
    status: row.status,
  }));
}

export async function getQualityIssues(): Promise<QualityIssue[]> {
  const sql = getSqlClient();
  if (!sql) {
    return demoStore.qualityIssues;
  }

  const rows = (await sql`
    select id, dataset, issue_type, severity, case_id, patient_id, message, source_file, row_hash
    from silver.data_quality_issue
    order by id desc
  `) as Array<{
      id: number;
      dataset: string;
      issue_type: string;
      severity: "low" | "medium" | "high";
      case_id: number | null;
      patient_id: string | null;
      message: string;
      source_file: string;
      row_hash: string | null;
    }>;

  return rows.map((row) => ({
    id: String(row.id),
    dataset: row.dataset,
    issueType: row.issue_type,
    severity: row.severity,
    caseId: row.case_id,
    patientId: row.patient_id,
    message: row.message,
    sourceFile: row.source_file,
    rowHash: row.row_hash,
  }));
}

export async function getAlerts(): Promise<AlertEvent[]> {
  const sql = getSqlClient();
  if (!sql) {
    return demoStore.alerts;
  }

  const rows = (await sql`
    select id, alert_type, severity, case_id, patient_id, title, detail, score, created_at
    from gold.alert_event
    order by created_at desc
  `) as Array<{
      id: number;
      alert_type: string;
      severity: "low" | "medium" | "high";
      case_id: number | null;
      patient_id: string | null;
      title: string;
      detail: string;
      score: number;
      created_at: string;
    }>;

  return rows.map((row) => ({
    id: String(row.id),
    alertType: row.alert_type,
    severity: row.severity,
    caseId: row.case_id,
    patientId: row.patient_id,
    title: row.title,
    detail: row.detail,
    score: Number(row.score),
    createdAt: row.created_at,
  }));
}

export async function getCaseTimeline(caseId: string) {
  const sql = getSqlClient();
  if (!sql) {
    return demoStore.caseTimeline[caseId] ?? [];
  }

  const rows = (await sql`
    select event_ts, event_type, event_value, unit, detail
    from gold.case_timeline
    where case_id = ${Number(caseId)}
    order by event_ts asc
  `) as Array<{
      event_ts: string;
      event_type: string;
      event_value: string;
      unit: string | null;
      detail: string | null;
    }>;

  return rows.map((row) => ({
    ts: row.event_ts,
    type: row.event_type,
    value: row.event_value,
    unit: row.unit ?? undefined,
    detail: row.detail ?? undefined,
  }));
}

export async function getQualitySummary() {
  const issues = await getQualityIssues();
  const total = Math.max(issues.length, 1);
  const high = issues.filter((item) => item.severity === "high").length;
  const medium = issues.filter((item) => item.severity === "medium").length;

  return {
    completeness: Number((1 - high / total * 0.6).toFixed(2)),
    validity: Number((1 - (high + medium) / total * 0.5).toFixed(2)),
    consistency: Number((1 - medium / total * 0.4).toFixed(2)),
    issueCount: issues.length,
    bySeverity: { high, medium, low: issues.filter((item) => item.severity === "low").length },
  };
}

export function getIngestionStatus() {
  return demoStore.ingestionStatus;
}
