import {
  collectUserExport,
  totalRowCount,
} from "@/lib/data/collect-export";
import { rowsToCsv } from "@/lib/data/csv";
import { EXPORT_TABLES } from "@/lib/data/schema-version";
import { buildZipStore } from "@/lib/data/zip-store";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const bundle = await collectUserExport(supabase, user.id);
    const rowCount = totalRowCount(bundle);

    const { error: logError } = await supabase.from("export_log").insert({
      user_id: user.id,
      format: "csv",
      row_count: rowCount,
    });
    if (logError) {
      return NextResponse.json(
        { error: `Could not log export: ${logError.message}` },
        { status: 500 },
      );
    }

    const encoder = new TextEncoder();
    const entries = EXPORT_TABLES.map((name) => ({
      name: `${name}.csv`,
      data: encoder.encode(rowsToCsv(bundle.tables[name])),
    }));
    const zip = buildZipStore(entries);
    const stamp = bundle.exportedAt.slice(0, 10);

    return new NextResponse(Buffer.from(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="jacked-export-${stamp}-csv.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
