export type Severity = "low" | "medium" | "high";

export type DatasetKey =
  | "epaAC-Data-1"
  | "epaAC-Data-2"
  | "epaAC-Data-3"
  | "epaAC-Data-5"
  | "synthetic_cases_icd10_ops"
  | "synth_labs_1000_cases"
  | "synthetic_medication_raw_inpatient"
  | "synthetic_nursing_daily_reports_en"
  | "synthetic_device_motion_fall_data"
  | "synthetic_device_raw_1hz_motion_fall";

export type MappingSuggestion = {
  dataset: string;
  sourceColumn: string;
  targetField: string;
  confidence: number;
  rationale: string;
  status: "suggested" | "accepted" | "rejected";
};

export type QualityIssue = {
  id: string;
  dataset: string;
  issueType: string;
  severity: Severity;
  caseId?: number | null;
  patientId?: string | null;
  message: string;
  sourceFile: string;
  rowHash?: string | null;
};

export type AlertEvent = {
  id: string;
  alertType: string;
  severity: Severity;
  caseId?: number | null;
  patientId?: string | null;
  title: string;
  detail: string;
  score: number;
  createdAt: string;
};
