import dotenv from "dotenv";
import type { DatasetKey } from "../lib/types";

dotenv.config({ path: ".env.local" });

const DATASETS: DatasetKey[] = [
  "epaAC-Data-1",
  "epaAC-Data-2",
  "epaAC-Data-3",
  "synth_labs_1000_cases",
  "synthetic_nursing_daily_reports_en",
  "synthetic_device_motion_fall_data",
  "synthetic_medication_raw_inpatient",
  "synthetic_cases_icd10_ops",
];

async function main() {
  const { ingestDataset } = await import("../lib/etl/ingest");
  const { runTransform } = await import("../lib/etl/transform");

  for (const dataset of DATASETS) {
    const result = await ingestDataset(dataset);
    console.log(`Ingested ${dataset}:`, result);
  }

  const transformed = await runTransform();
  console.log("Transform result:", transformed);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
