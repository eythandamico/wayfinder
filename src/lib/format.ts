/**
 * Truncates a hex address to `0x1234…abcd` form for display.
 * Falls back to the raw input for anything shorter than 10 chars.
 */
export function shortAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Compact integer formatter for token counts and similar metrics.
 * 1_234_567 → "1.2M", 4_200 → "4.2K", 42 → "42".
 */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}
