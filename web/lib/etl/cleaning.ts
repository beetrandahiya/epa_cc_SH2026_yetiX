const NULL_TOKENS = new Set(["null", "missing", "unknow", "nan", "n/a", ""]);

export function normalizeMissingValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (NULL_TOKENS.has(trimmed.toLowerCase())) {
      return null;
    }
    return trimmed;
  }

  return value;
}

export function normalizeCaseId(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase().replace("CASE-", "");
  const digits = normalized.match(/\d+/)?.[0];
  if (!digits) {
    return null;
  }

  return Number.parseInt(digits, 10);
}

export function normalizePatientId(value: unknown): string | null {
  const normalized = normalizeMissingValue(value);
  if (normalized === null) {
    return null;
  }
  return String(normalized);
}

export function normalizeRecord(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    output[key] = normalizeMissingValue(value);
  }
  return output;
}

export function isMandatoryValid(record: Record<string, unknown>): boolean {
  const caseIdRaw =
    record.case_id ?? record.caseid ?? record.CaseID ?? record.FallNr ?? record.fallnr;
  const patientIdRaw = record.patient_id ?? record.patientid ?? record.PatientID;

  const caseId = normalizeCaseId(caseIdRaw);
  const patientId = normalizePatientId(patientIdRaw);

  return caseId !== null && patientId !== null;
}
