import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import * as xlsx from "xlsx";
import { getSqlClient } from "@/lib/db/client";
import { initDatabase } from "@/lib/db/init";
import {
  extractCanonicalIds,
  isMandatoryValid,
  normalizeRecord,
} from "@/lib/etl/cleaning";
import { demoStore } from "@/lib/store";
import type { DatasetKey } from "@/lib/types";

const DATA_FILE_MAP: Record<DatasetKey, string> = {
  "epaAC-Data-1": "Endtestdaten_ohne_Fehler_ einheitliche ID/epaAC-Data-1.csv",
  "epaAC-Data-2": "Endtestdaten_ohne_Fehler_ einheitliche ID/epaAC-Data-2.csv",
  "epaAC-Data-3": "Endtestdaten_ohne_Fehler_ einheitliche ID/epaAC-Data-3.csv",
  "epaAC-Data-5": "Endtestdaten_ohne_Fehler_ einheitliche ID/epaAC-Data-5.csv",
  synthetic_cases_icd10_ops:
    "Endtestdaten_ohne_Fehler_ einheitliche ID/synthetic_cases_icd10_ops.csv",
  synth_labs_1000_cases:
    "Endtestdaten_ohne_Fehler_ einheitliche ID/synth_labs_1000_cases.csv",
  synthetic_medication_raw_inpatient:
    "Endtestdaten_ohne_Fehler_ einheitliche ID/synthetic_medication_raw_inpatient.csv",
  synthetic_nursing_daily_reports_en:
    "Endtestdaten_ohne_Fehler_ einheitliche ID/synthetic_nursing_daily_reports_en.csv",
  synthetic_device_motion_fall_data:
    "Endtestdaten_ohne_Fehler_ einheitliche ID/synthetic_device_motion_fall_data.csv",
  synthetic_device_raw_1hz_motion_fall:
    "Endtestdaten_ohne_Fehler_ einheitliche ID/synthetic_device_raw_1hz_motion_fall.csv",
};

export function getDatasetPath(dataset: DatasetKey) {
  const repoRoot = path.resolve(process.cwd(), "..");
  return path.join(repoRoot, DATA_FILE_MAP[dataset]);
}

function hashRecord(payload: Record<string, unknown>) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function surrogateCaseIdFromPatient(patientId: string) {
  const digest = crypto.createHash("md5").update(patientId).digest("hex");
  const value = Number.parseInt(digest.slice(0, 8), 16);
  return (value % 9000000) + 1000000;
}

async function parseCsv(filePath: string): Promise<Record<string, unknown>[]> {
  const csv = await fs.readFile(filePath, "utf-8");
  const firstLine = csv.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes(";") ? ";" : ",";
  const parsed = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: true,
    delimiter,
  });
  return parsed.data;
}

async function parseXlsx(filePath: string): Promise<Record<string, unknown>[]> {
  const workbook = xlsx.readFile(filePath);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(firstSheet, { defval: null }) as Record<string, unknown>[];
}

async function parseByExtension(filePath: string) {
  if (filePath.endsWith(".csv")) {
    return parseCsv(filePath);
  }
  if (filePath.endsWith(".xlsx")) {
    return parseXlsx(filePath);
  }
  throw new Error(`Unsupported file format: ${filePath}`);
}

function dedupeEpa1(records: Record<string, unknown>[]) {
  const byIid = new Map<string, Record<string, unknown>>();
  for (const row of records) {
    const iid = String(row.IID ?? row.iid ?? "").trim();
    if (!iid) {
      continue;
    }
    byIid.set(iid, row);
  }
  return [...byIid.values()];
}

export async function ingestDataset(
  dataset: DatasetKey,
  options?: { force?: boolean },
) {
  const force = options?.force ?? false;
  await initDatabase();
  const filePath = getDatasetPath(dataset);
  const sourceFile = path.basename(filePath);
  const sql = getSqlClient();

  if (!force) {
    if (sql) {
      const rows = (await sql`
        select total_rows, valid_rows, dropped_rows, ingested_at
        from bronze.ingestion_runs
        where dataset = ${dataset}
        order by ingested_at desc
        limit 1
      `) as Array<{
        total_rows: number;
        valid_rows: number;
        dropped_rows: number;
        ingested_at: string;
      }>;

      if (rows.length > 0) {
        return {
          dataset,
          sourceFile,
          filePath,
          ingested: Number(rows[0].valid_rows),
          dropped: Number(rows[0].dropped_rows),
          totalRows: Number(rows[0].total_rows),
          skipped: true,
          mode: "database" as const,
          ingestedAt: rows[0].ingested_at,
        };
      }
    } else {
      const previous = demoStore.ingestionRuns.find((run) => run.dataset === dataset);
      if (previous) {
        return {
          dataset,
          sourceFile,
          filePath,
          ingested: previous.validRows,
          dropped: previous.droppedRows,
          totalRows: previous.totalRows,
          skipped: true,
          mode: "memory" as const,
          ingestedAt: previous.ingestedAt,
        };
      }
    }
  }

  const records = await parseByExtension(filePath);

  const candidateRows = dataset === "epaAC-Data-1" ? dedupeEpa1(records) : records;

  if (sql) {
    await sql`delete from bronze.raw_records where dataset = ${dataset}`;
    await sql`delete from bronze.ingestion_runs where dataset = ${dataset}`;
  } else {
    demoStore.rawRecords = demoStore.rawRecords.filter((row) => row.dataset !== dataset);
    demoStore.ingestionRuns = demoStore.ingestionRuns.filter((run) => run.dataset !== dataset);
  }

  let ingested = 0;
  let dropped = 0;

  for (let index = 0; index < candidateRows.length; index += 1) {
    const row = normalizeRecord(candidateRows[index]);
    const { caseId, patientId } = extractCanonicalIds(row);

    let resolvedCaseId = caseId;
    if (
      resolvedCaseId === null &&
      patientId &&
      (dataset === "synthetic_device_motion_fall_data" ||
        dataset === "synthetic_device_raw_1hz_motion_fall")
    ) {
      resolvedCaseId = surrogateCaseIdFromPatient(patientId);
    }

    row.case_id = resolvedCaseId;
    row.patient_id = patientId;

    const isValid = isMandatoryValid(row);

    if (!isValid) {
      dropped += 1;
    } else {
      ingested += 1;
    }

    const rowHash = hashRecord(row);
    const rowNumber = index + 2;

    if (sql) {
      await sql`
        insert into bronze.raw_records
          (dataset, source_file, row_number, row_hash, payload, is_valid, invalid_reason)
        values
          (${dataset}, ${sourceFile}, ${rowNumber}, ${rowHash}, ${JSON.stringify(row)}::jsonb, ${isValid}, ${
            isValid ? null : "Missing case_id or patient_id after normalization"
          })
      `;
    } else {
      demoStore.rawRecords.push({
        dataset,
        sourceFile,
        rowNumber,
        rowHash,
        payload: row,
        isValid,
        invalidReason: isValid ? null : "Missing case_id or patient_id after normalization",
        ingestedAt: new Date().toISOString(),
      });
    }
  }

  if (sql) {
    await sql`
      insert into bronze.ingestion_runs
        (dataset, source_file, total_rows, valid_rows, dropped_rows)
      values
        (${dataset}, ${sourceFile}, ${candidateRows.length}, ${ingested}, ${dropped})
    `;
  }

  demoStore.ingestionStatus[dataset] = ingested;
  demoStore.ingestionRuns.push({
    dataset,
    sourceFile,
    totalRows: candidateRows.length,
    validRows: ingested,
    droppedRows: dropped,
    ingestedAt: new Date().toISOString(),
  });

  return {
    dataset,
    sourceFile,
    filePath,
    ingested,
    dropped,
    totalRows: candidateRows.length,
    skipped: false,
    mode: sql ? "database" : "memory",
  };
}
