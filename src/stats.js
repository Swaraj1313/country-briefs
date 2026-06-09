// ─── STATISTICAL ENGINE ───────────────────────────────────────────────────────
// All stats computed on actuals only (isForecast === false).
// Projection data is passed through for chart rendering but excluded from table stats.
// ─────────────────────────────────────────────────────────────────────────────

export function computeStats(data) {
  if (!data || data.length === 0) return null;

  const actuals = data.filter(d => !d.isForecast);
  if (actuals.length < 2) return null;

  const vals   = actuals.map(d => d.value);
  const n      = vals.length;
  const mean   = vals.reduce((s, v) => s + v, 0) / n;
  const std    = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  const min    = Math.min(...vals);
  const max    = Math.max(...vals);
  const minYear = actuals.find(d => d.value === min)?.year ?? null;
  const maxYear = actuals.find(d => d.value === max)?.year ?? null;

  const latest = actuals[actuals.length - 1];
  const prev   = actuals[actuals.length - 2];
  const yoy    = latest && prev
    ? parseFloat((latest.value - prev.value).toFixed(2))
    : null;

  // Consecutive directional trend on actuals
  let trendDir = null, trendCount = 0;
  if (actuals.length >= 2) {
    trendDir   = actuals[actuals.length - 1].value >= actuals[actuals.length - 2].value
      ? "rising" : "declining";
    trendCount = 1;
    for (let i = actuals.length - 2; i > 0; i--) {
      const d = actuals[i].value >= actuals[i - 1].value ? "rising" : "declining";
      if (d === trendDir) trendCount++;
      else break;
    }
  }

  return {
    n,
    mean:      +mean.toFixed(2),
    std:       +std.toFixed(2),
    min:       +min.toFixed(2),
    max:       +max.toFixed(2),
    minYear,
    maxYear,
    latest,
    prev,
    yoy,
    trendDir,
    trendCount,
    first:     actuals[0],
  };
}

// ─── STATISTICAL NOTES ───────────────────────────────────────────────────────
export function generateStatNotes(allData, indicatorMeta) {
  const notes = [];
  const fmt   = (v, unit) => unit === "USD"
    ? `$${Number(v).toLocaleString()}`
    : `${parseFloat(v).toFixed(1)}${unit.startsWith("%") ? "%" : " " + unit}`;

  indicatorMeta.forEach(({ key, label, unit }) => {
    const data = allData[key];
    if (!data || data.length < 3) return;
    const s = computeStats(data);
    if (!s || !s.latest) return;

    // 1. Latest = period high or low
    if (s.n > 3) {
      if (s.latest.value === s.max)
        notes.push(`${label}: Latest reading of ${fmt(s.latest.value, unit)} (${s.latest.year}) equals the period maximum.`);
      else if (s.latest.value === s.min)
        notes.push(`${label}: Latest reading of ${fmt(s.latest.value, unit)} (${s.latest.year}) equals the period minimum.`);
    }

    // 2. Outlier — > 2 std devs from mean
    if (s.std > 0.1 && Math.abs(s.latest.value - s.mean) > 2 * s.std) {
      const dir  = s.latest.value > s.mean ? "above" : "below";
      const devs = Math.abs((s.latest.value - s.mean) / s.std).toFixed(1);
      notes.push(`${label}: Latest value (${fmt(s.latest.value, unit)}, ${s.latest.year}) is ${devs} standard deviations ${dir} the period mean of ${fmt(s.mean, unit)}.`);
    }

    // 3. Large YoY movement — > 1.5 std devs
    if (s.yoy !== null && s.std > 0.1 && Math.abs(s.yoy) > 1.5 * s.std && s.prev)
      notes.push(`${label}: Year-on-year change of ${s.yoy > 0 ? "+" : ""}${s.yoy.toFixed(1)} pp (${s.prev.year}→${s.latest.year}) is among the largest single-year movements in the review period.`);

    // 4. Consecutive trend (3+ years)
    if (s.trendCount >= 3)
      notes.push(`${label}: ${s.trendDir.charAt(0).toUpperCase() + s.trendDir.slice(1)} for ${s.trendCount} consecutive years through ${s.latest.year}.`);
  });

  // Cross-indicator: fiscal deteriorating while debt rising
  const fs = computeStats(allData.fiscal);
  const ds = computeStats(allData.debt);
  if (fs && ds) {
    if (fs.trendDir === "declining" && ds.trendDir === "rising")
      notes.push("Fiscal balance & govt debt: Concurrent trends — fiscal balance declining while government debt is rising over the same period.");
    if (fs.trendDir === "rising" && ds.trendDir === "declining")
      notes.push("Fiscal balance & govt debt: Concurrent trends — fiscal balance improving while government debt is declining over the same period.");
  }

  // Cross-indicator: current account falling, debt service rising
  const ca = computeStats(allData.currentAccount);
  const dse = computeStats(allData.debtServiceExports);
  if (ca && dse && ca.trendDir === "declining" && dse.trendDir === "rising")
    notes.push("Current account & debt service (% exports): Concurrent trends — current account declining while external debt service obligations are rising.");

  if (notes.length === 0)
    notes.push("No statistically notable movements identified in the review period. All available indicators are within normal range relative to their period means.");

  return notes;
}

// ─── DATA GAP SUMMARY ────────────────────────────────────────────────────────
export function generateDataGaps(allData, allIndicatorMeta) {
  const available = [], missing = [];

  allIndicatorMeta.forEach(({ key, label, source }) => {
    const d = allData[key];
    if (d && (Array.isArray(d) ? d.length >= 1 : d.value !== null)) {
      if (Array.isArray(d) && d.length >= 1) {
        const acts = d.filter(x => !x.isForecast);
        const fcs  = d.filter(x => x.isForecast);
        let desc   = `${label} [${source}]: ${acts.length} actual observations`;
        if (acts.length) desc += ` (${acts[0].year}–${acts[acts.length - 1].year})`;
        if (fcs.length)  desc += `, IMF projections ${fcs[0].year}–${fcs[fcs.length - 1].year}`;
        available.push(desc);
      } else {
        available.push(`${label} [${source}]: Latest value ${d.value} (${d.year})`);
      }
    } else {
      missing.push(`${label} [${source}]: No data available for this country`);
    }
  });

  return { available, missing };
}
