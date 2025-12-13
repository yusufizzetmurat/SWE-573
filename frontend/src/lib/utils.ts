import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format TimeBank values for display.
 * - Keeps fractional hours (e.g., 2.5)
 * - Trims trailing zeros (e.g., 1.00 -> 1)
 */
export function formatTimebank(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  // Avoid floating precision noise by formatting to 2 decimals then trimming.
  const fixed = num.toFixed(2);
  return fixed.replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
}










