/**
 * Format a number as GBP currency with commas (e.g. £25,000)
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return "£0";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a number with commas for display in inputs (no currency symbol)
 */
export function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  if (isNaN(num) || num === 0) return "";
  return num.toLocaleString("en-GB");
}

/**
 * Strip formatting from a number string (remove commas, currency symbols)
 */
export function parseNumber(value: string): string {
  return value.replace(/[£,\s]/g, "").replace(/[^0-9.]/g, "");
}
