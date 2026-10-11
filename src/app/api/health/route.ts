import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "jacked",
    version: "0.10.0",
    phase: 10,
    time: new Date().toISOString(),
  });
}
