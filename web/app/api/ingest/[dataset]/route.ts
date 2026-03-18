import { NextResponse } from "next/server";
import { ingestDataset } from "@/lib/etl/ingest";
import type { DatasetKey } from "@/lib/types";

export async function POST(
  _request: Request,
  context: { params: Promise<{ dataset: string }> },
) {
  try {
    const { dataset } = await context.params;
    const result = await ingestDataset(dataset as DatasetKey);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown ingestion error" },
      { status: 400 },
    );
  }
}
