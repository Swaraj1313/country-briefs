// ─── COUNTRY BRIEF GENERATOR ─────────────────────────────────────────────────
// Single-page UI: select country → generate → download .docx
// No tabs, no year picker (fixed 2021–2025 window), no backend dependency.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { COUNTRIES, REGIONS, IMF_INDICATORS, WB_SERIES, WB_SNAPSHOTS } from "../config";
import { fetchIMFSeries, fetchWBSeries, fetchWBSnapshot, fetchWBMeta } from "../api";
import { buildAndDownload } from "../docBuilder";

// ── Progress steps ────────────────────────────────────────────────────────────
const STEPS = [
  "Fetching country metadata…",
  ...IMF_INDICATORS.map(i => `Fetching ${i.label} (IMF WEO)…`),
  ...WB_SERIES.map(i => `Fetching ${i.label} (World Bank)…`),
  ...WB_SNAPSHOTS.map(i => `Fetching ${i.label} (World Bank)…`),
  "Building charts…",
  "Assembling Word document…",
  "Done.",
];

export default function CountryBriefGenerator() {
  const [country,   setCountry]   = useState(COUNTRIES[0]);
  const [step,      setStep]      = useState(-1);
  const [error,     setError]     = useState(null);
  const [done,      setDone]      = useState(false);

  const isRunning = step >= 0 && step < STEPS.length - 1;
  const progress  = step < 0 ? 0 : Math.round(((step + 1) / STEPS.length) * 100);

  const regionGroups = REGIONS.map(r => ({
    region: r,
    countries: COUNTRIES.filter(c => c.region === r),
  }));

  const handleGenerate = async () => {
    setError(null); setDone(false); setStep(0);

    try {
      // ── metadata
      const meta = await fetchWBMeta(country.wb);
      let s = 1;

      // ── IMF time series
      const imfData = {};
      for (const ind of IMF_INDICATORS) {
        setStep(s++);
        imfData[ind.key] = await fetchIMFSeries(country.imf, ind.code, ind.showProj);
      }

      // ── WB time series
      const wbData = {};
      for (const ind of WB_SERIES) {
        setStep(s++);
        wbData[ind.key] = await fetchWBSeries(country.wb, ind.code);
      }

      // ── WB snapshots
      const snapshots = {};
      for (const ind of WB_SNAPSHOTS) {
        setStep(s++);
        snapshots[ind.key] = await fetchWBSnapshot(country.wb, ind.code);
      }

      const allData = { ...imfData, ...wbData };

      setStep(s++); // "Building charts…"
      setStep(s++); // "Assembling Word document…"

      await buildAndDownload(country, allData, meta, snapshots);

      setStep(s); setDone(true);
    } catch (e) {
      console.error(e);
      setError(e.message || "An error occurred. Check browser console for details.");
      setStep(-1);
    }
  };

  const reset = () => { setStep(-1); setDone(false); setError(null); };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerAccent} />
          <div style={styles.headerText}>
            <h1 style={styles.title}>Country at a Glance</h1>
            <p style={styles.subtitle}>
              Macroeconomic statistical brief · IMF WEO + World Bank · {COUNTRIES.length} economies
            </p>
          </div>
        </div>

        {/* Country selector */}
        <div style={styles.selectorWrap}>
          <label style={styles.label}>Economy</label>
          <select
            value={country.imf}
            onChange={e => setCountry(COUNTRIES.find(c => c.imf === e.target.value))}
            disabled={isRunning}
            style={styles.select}
          >
            {regionGroups.map(g => (
              <optgroup key={g.region} label={g.region}>
                {g.countries.map(c => (
                  <option key={c.imf} value={c.imf}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Country info pill */}
        <div style={styles.infoPill}>
          <span style={styles.infoCountry}>{country.name}</span>
          <span style={styles.infoDivider}>·</span>
          <span style={styles.infoMeta}>2021–2025 actuals + IMF projections to 2029 on selected charts</span>
          <span style={styles.infoDivider}>·</span>
          <span style={styles.infoMeta}>{country.region}</span>
        </div>

        {/* Document contents summary */}
        <div style={styles.contentsSummary}>
          <p style={styles.contentsLabel}>Document includes</p>
          <div style={styles.contentsGrid}>
            {[
              "Country classification & demographic snapshot",
              "Statistical summary table — all indicators",
              "8 IMF indicator charts (6 with projection tails)",
              "3 World Bank external debt/service charts",
              "Trends & statistical notes (rule-based)",
              "Full data availability disclosure",
            ].map(item => (
              <div key={item} style={styles.contentsItem}>
                <span style={styles.contentsCheck}>✓</span> {item}
              </div>
            ))}
          </div>
        </div>

        {/* Generate button */}
        {!isRunning && !done && (
          <button onClick={handleGenerate} style={styles.btn}>
            Generate · Download Word Document
          </button>
        )}

        {/* Progress */}
        {isRunning && (
          <div style={styles.progressWrap}>
            <div style={styles.progressHeader}>
              <span style={styles.progressMsg}>{STEPS[step]}</span>
              <span style={styles.progressPct}>{progress}%</span>
            </div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Done */}
        {done && (
          <div style={styles.doneBox}>
            <div>
              <p style={styles.doneTitle}>Downloaded successfully</p>
              <p style={styles.doneSub}>{country.name} · 2021–2025</p>
            </div>
            <button onClick={reset} style={styles.resetBtn}>New report</button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorTitle}>Error</p>
            <p style={styles.errorMsg}>{error}</p>
            <button onClick={reset} style={styles.retryBtn}>Try again</button>
          </div>
        )}

        {/* Footer note */}
        <div style={styles.footer}>
          <p>
            IMF WEO indicators (GDP, inflation, fiscal, debt, current account, unemployment, govt revenue)
            are fetched directly from <strong>datamapper.imf.org</strong> — April 2026 release.
            World Bank indicators are fetched directly from <strong>api.worldbank.org</strong>.
            Where data is unavailable for a country, a placeholder is shown and the gap is disclosed in the document.
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight:       "100vh",
    background:      "#f0f4f8",
    display:         "flex",
    alignItems:      "flex-start",
    justifyContent:  "center",
    padding:         "2.5rem 1rem",
  },
  card: {
    background:   "#ffffff",
    borderRadius: 12,
    boxShadow:    "0 2px 16px rgba(26,58,92,0.08)",
    maxWidth:     680,
    width:        "100%",
    overflow:     "hidden",
  },
  header: {
    display:    "flex",
    alignItems: "stretch",
    borderBottom: "1px solid #e8eef4",
  },
  headerAccent: {
    width:      5,
    background: "#1a3a5c",
    flexShrink: 0,
  },
  headerText: {
    padding: "1.5rem 1.75rem",
  },
  title: {
    fontSize:   22,
    fontWeight: 600,
    color:      "#1a3a5c",
    margin:     "0 0 4px",
  },
  subtitle: {
    fontSize: 13,
    color:    "#64748b",
    margin:   0,
  },
  selectorWrap: {
    padding: "1.5rem 1.75rem 0",
  },
  label: {
    display:       "block",
    fontSize:      11,
    fontWeight:    600,
    color:         "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    marginBottom:  6,
  },
  select: {
    width:        "100%",
    padding:      "9px 12px",
    border:       "1px solid #cbd5e1",
    borderRadius: 7,
    fontSize:     14,
    color:        "#1a3a5c",
    background:   "#f8fafc",
    cursor:       "pointer",
  },
  infoPill: {
    display:     "flex",
    alignItems:  "center",
    gap:         10,
    margin:      "12px 1.75rem 0",
    padding:     "9px 14px",
    background:  "#f0f4f8",
    borderRadius: 8,
    flexWrap:    "wrap",
  },
  infoCountry: {
    fontSize:   13,
    fontWeight: 600,
    color:      "#1a3a5c",
  },
  infoDivider: {
    color:    "#94a3b8",
    fontSize: 13,
  },
  infoMeta: {
    fontSize: 12,
    color:    "#64748b",
  },
  contentsSummary: {
    margin:  "1.25rem 1.75rem 0",
    padding: "1rem 1.25rem",
    border:  "1px solid #e8eef4",
    borderRadius: 8,
    background: "#fafbfc",
  },
  contentsLabel: {
    fontSize:   11,
    fontWeight: 600,
    color:      "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    marginBottom: 10,
  },
  contentsGrid: {
    display:             "grid",
    gridTemplateColumns: "1fr 1fr",
    gap:                 "6px 16px",
  },
  contentsItem: {
    fontSize: 12,
    color:    "#475569",
  },
  contentsCheck: {
    color:      "#0e7a3e",
    fontWeight: 600,
  },
  btn: {
    display:      "block",
    width:        "calc(100% - 3.5rem)",
    margin:       "1.5rem 1.75rem",
    padding:      "13px",
    background:   "#1a3a5c",
    color:        "#ffffff",
    border:       "none",
    borderRadius: 8,
    fontSize:     15,
    fontWeight:   600,
    cursor:       "pointer",
    letterSpacing: "0.02em",
  },
  progressWrap: {
    margin: "1.5rem 1.75rem",
  },
  progressHeader: {
    display:         "flex",
    justifyContent:  "space-between",
    marginBottom:    8,
  },
  progressMsg: {
    fontSize: 13,
    color:    "#475569",
  },
  progressPct: {
    fontSize: 13,
    color:    "#94a3b8",
  },
  progressTrack: {
    height:       6,
    background:   "#e2e8f0",
    borderRadius: 4,
    overflow:     "hidden",
  },
  progressBar: {
    height:     "100%",
    background: "#1a3a5c",
    borderRadius: 4,
    transition: "width 0.3s ease",
  },
  doneBox: {
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "space-between",
    margin:          "1.5rem 1.75rem",
    padding:         "1rem 1.25rem",
    background:      "#f0fdf4",
    border:          "1px solid #86efac",
    borderRadius:    8,
  },
  doneTitle: {
    fontWeight: 600,
    color:      "#14532d",
    fontSize:   14,
    margin:     0,
  },
  doneSub: {
    fontSize: 12,
    color:    "#16a34a",
    margin:   "4px 0 0",
  },
  resetBtn: {
    padding:    "8px 16px",
    background: "transparent",
    border:     "1px solid #86efac",
    borderRadius: 6,
    color:      "#15803d",
    cursor:     "pointer",
    fontSize:   13,
  },
  errorBox: {
    margin:       "1.5rem 1.75rem",
    padding:      "1rem 1.25rem",
    background:   "#fef2f2",
    border:       "1px solid #fca5a5",
    borderRadius: 8,
  },
  errorTitle: {
    fontWeight: 600,
    color:      "#7f1d1d",
    fontSize:   14,
    margin:     "0 0 4px",
  },
  errorMsg: {
    fontSize: 13,
    color:    "#b91c1c",
    margin:   "0 0 10px",
  },
  retryBtn: {
    padding:    "6px 14px",
    background: "transparent",
    border:     "1px solid #fca5a5",
    borderRadius: 6,
    color:      "#b91c1c",
    cursor:     "pointer",
    fontSize:   12,
  },
  footer: {
    margin:       "0 1.75rem 1.5rem",
    padding:      "12px 14px",
    background:   "#f8fafc",
    borderRadius: 8,
    fontSize:     11,
    color:        "#94a3b8",
    lineHeight:   1.6,
  },
};
