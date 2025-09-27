// src/lib/chartUtils.ts
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

  // infer yKeys if not provided: take keys from first row excluding xKey and non-numeric-like values
  const first = data[0];
  const inferredYKeys =
    yKeys && yKeys.length > 0
      ? yKeys
      : Object.keys(first).filter((k) => k !== xKey);

  // For each yKey compute:
  // - number of unique numeric values
  // - percent of zeros
  // - whether most values are integers
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

  // Heuristic rules:
  // - If all numeric series have few unique values (<= 8) -> categorical => bar
  const mostlyCategorical = stats.every((s) => s.unique <= 8 && s.count > 0);

  if (mostlyCategorical) return "bar";

  // - If at least one series has many unique values (> 12) -> continuous => line
  const hasContinuous = stats.some((s) => s.unique > 12);
  if (hasContinuous) return "line";

  // - If series are mostly integers and many zeros (counts) -> bar
  const looksLikeCounts = stats.some((s) => s.intPct > 0.8 && s.zeroPct > 0.2);
  if (looksLikeCounts) return "bar";

  // fallback -> line
  return "line";
}
