import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import * as xlsx from "xlsx";
import { getSqlClient } from "@/lib/db/client";
import { initDatabase } from "@/lib/db/init";
import { isMandatoryValid, normalizeCaseId, normalizeRecord } from "@/lib/etl/cleaning";
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

async function parseCsv(filePath: string): Promise<Record<string, unknown>[]> {
  const csv = await fs.readFile(filePath, "utf-8");
  const parsed = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: true,
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

export async function ingestDataset(dataset: DatasetKey) {
  await initDatabase();
  const filePath = getDatasetPath(dataset);
  const records = await parseByExtension(filePath);
  const sourceFile = path.basename(filePath);
  const sql = getSqlClient();

  const candidateRows = dataset === "epaAC-Data-1" ? dedupeEpa1(records) : records;

  let ingested = 0;
  let dropped = 0;

  for (let index = 0; index < candidateRows.length; index += 1) {
    const row = normalizeRecord(candidateRows[index]);
    if (!isMandatoryValid(row)) {
      dropped += 1;
      continue;
    }

    const caseIdRaw = row.case_id ?? row.caseid ?? row.CaseID ?? row.FallNr ?? row.fallnr;
    row.case_id = normalizeCaseId(caseIdRaw);
    row.patient_id = String(row.patient_id ?? row.patientid ?? row.PatientID);

    const rowHash = hashRecord(row);
    const rowNumber = index + 2;

    if (sql) {
      await sql`
        insert into bronze.raw_records (dataset, source_file, row_number, row_hash, payload)
        values (${dataset}, ${sourceFile}, ${rowNumber}, ${rowHash}, ${JSON.stringify(row)}::jsonb)
      `;
    } else {
      demoStore.rawRecords.push({
        dataset,
        sourceFile,
        rowNumber,
        rowHash,
        payload: row,
        ingestedAt: new Date().toISOString(),
      });
    }

    ingested += 1;
  }

  demoStore.ingestionStatus[dataset] = ingested;

  return {
    dataset,
    sourceFile,
    filePath,
    ingested,
    dropped,
    mode: sql ? "database" : "memory",
  };
}
