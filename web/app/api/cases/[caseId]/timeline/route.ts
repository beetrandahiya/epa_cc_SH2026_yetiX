import { NextResponse } from "next/server";
import { getCaseTimeline } from "@/lib/queries";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const timeline = await getCaseTimeline(caseId);
  return NextResponse.json({ caseId, timeline });
}
