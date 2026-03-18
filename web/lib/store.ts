import type { AlertEvent, MappingSuggestion, QualityIssue } from "@/lib/types";

type RawRecord = {
  dataset: string;
  sourceFile: string;
  rowNumber: number;
  rowHash: string;
  payload: Record<string, unknown>;
  ingestedAt: string;
  transformedAt?: string;
};

type CaseTimelineEvent = {
  ts: string;
  type: string;
  value: number | string;
  unit?: string;
  detail?: string;
};

export const demoStore: {
  rawRecords: RawRecord[];
  mappingSuggestions: MappingSuggestion[];
  qualityIssues: QualityIssue[];
  alerts: AlertEvent[];
  caseTimeline: Record<string, CaseTimelineEvent[]>;
  ingestionStatus: Record<string, number>;
} = {
  rawRecords: [],
  mappingSuggestions: [],
  qualityIssues: [],
  alerts: [],
  caseTimeline: {},
  ingestionStatus: {},
};
