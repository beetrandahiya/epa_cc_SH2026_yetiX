import { NextResponse } from "next/server";
import { getRawFileDataset } from "@/lib/queries";

export async function GET(
  _request: Request,
  context: { params: Promise<{ dataset: string }> },
) {
  const { dataset } = await context.params;
  const payload = await getRawFileDataset(dataset);
  return NextResponse.json(payload);
}
