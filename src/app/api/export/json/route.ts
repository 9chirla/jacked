import {
  collectUserExport,
  totalRowCount,
} from "@/lib/data/collect-export";
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
      format: "json",
      row_count: rowCount,
    });
    if (logError) {
      return NextResponse.json(
        { error: `Could not log export: ${logError.message}` },
        { status: 500 },
      );
    }

    const stamp = bundle.exportedAt.slice(0, 10);
    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="jacked-export-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
