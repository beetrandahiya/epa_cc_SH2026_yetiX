import { NextResponse } from "next/server";
import { explainAlert } from "@/lib/ai/anthropic";
import { getAlerts } from "@/lib/queries";

export async function POST(
  _request: Request,
  context: { params: Promise<{ alertId: string }> },
) {
  const { alertId } = await context.params;
  const alerts = await getAlerts();
  const alert = alerts.find((entry) => entry.id === alertId);

  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  const explanation = await explainAlert(alert);
  return NextResponse.json({ alertId, explanation });
}
