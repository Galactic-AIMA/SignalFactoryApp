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
