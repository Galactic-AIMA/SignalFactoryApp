import { NextRequest, NextResponse } from "next/server";
import { getLogs } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const tipo = req.nextUrl.searchParams.get("tipo") as any;
  const logs = getLogs(100, tipo || undefined);
  return NextResponse.json(logs);
}
