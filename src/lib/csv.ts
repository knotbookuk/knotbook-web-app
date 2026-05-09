/**
 * CSV writer optimised for Excel compatibility.
 *
 * - Prepends a UTF-8 BOM so Excel renders £, ’, accents, emojis correctly.
 * - Uses CRLF line endings (RFC 4180 / Excel default).
 * - Escapes any cell containing comma, quote, CR, LF, or leading/trailing
 *   whitespace with double-quotes and doubles internal quotes.
 * - Numbers are written un-quoted so Excel treats them as numbers.
 */

export type CsvCell = string | number | boolean | null | undefined;

export function escapeCsv(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  const s = String(value);
  if (s === "") return "";
  const needsQuotes =
    s.includes(",") ||
    s.includes('"') ||
    s.includes("\n") ||
    s.includes("\r") ||
    s.startsWith(" ") ||
    s.endsWith(" ");
  return needsQuotes ? `"${s.replace(/"/g, '""')}"` : s;
}

export function rowsToCsv(rows: CsvCell[][]): string {
  return rows.map((r) => r.map(escapeCsv).join(",")).join("\r\n");
}

/** Trigger a browser download of the given CSV string with UTF-8 BOM. */
export function downloadCsv(filename: string, csv: string): void {
  // Excel needs the BOM (U+FEFF) to detect UTF-8. Use the JS ﻿ escape
  // so the bytes are generated at runtime regardless of file encoding.
  const BOM = String.fromCharCode(0xFEFF);
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Format a number as a 2-decimal amount (no currency symbol). */
export function formatGbp(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "";
  const num = typeof n === "number" ? n : parseFloat(n);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(2);
}

/** Format a date as DD/MM/YYYY (UK Excel default). */
export function formatUkDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}
