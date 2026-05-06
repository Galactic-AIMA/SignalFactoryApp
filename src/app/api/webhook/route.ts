import { NextRequest, NextResponse } from "next/server";
import { sendWebhook } from "@/lib/webhook";
import { z } from "zod";

const schema = z.object({
  numero: z.number().int().min(0).max(999),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { numero } = schema.parse(body);
    const success = await sendWebhook(numero);
    return NextResponse.json({ ok: success, numero });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
