import { describe, expect, it } from "vitest";
import {
  isMandatoryValid,
  normalizeCaseId,
  normalizeMissingValue,
  normalizePatientId,
} from "@/lib/etl/cleaning";

describe("cleaning rules", () => {
  it("normalizes case IDs from multiple formats", () => {
    expect(normalizeCaseId("CASE-0135")).toBe(135);
    expect(normalizeCaseId("0135")).toBe(135);
    expect(normalizeCaseId("135")).toBe(135);
  });

  it("maps configured null tokens to null", () => {
    expect(normalizeMissingValue("NULL")).toBeNull();
    expect(normalizeMissingValue("Missing")).toBeNull();
    expect(normalizeMissingValue("unknow")).toBeNull();
    expect(normalizeMissingValue("  ")).toBeNull();
  });

  it("drops records with missing mandatory IDs", () => {
    expect(isMandatoryValid({ case_id: "CASE-0135", patient_id: "P100" })).toBe(true);
    expect(isMandatoryValid({ case_id: "CASE-0135", patient_id: " " })).toBe(false);
    expect(isMandatoryValid({ patient_id: "P100" })).toBe(false);
  });

  it("normalizes patient ID from mixed inputs", () => {
    expect(normalizePatientId(" P100 ")).toBe("P100");
    expect(normalizePatientId("N/A")).toBeNull();
  });
});
