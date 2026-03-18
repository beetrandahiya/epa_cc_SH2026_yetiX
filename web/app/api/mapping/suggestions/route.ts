import { NextResponse } from "next/server";
import { getMappingSuggestions } from "@/lib/queries";

export async function GET() {
  const mappings = await getMappingSuggestions();
  return NextResponse.json({ mappings });
}
