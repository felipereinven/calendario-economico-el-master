/**
 * Formatea valores tal como vienen de Investing.com
 * Preserva los sufijos originales (%, K, B, M, etc.)
 */

export function formatNumber(value: string | null): string {
  // Manejar valores vacíos o nulos
  if (!value || value === "N/A" || value === "") return "—";

  // Retornar el valor exactamente como viene de Investing.com
  // Esto preserva sufijos como %, K, B, M y el formato original
  return value.trim();
}
