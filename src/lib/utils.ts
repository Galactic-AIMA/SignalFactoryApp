export function getGroupForNumber(n: number): number {
  const firstDigit = parseInt(String(n)[0]);
  const digitToGroup: Record<number, number> = {
    0: 1, 4: 1,
    8: 2, 6: 2,
    5: 3,
    1: 4, 2: 4, 7: 4,
    3: 5, 9: 5,
  };
  return digitToGroup[firstDigit] ?? 4;
}

export function padNumber(n: number): string {
  return String(n).padStart(3, "0");
}

export function formatOutputPath(numero: number, idioma: "es" | "en"): string {
  return `output/${idioma}/${padNumber(numero)}-${idioma}.mp4`;
}

/**
 * Calcula el publishAt para el número en posición `index` del lote.
 * Hora fija: 13:00 UTC = 8:00 AM Bogotá (UTC-5).
 */
export function calculatePublishAt(startDate: string, index: number): string {
  const date = new Date(`${startDate}T13:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString();
}
