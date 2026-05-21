/**
 * Formatting helpers. Money in USD, dates in venue-friendly format.
 */

import { format, parseISO } from "date-fns";

export function formatMoney(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMoneyCompact(amount: number | null | undefined): string {
  if (amount == null) return "—";
  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 1,
      notation: "compact",
    }).format(amount);
  }
  return formatMoney(amount);
}

/** "Fri, May 7" — venue-style. */
export function formatShowDate(iso: string): string {
  return format(parseISO(iso), "EEE, MMM d");
}

/** "Fri, May 7, 2026" — full version. */
export function formatShowDateFull(iso: string): string {
  return format(parseISO(iso), "EEE, MMM d, yyyy");
}

/** "May 2026" — month grouping. */
export function formatShowMonth(iso: string): string {
  return format(parseISO(iso), "MMMM yyyy");
}

/**
 * Format a sell-through percentage for display.
 * e.g. 0.611 → "61.1%"
 */
export function formatPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** "in 5 days" / "8 days ago" — relative. */
export function relativeShowDate(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const showDate = parseISO(iso);
  showDate.setHours(0, 0, 0, 0);
  const diffMs = showDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}
