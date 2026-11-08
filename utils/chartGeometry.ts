/**
 * Shared bar-chart sizing for react-native-gifted-charts.
 *
 * gifted-charts' BarChart does NOT stretch its bars to fill the container — it lays
 * them out at a fixed `barWidth`/`spacing` and leaves whatever width is left over
 * empty on the right (or scrolls if they overflow). For a chart with a known, small
 * number of bars (months of a year, last-N-months trend) that empty gutter looks
 * broken. Given the measured chart width, `fillBarGeometry` returns the `barWidth`
 * and `spacing` that make the bars span the whole bar region exactly:
 *
 *   barCount * barWidth + (barCount - 1) * spacing === usable width
 *
 * where usable width = chartWidth − yAxisWidth − initialSpacing − endSpacing.
 */
export interface BarGeometryInput {
  /** Measured inner width available to the chart (incl. the y-axis label gutter). */
  chartWidth: number;
  barCount: number;
  /** Width gifted-charts reserves for the y-axis labels (`yAxisLabelWidth`). */
  yAxisWidth: number;
  initialSpacing: number;
  endSpacing: number;
  /** Cap so a few bars don't become absurdly wide; the gap absorbs the rest. */
  maxBarWidth?: number;
  /** Target gap-to-bar ratio before the fill clamp (0.65 ≈ a gap ~65% of a bar). */
  gapRatio?: number;
}

export interface BarGeometry {
  barWidth: number;
  spacing: number;
}

export function fillBarGeometry({
  chartWidth,
  barCount,
  yAxisWidth,
  initialSpacing,
  endSpacing,
  maxBarWidth = 44,
  gapRatio = 0.65,
}: BarGeometryInput): BarGeometry {
  const usable = chartWidth - yAxisWidth - initialSpacing - endSpacing;

  // Not measured yet (or degenerate) — hand back sane fixed values; the caller
  // re-renders once onLayout reports a real width.
  if (barCount < 1 || usable <= 0) {
    return { barWidth: Math.min(24, maxBarWidth), spacing: 16 };
  }
  if (barCount === 1) {
    return { barWidth: Math.min(maxBarWidth, usable), spacing: 0 };
  }

  const barWidth = Math.max(
    8,
    Math.min(maxBarWidth, usable / (barCount + (barCount - 1) * gapRatio)),
  );
  // Distribute the remainder as the inter-bar gap so the row fills exactly.
  const spacing = Math.max(4, (usable - barCount * barWidth) / (barCount - 1));
  return { barWidth, spacing };
}
