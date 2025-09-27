export type GenericDataPoint = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Determine whether to use line or bar chart.
 * Heuristic:
 *  - If numeric series look continuous (many distinct numeric values over x), prefer "line".
 *  - If numeric series look discrete (few distinct values) or mostly counts/integers with many zeros, prefer "bar".
 *
 * yKeys: list of numeric series keys to examine (e.g. ["actualHours","predictedHours"]).
 */
export function detectChartType(
  data: GenericDataPoint[] | undefined | null,
  xKey: string,
  yKeys?: string[]
): "line" | "bar" {
  if (!data || data.length === 0) return "line";

  const first = data[0];
  const inferredYKeys =
    yKeys && yKeys.length > 0
      ? yKeys
      : Object.keys(first).filter((k) => k !== xKey);

  const stats = inferredYKeys.map((key) => {
    const vals = data
      .map((d) => d[key])
      .filter((v) => typeof v === "number") as number[];
    const unique = new Set(vals).size;
    const zeros = vals.filter((v) => v === 0).length;
    const ints = vals.filter((v) => Number.isInteger(v)).length;
    return {
      key,
      count: vals.length,
      unique,
      zeroPct: vals.length ? zeros / vals.length : 0,
      intPct: vals.length ? ints / vals.length : 0,
    };
  });

  const mostlyCategorical = stats.every((s) => s.unique <= 8 && s.count > 0);
  if (mostlyCategorical) return "bar";

  const hasContinuous = stats.some((s) => s.unique > 12);
  if (hasContinuous) return "line";

  const looksLikeCounts = stats.some((s) => s.intPct > 0.8 && s.zeroPct > 0.2);
  if (looksLikeCounts) return "bar";

  return "line";
}

export function aggregateData(
  data: GenericDataPoint[],
  xKey: string,
  yKeys: string[],
  bucketSize: number
): GenericDataPoint[] {
  if (data.length <= bucketSize) return data;

  const aggregated: GenericDataPoint[] = [];

  for (let i = 0; i < data.length; i += bucketSize) {
    const slice = data.slice(i, i + bucketSize);
    const aggPoint: GenericDataPoint = {};

    aggPoint[xKey] = slice[0][xKey];

    yKeys.forEach((key) => {
      const nums = slice.map((d) => Number(d[key])).filter((v) => !isNaN(v));
      const avg = nums.length
        ? nums.reduce((a, b) => a + b, 0) / nums.length
        : 0;
      aggPoint[key] = avg;
    });

    aggregated.push(aggPoint);
  }

  return aggregated;
}

/**
 * Placeholder for future extensions:
 * - Predictive trendlines
 * - Anomaly detection highlighting
 * - Other chart utilities
 */
