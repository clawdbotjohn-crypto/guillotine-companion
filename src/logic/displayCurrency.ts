const DISPLAY_CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const WHOLE_DOLLARS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format already-computed values at the presentation boundary without changing math. */
export function formatDisplayCurrency(value: number | null | undefined, unavailable = '—'): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? DISPLAY_CURRENCY.format(value)
    : unavailable;
}

/** Max VORP values are modeled and rounded in whole league dollars. */
export function formatWholeDollars(value: number | null | undefined, unavailable = '—'): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? WHOLE_DOLLARS.format(value)
    : unavailable;
}
