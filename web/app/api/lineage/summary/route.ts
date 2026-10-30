import { NextResponse } from "next/server";
import { getLineageSummary } from "@/lib/queries";

export async function GET() {
  const summary = await getLineageSummary();
  return NextResponse.json(summary);
}
