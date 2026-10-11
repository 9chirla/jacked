import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "jacked",
    version: "0.11.0",
    phase: 11,
    time: new Date().toISOString(),
  });
}
