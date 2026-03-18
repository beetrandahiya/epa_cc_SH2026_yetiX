import { beforeEach, describe, expect, it } from "vitest";
import { getQualitySummary } from "@/lib/queries";
import { demoStore } from "@/lib/store";

describe("quality summary", () => {
  beforeEach(() => {
    demoStore.qualityIssues = [];
  });

  it("returns stable defaults with no issues", async () => {
    const summary = await getQualitySummary();
    expect(summary.issueCount).toBe(0);
    expect(summary.completeness).toBeGreaterThan(0);
  });

  it("decreases metrics when severe issues exist", async () => {
    demoStore.qualityIssues = [
      {
        id: "1",
        dataset: "labs",
        issueType: "lab-out-of-range",
        severity: "high",
        message: "CRP high",
        sourceFile: "labs.csv",
      },
    ];

    const summary = await getQualitySummary();
    expect(summary.issueCount).toBe(1);
    expect(summary.completeness).toBeLessThan(1);
  });
});
