import { NextResponse } from "next/server";
import { getQualityIssues } from "@/lib/queries";

export async function GET() {
  const issues = await getQualityIssues();
  return NextResponse.json({ issues });
}
