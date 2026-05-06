import { NextRequest, NextResponse } from "next/server";
import { importCsv } from "@/lib/csv-import";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("csv") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No se envió archivo CSV" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpPath = path.join(process.cwd(), "data", "import_temp.csv");
    fs.writeFileSync(tmpPath, buffer);

    const count = importCsv(tmpPath);
    fs.unlinkSync(tmpPath);

    return NextResponse.json({ ok: true, importados: count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
