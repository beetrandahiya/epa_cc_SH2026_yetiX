import { NextResponse } from "next/server";
import { hasAnthropic, hasDatabase } from "@/lib/config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "epa-harmonizer",
    database: hasDatabase ? "configured" : "memory-fallback",
    anthropic: hasAnthropic ? "configured" : "fallback-mode",
    timestamp: new Date().toISOString(),
  });
}
