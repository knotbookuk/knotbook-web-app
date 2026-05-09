"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";

interface PaginationProps {
  page: number;            // 1-indexed
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}

const PRESETS = [20, 50, 100];
const MAX_CUSTOM = 500;

/**
 * Reusable page navigation with size selector.
 *
 * - Renders nothing when total <= pageSize on the smallest preset (no need)
 * - Page-size dropdown: 20 / 50 / 100 / Custom...
 * - "Custom" reveals a number input (1-500)
 * - Page buttons: Prev | first | ... | window | ... | last | Next
 */
export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className = "",
}: PaginationProps) {
  const [customMode, setCustomMode] = useState(
    !PRESETS.includes(pageSize),
  );
  const [customValue, setCustomValue] = useState(String(pageSize));

  useEffect(() => {
    setCustomMode(!PRESETS.includes(pageSize));
    setCustomValue(String(pageSize));
  }, [pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  const handlePresetSelect = (val: string) => {
    if (val === "custom") {
      setCustomMode(true);
      return;
    }
    const n = parseInt(val, 10);
    if (Number.isFinite(n) && n > 0) {
      setCustomMode(false);
      onPageSizeChange(n);
    }
  };

  const commitCustom = () => {
    const n = parseInt(customValue, 10);
    if (Number.isFinite(n) && n >= 1 && n <= MAX_CUSTOM) {
      onPageSizeChange(n);
    } else {
      // Invalid → reset to current
      setCustomValue(String(pageSize));
    }
  };

  // Build page-number window: 1, ..., (n-1, n, n+1), ..., last
  const windowSize = 1; // pages on each side of current
  const pageNums = new Set<number>();
  pageNums.add(1);
  pageNums.add(totalPages);
  for (let i = safePage - windowSize; i <= safePage + windowSize; i++) {
    if (i >= 1 && i <= totalPages) pageNums.add(i);
  }
  const sortedPages = Array.from(pageNums).sort((a, b) => a - b);
  const renderPages: (number | "…")[] = [];
  for (let i = 0; i < sortedPages.length; i++) {
    if (i > 0 && sortedPages[i] - sortedPages[i - 1] > 1) {
      renderPages.push("…");
    }
    renderPages.push(sortedPages[i]);
  }

  if (total === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-outline-variant/15 ${className}`}
    >
      {/* Left: count + page size */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-label text-on-surface-variant whitespace-nowrap">
          Showing <span className="font-semibold text-on-surface">{start}</span>
          {"–"}
          <span className="font-semibold text-on-surface">{end}</span> of{" "}
          <span className="font-semibold text-on-surface">{total}</span>
        </span>
        <div className="flex items-center gap-2">
          <label className="text-xs font-label text-on-surface-variant">
            Per page:
          </label>
          {customMode ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={MAX_CUSTOM}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onBlur={commitCustom}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitCustom();
                  }
                }}
                className="w-20 px-2 py-1 rounded-lg ghost-border bg-surface-container-lowest text-xs font-label text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => {
                  setCustomMode(false);
                  setCustomValue(String(20));
                  onPageSizeChange(20);
                }}
                className="text-xs text-on-surface-variant/60 hover:text-on-surface-variant cursor-pointer"
                title="Use a preset size"
              >
                <Icon name="close" className="text-sm" />
              </button>
            </div>
          ) : (
            <select
              value={String(pageSize)}
              onChange={(e) => handlePresetSelect(e.target.value)}
              className="px-2 py-1 rounded-lg ghost-border bg-surface-container-lowest text-xs font-label text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              {PRESETS.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
              <option value="custom">Custom...</option>
            </select>
          )}
        </div>
      </div>

      {/* Right: page nav */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary-container/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
          aria-label="Previous page"
        >
          <Icon name="chevron_left" className="text-lg" />
        </button>

        {renderPages.map((p, i) =>
          p === "…" ? (
            <span
              key={`gap-${i}`}
              className="px-2 text-xs font-label text-on-surface-variant/50"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-label font-medium transition-all cursor-pointer ${
                p === safePage
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-primary hover:bg-primary-container/10"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary-container/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
          aria-label="Next page"
        >
          <Icon name="chevron_right" className="text-lg" />
        </button>
      </div>
    </div>
  );
}
