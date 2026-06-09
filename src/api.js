// ─── API LAYER ────────────────────────────────────────────────────────────────
// IMF calls go through /api/imf serverless proxy (Vercel) to bypass CORS.
// World Bank API is CORS-compatible for direct browser fetch.
//
// Return shape for time-series: Array<{ year: number, value: number, isForecast: boolean }>
// Return shape for snapshots:   { value: number | null, year: number | null }
// Empty array / null = "not available" — never throws, never crashes the document.
// ─────────────────────────────────────────────────────────────────────────────

import {
  WB_BASE,
  ACTUALS_START, ACTUALS_END, FORECAST_FROM, PROJECTION_END,
} from "./config";

// ── IMF proxy URL ─────────────────────────────────────────────────────────────
// On Vercel: /api/imf routes to api/imf.js serverless function.
// On localhost: same path works if you run `vercel dev`, otherwise use direct URL.
const IMF_PROXY = "/api/imf";

// ── IMF time series ───────────────────────────────────────────────────────────
export async function fetchIMFSeries(imfCode, indicatorCode, includeProjections = false) {
  try {
    const url = `${IMF_PROXY}?indicator=${indicatorCode}&country=${imfCode}`;
    const res  = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    const raw  = json?.values?.[indicatorCode]?.[imfCode] ?? {};

    const endYear = includeProjections ? PROJECTION_END : ACTUALS_END;

    return Object.entries(raw)
      .map(([y, v]) => ({ year: parseInt(y), value: v }))
      .filter(d => d.value !== null && d.value !== undefined && !isNaN(parseFloat(d.value)))
      .filter(d => d.year >= ACTUALS_START && d.year <= endYear)
      .map(d => ({
        year:       d.year,
        value:      parseFloat(parseFloat(d.value).toFixed(2)),
        isForecast: d.year >= FORECAST_FROM,
      }))
      .sort((a, b) => a.year - b.year);
  } catch {
    return [];
  }
}

// ── World Bank time series ────────────────────────────────────────────────────
export async function fetchWBSeries(wbCode, indicatorCode) {
  try {
    const url = `${WB_BASE}/country/${wbCode}/indicator/${indicatorCode}?format=json&mrv=10&per_page=10`;
    const res  = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    return (json[1] ?? [])
      .filter(d => d.value !== null && d.value !== undefined)
      .map(d => ({
        year:       parseInt(d.date),
        value:      parseFloat(parseFloat(d.value).toFixed(2)),
        isForecast: false,
      }))
      .filter(d => d.year >= ACTUALS_START && d.year <= ACTUALS_END)
      .sort((a, b) => a.year - b.year);
  } catch {
    return [];
  }
}

// ── World Bank snapshot (latest single value) ─────────────────────────────────
export async function fetchWBSnapshot(wbCode, indicatorCode) {
  try {
    const url = `${WB_BASE}/country/${wbCode}/indicator/${indicatorCode}?format=json&mrv=5&per_page=5`;
    const res  = await fetch(url);
    if (!res.ok) return { value: null, year: null };

    const json = await res.json();
    const hit  = (json[1] ?? []).find(d => d.value !== null && d.value !== undefined);
    if (!hit) return { value: null, year: null };

    return {
      value: parseFloat(parseFloat(hit.value).toFixed(2)),
      year:  parseInt(hit.date),
    };
  } catch {
    return { value: null, year: null };
  }
}

// ── World Bank country metadata ───────────────────────────────────────────────
export async function fetchWBMeta(wbCode) {
  try {
    const res  = await fetch(`${WB_BASE}/country/${wbCode}?format=json`);
    if (!res.ok) return null;

    const json = await res.json();
    const c    = json[1]?.[0];
    if (!c) return null;

    return {
      incomeLevel: c.incomeLevel?.value ?? "n/a",
      region:      c.region?.value      ?? "n/a",
      lendingType: c.lendingType?.value ?? "n/a",
      capitalCity: c.capitalCity        ?? "n/a",
    };
  } catch {
    return null;
  }
}
