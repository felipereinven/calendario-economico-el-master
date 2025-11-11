/**
 * Formatea números grandes con sufijos para mejorar legibilidad
 * Inspirado en el formato de Investing.com
 */

export function formatNumber(value: string | null): string {
  // Manejar valores vacíos o nulos
  if (!value || value === "N/A" || value === "") return "—";

  // Intentar parsear el número
  const num = parseFloat(value);
  
  // Si no es un número válido, retornar el valor original
  if (isNaN(num)) return value;

  // Números muy pequeños (cercanos a cero)
  if (Math.abs(num) < 0.01 && num !== 0) {
    return num.toFixed(4);
  }

  // Números pequeños (menores a 1000)
  if (Math.abs(num) < 1000) {
    // Preservar decimales para números pequeños
    if (num % 1 !== 0) {
      return num.toFixed(2);
    }
    return num.toString();
  }

  // Números grandes - formatear con sufijos
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  // Billones (Trillones en español)
  if (absNum >= 1e12) {
    const formatted = (absNum / 1e12).toFixed(2);
    return `${sign}${formatted}T`;
  }
  
  // Miles de millones (Billions)
  if (absNum >= 1e9) {
    const formatted = (absNum / 1e9).toFixed(2);
    return `${sign}${formatted}B`;
  }
  
  // Millones
  if (absNum >= 1e6) {
    const formatted = (absNum / 1e6).toFixed(2);
    return `${sign}${formatted}M`;
  }
  
  // Miles
  if (absNum >= 1e3) {
    const formatted = (absNum / 1e3).toFixed(2);
    return `${sign}${formatted}K`;
  }

  return num.toString();
}
