import { NextResponse } from "next/server";
import { runTransform } from "@/lib/etl/transform";

export async function POST() {
  try {
    const result = await runTransform();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown transform error" },
      { status: 500 },
    );
  }
}
