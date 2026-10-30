import { NextResponse } from "next/server";
import { ingestDataset } from "@/lib/etl/ingest";
import type { DatasetKey } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ dataset: string }> },
) {
  try {
    const { dataset } = await context.params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "1";
    const result = await ingestDataset(dataset as DatasetKey, { force });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown ingestion error" },
      { status: 400 },
    );
  }
}
