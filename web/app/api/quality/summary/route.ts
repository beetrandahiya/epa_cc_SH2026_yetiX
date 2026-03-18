import { NextResponse } from "next/server";
import { getQualitySummary } from "@/lib/queries";

export async function GET() {
  const summary = await getQualitySummary();
  return NextResponse.json(summary);
}
