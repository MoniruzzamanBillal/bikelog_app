/**
 * `৳` money formatting, matching the web client's `formatTaka` exactly:
 * whole taka unless the value actually has decimals.
 */
export const formatTaka = (n: number): string =>
  `৳${n.toLocaleString(undefined, {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
