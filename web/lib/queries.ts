import { getSqlClient } from "@/lib/db/client";
import { demoStore } from "@/lib/store";
import type {
  AlertEvent,
  IngestionRun,
  LineageSummary,
  MappingSuggestion,
  QualityIssue,
} from "@/lib/types";

export async function getLatestIngestionRuns(): Promise<IngestionRun[]> {
  const sql = getSqlClient();
  if (!sql) {
    return demoStore.ingestionRuns;
  }

  const rows = (await sql`
    select distinct on (dataset)
      dataset,
      source_file,
      total_rows,
      valid_rows,
      dropped_rows,
      ingested_at
    from bronze.ingestion_runs
    order by dataset, ingested_at desc
  `) as Array<{
    dataset: string;
    source_file: string;
    total_rows: number;
    valid_rows: number;
    dropped_rows: number;
    ingested_at: string;
  }>;

  return rows.map((row) => ({
    dataset: row.dataset,
    sourceFile: row.source_file,
    totalRows: Number(row.total_rows),
    validRows: Number(row.valid_rows),
    droppedRows: Number(row.dropped_rows),
    ingestedAt: row.ingested_at,
  }));
}

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
  const ingestionRuns = await getLatestIngestionRuns();
  const issues = await getQualityIssues();
  const mappings = await getMappingSuggestions();

  const totalRows = ingestionRuns.reduce((sum, run) => sum + run.totalRows, 0);
  const validRows = ingestionRuns.reduce((sum, run) => sum + run.validRows, 0);
  const high = issues.filter((item) => item.severity === "high").length;
  const medium = issues.filter((item) => item.severity === "medium").length;
  const low = issues.filter((item) => item.severity === "low").length;

  const completeness = totalRows === 0 ? 0 : validRows / totalRows;
  const validity = validRows === 0 ? 0 : 1 - (high * 1 + medium * 0.5 + low * 0.2) / validRows;
  const avgConfidence =
    mappings.length === 0
      ? 0
      : mappings.reduce((sum, mapping) => sum + mapping.confidence, 0) / mappings.length;
  const consistency = Math.max(0, Math.min(1, avgConfidence));

  return {
    completeness: Number(Math.max(0, Math.min(1, completeness)).toFixed(2)),
    validity: Number(Math.max(0, Math.min(1, validity)).toFixed(2)),
    consistency: Number(consistency.toFixed(2)),
    issueCount: issues.length,
    bySeverity: { high, medium, low },
    ingestion: {
      totalRows,
      validRows,
      droppedRows: totalRows - validRows,
      datasetCount: ingestionRuns.length,
    },
  };
}

export async function getLineageSummary(): Promise<LineageSummary> {
  const sql = getSqlClient();
  const ingestionRuns = await getLatestIngestionRuns();
  const mappings = await getMappingSuggestions();
  const issues = await getQualityIssues();
  const alerts = await getAlerts();

  const totalRows = ingestionRuns.reduce((sum, run) => sum + run.totalRows, 0);
  const validRows = ingestionRuns.reduce((sum, run) => sum + run.validRows, 0);
  const droppedRows = ingestionRuns.reduce((sum, run) => sum + run.droppedRows, 0);

  let transformedRows = 0;
  if (sql) {
    const rows = (await sql`
      select count(*)::int as count
      from gold.case_timeline
    `) as Array<{ count: number }>;
    transformedRows = Number(rows[0]?.count ?? 0);
  } else {
    transformedRows = Object.values(demoStore.caseTimeline).reduce(
      (sum, timeline) => sum + timeline.length,
      0,
    );
  }

  return {
    totals: {
      totalRows,
      validRows,
      droppedRows,
      transformedRows,
      mappingCount: mappings.length,
      qualityIssueCount: issues.length,
      alertCount: alerts.length,
    },
    datasets: ingestionRuns.map((run) => ({
      dataset: run.dataset,
      totalRows: run.totalRows,
      validRows: run.validRows,
      droppedRows: run.droppedRows,
    })),
  };
}

function tryNumeric(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    if (normalized.length === 0) {
      return null;
    }
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function isTimestampLike(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }
  return /\d{4}-\d{2}-\d{2}/.test(value) || /\d{2}\.\d{2}\.\d{4}/.test(value);
}

export async function getRawFilesSummary() {
  const sql = getSqlClient();

  if (sql) {
    const rows = (await sql`
      select distinct on (dataset)
        dataset,
        source_file,
        total_rows,
        valid_rows,
        dropped_rows,
        ingested_at
      from bronze.ingestion_runs
      order by dataset, ingested_at desc
    `) as Array<{
      dataset: string;
      source_file: string;
      total_rows: number;
      valid_rows: number;
      dropped_rows: number;
      ingested_at: string;
    }>;

    return rows.map((row) => ({
      dataset: row.dataset,
      sourceFile: row.source_file,
      totalRows: Number(row.total_rows),
      validRows: Number(row.valid_rows),
      droppedRows: Number(row.dropped_rows),
      retention:
        Number(row.total_rows) === 0 ? 0 : Number((Number(row.valid_rows) / Number(row.total_rows)).toFixed(4)),
      ingestedAt: row.ingested_at,
    }));
  }

  return demoStore.ingestionRuns.map((run) => ({
    dataset: run.dataset,
    sourceFile: run.sourceFile,
    totalRows: run.totalRows,
    validRows: run.validRows,
    droppedRows: run.droppedRows,
    retention: run.totalRows === 0 ? 0 : Number((run.validRows / run.totalRows).toFixed(4)),
    ingestedAt: run.ingestedAt,
  }));
}

export async function getRawFileDataset(dataset: string) {
  const sql = getSqlClient();

  const rows = sql
    ? ((await sql`
        select row_number, is_valid, invalid_reason, payload
        from bronze.raw_records
        where dataset = ${dataset}
        order by row_number asc
        limit 250
      `) as Array<{
        row_number: number;
        is_valid: boolean;
        invalid_reason: string | null;
        payload: Record<string, unknown>;
      }>)
    : demoStore.rawRecords
        .filter((row) => row.dataset === dataset)
        .slice(0, 250)
        .map((row) => ({
          row_number: row.rowNumber,
          is_valid: row.isValid,
          invalid_reason: row.invalidReason ?? null,
          payload: row.payload,
        }));

  if (rows.length === 0) {
    return {
      dataset,
      columns: [] as string[],
      sampleRows: [] as Array<Record<string, unknown>>,
      numericProfiles: [] as Array<{ column: string; avg: number; min: number; max: number; count: number }>,
      timelineDensity: [] as Array<{ bucket: string; count: number }>,
      validity: { valid: 0, invalid: 0 },
    };
  }

  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row.payload))));

  const numericStats = new Map<string, { sum: number; min: number; max: number; count: number }>();
  const timelineBuckets = new Map<string, number>();
  let valid = 0;
  let invalid = 0;

  for (const row of rows) {
    if (row.is_valid) {
      valid += 1;
    } else {
      invalid += 1;
    }

    for (const [key, value] of Object.entries(row.payload)) {
      const numeric = tryNumeric(value);
      if (numeric !== null) {
        const current = numericStats.get(key) ?? {
          sum: 0,
          min: Number.POSITIVE_INFINITY,
          max: Number.NEGATIVE_INFINITY,
          count: 0,
        };
        current.sum += numeric;
        current.min = Math.min(current.min, numeric);
        current.max = Math.max(current.max, numeric);
        current.count += 1;
        numericStats.set(key, current);
      }

      if (isTimestampLike(value)) {
        const bucket = String(value).slice(0, 10);
        timelineBuckets.set(bucket, (timelineBuckets.get(bucket) ?? 0) + 1);
      }
    }
  }

  const numericProfiles = Array.from(numericStats.entries())
    .filter(([, stats]) => stats.count >= 5)
    .map(([column, stats]) => ({
      column,
      avg: Number((stats.sum / stats.count).toFixed(2)),
      min: Number(stats.min.toFixed(2)),
      max: Number(stats.max.toFixed(2)),
      count: stats.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const timelineDensity = Array.from(timelineBuckets.entries())
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket))
    .slice(0, 20);

  return {
    dataset,
    columns,
    sampleRows: rows.map((row) => ({
      row_number: row.row_number,
      is_valid: row.is_valid,
      invalid_reason: row.invalid_reason,
      ...row.payload,
    })),
    numericProfiles,
    timelineDensity,
    validity: { valid, invalid },
  };
}
