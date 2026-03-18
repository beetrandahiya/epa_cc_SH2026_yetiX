import Anthropic from "@anthropic-ai/sdk";
import { env, hasAnthropic } from "@/lib/config";
import type { AlertEvent, MappingSuggestion } from "@/lib/types";

function getClient() {
  if (!hasAnthropic || !env.ANTHROPIC_API_KEY) {
    return null;
  }
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

export async function suggestMappings(
  dataset: string,
  columns: string[],
): Promise<MappingSuggestion[]> {
  const client = getClient();
  if (!client) {
    return columns.map((column) => ({
      dataset,
      sourceColumn: column,
      targetField: column.toLowerCase().replaceAll(" ", "_"),
      confidence: 0.62,
      rationale: "Fallback rule-based mapping based on normalized column name.",
      status: "suggested",
    }));
  }

  const prompt = `You are mapping healthcare source columns to canonical fields.
Dataset: ${dataset}
Columns: ${columns.join(", ")}
Return JSON array with keys: sourceColumn,targetField,confidence,rationale where confidence is 0..1.`;

  try {
    const response = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");

    const parsed = JSON.parse(text) as Array<{
      sourceColumn: string;
      targetField: string;
      confidence: number;
      rationale: string;
    }>;
    return parsed.map((item) => ({ ...item, dataset, status: "suggested" as const }));
  } catch {
    return columns.map((column) => ({
      dataset,
      sourceColumn: column,
      targetField: column.toLowerCase(),
      confidence: 0.58,
      rationale: "LLM parse fallback applied.",
      status: "suggested",
    }));
  }
}

export async function extractNursingSignals(note: string) {
  const client = getClient();
  if (!client) {
    const lowered = note.toLowerCase();
    return {
      symptoms: lowered.includes("pain") ? ["pain"] : [],
      interventions: lowered.includes("mobil") ? ["mobilization"] : [],
      outcomes: lowered.includes("stable") ? ["stable condition"] : [],
      riskSignals: lowered.includes("fall") ? ["fall-risk"] : [],
    };
  }

  const prompt = `Extract structured nursing signals from the free-text note.
Return strict JSON with keys: symptoms, interventions, outcomes, riskSignals as arrays of short strings.
Note: ${note}`;

  try {
    const response = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");

    return JSON.parse(text) as {
      symptoms: string[];
      interventions: string[];
      outcomes: string[];
      riskSignals: string[];
    };
  } catch {
    return { symptoms: [], interventions: [], outcomes: [], riskSignals: [] };
  }
}

export async function explainAlert(alert: AlertEvent) {
  const client = getClient();
  if (!client) {
    return `Fallback explanation: ${alert.title}. Score ${alert.score} based on harmonized trend and quality context.`;
  }

  const prompt = `Explain this healthcare alert for a data quality dashboard.
Alert JSON: ${JSON.stringify(alert)}
Keep it concise, grounded, and actionable.`;

  try {
    const response = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 250,
      messages: [{ role: "user", content: prompt }],
    });

    return response.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");
  } catch {
    return `Fallback explanation: ${alert.title}. Score ${alert.score} based on harmonized trend and quality context.`;
  }
}
