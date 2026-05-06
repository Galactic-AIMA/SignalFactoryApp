import path from "path";
import { importCsv } from "./csv-import";

const csvPath = path.join(process.cwd(), "data", "guiones_angeles.csv");
const count = importCsv(csvPath);
console.log(`Seed completado: ${count} números angelicales importados.`);
