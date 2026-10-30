import { NextResponse } from "next/server";
import { getRawFilesSummary } from "@/lib/queries";

export async function GET() {
  const datasets = await getRawFilesSummary();
  return NextResponse.json({ datasets });
}
