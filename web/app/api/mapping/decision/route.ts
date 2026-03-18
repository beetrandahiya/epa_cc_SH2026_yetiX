import { NextResponse } from "next/server";
import { z } from "zod";
import { getSqlClient } from "@/lib/db/client";
import { demoStore } from "@/lib/store";

const decisionSchema = z.object({
  dataset: z.string().min(1),
  sourceColumn: z.string().min(1),
  status: z.enum(["accepted", "rejected"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = decisionSchema.parse(body);
    const sql = getSqlClient();

    if (sql) {
      await sql`
        update silver.mapping_decision
        set status = ${payload.status}, decided_at = now()
        where dataset = ${payload.dataset} and source_column = ${payload.sourceColumn}
      `;
    } else {
      demoStore.mappingSuggestions = demoStore.mappingSuggestions.map((item) =>
        item.dataset === payload.dataset && item.sourceColumn === payload.sourceColumn
          ? { ...item, status: payload.status }
          : item,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid decision payload" },
      { status: 400 },
    );
  }
}
