import fs from "fs";
import { getDb } from "./db";

interface CsvRow {
  numero: number;
  grupo: number;
  grupo_nombre: string;
  texto_es: string;
  texto_en: string;
}

export function importCsv(csvPath: string): number {
  const db = getDb();
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  const insert = db.prepare(`
    INSERT OR REPLACE INTO angel_numbers (id, grupo, grupo_nombre, texto_es, texto_en)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rows: CsvRow[]) => {
    for (const row of rows) {
      insert.run(row.numero, row.grupo, row.grupo_nombre, row.texto_es, row.texto_en);
    }
  });

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 7) continue;
    rows.push({
      numero: parseInt(values[0]),
      grupo: parseInt(values[1]),
      grupo_nombre: values[2],
      texto_es: values[5],
      texto_en: values[6],
    });
  }

  insertMany(rows);
  return rows.length;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
