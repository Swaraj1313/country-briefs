// ─── WORD DOCUMENT BUILDER ───────────────────────────────────────────────────
// Assembles the 5-page Country at a Glance .docx using the docx library.
// All layout decisions are here — stats.js and charts.js are pure data/render.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, PageBreak,
  HeadingLevel, UnderlineType, LevelFormat,
} from "docx";
import { saveAs } from "file-saver";
import { computeStats, generateStatNotes, generateDataGaps } from "./stats";
import { renderLineChart, renderDualLineChart } from "./charts";
import { IMF_INDICATORS, WB_SERIES, WB_SNAPSHOTS, ACTUALS_START, ACTUALS_END } from "./config";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAVY   = "1a3a5c";
const SLATE  = "475569";
const LIGHT  = "f0f4f8";
const WHITE  = "ffffff";
const GOLD   = "c2790a";
const RED    = "b91c1c";
const GREEN  = "0e7a3e";
const PURPLE = "6d28d9";

// ── Helpers ───────────────────────────────────────────────────────────────────
const run   = (text, opts = {}) => new TextRun({ text, font: "Calibri", size: opts.size ?? 20, ...opts });
const bold  = (text, opts = {}) => run(text, { bold: true, ...opts });
const para  = (children, opts = {}) => new Paragraph({ children, ...opts });
const pb    = () => para([new PageBreak()]);
const space = (pts = 80) => para([], { spacing: { before: pts } });

const h1 = (text, color = NAVY) => para([bold(text, { size: 26, color })], {
  spacing: { before: 200, after: 80 },
  border:  { bottom: { style: BorderStyle.SINGLE, size: 6, color: LIGHT } },
});

const h2 = (text, color = NAVY) => para([bold(text, { size: 22, color })], {
  spacing: { before: 160, after: 60 },
});

const h3 = text => para([bold(text, { size: 19, color: SLATE })], {
  spacing: { before: 100, after: 40 },
});

function chartPara(dataUrl, w = 580, h = 200) {
  if (!dataUrl) return space(80);
  const data = dataUrl.split(",")[1];
  return para([new ImageRun({ data, transformation: { width: w, height: h }, type: "png" })],
    { spacing: { before: 60, after: 60 } });
}

function naBadge()     { return run("n/a", { color: "aaaaaa", size: 18 }); }
function fmtVal(v, unit) {
  if (v === null || v === undefined || isNaN(v)) return null;
  const n = parseFloat(v);
  if (unit === "USD") return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (unit === "millions") return `${(n / 1e6).toFixed(2)}M`;
  return `${n.toFixed(1)}${unit.startsWith("%") ? "%" : " " + unit}`;
}

// ── Stat summary table (actuals only, 2021–2025) ──────────────────────────────
function buildStatTable(allData, allIndicators) {
  const COL_WIDTHS = [2200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 900];

  const headerCells = [
    "Indicator", "Latest\n(2025)", "Prior Year\n(2024)", "YoY\n(pp)", "Period Avg\n(21–25)",
    "Std Dev", "Min (year)", "Max (year)", "n obs",
  ].map((txt, i) => new TableCell({
    width:    { size: COL_WIDTHS[i], type: WidthType.DXA },
    shading:  { type: ShadingType.SOLID, color: NAVY },
    children: [para([bold(txt, { size: 16, color: WHITE })], { alignment: AlignmentType.CENTER })],
  }));

  const rows = [new TableRow({ children: headerCells, tableHeader: true })];

  allIndicators.forEach(({ key, label, unit }, rowIdx) => {
    const data = allData[key];
    const s    = data && data.length >= 2 ? computeStats(data) : null;

    const shade = rowIdx % 2 === 0 ? LIGHT : WHITE;
    const cell  = (content, align = AlignmentType.CENTER) => new TableCell({
      width:    { size: COL_WIDTHS[0], type: WidthType.DXA },
      shading:  { type: ShadingType.SOLID, color: shade },
      children: [para([content], { alignment: align, spacing: { before: 40, after: 40 } })],
    });

    const cv = (val, u) => val !== null && val !== undefined ? run(fmtVal(val, u) ?? "n/a", { size: 18 }) : naBadge();

    rows.push(new TableRow({
      children: [
        new TableCell({
          width:    { size: COL_WIDTHS[0], type: WidthType.DXA },
          shading:  { type: ShadingType.SOLID, color: shade },
          children: [para([bold(label, { size: 18 })], { spacing: { before: 40, after: 40 } })],
        }),
        ...([
          s ? cv(s.latest?.value, unit) : naBadge(),
          s ? cv(s.prev?.value, unit)   : naBadge(),
          s?.yoy !== null && s?.yoy !== undefined
            ? run(`${s.yoy > 0 ? "+" : ""}${s.yoy.toFixed(1)}`, { size: 18, color: s.yoy > 0 ? GREEN : s.yoy < 0 ? RED : SLATE })
            : naBadge(),
          s ? cv(s.mean, unit) : naBadge(),
          s ? run(`±${s.std.toFixed(2)}`, { size: 18 }) : naBadge(),
          s ? run(`${fmtVal(s.min, unit)} (${s.minYear})`, { size: 18 }) : naBadge(),
          s ? run(`${fmtVal(s.max, unit)} (${s.maxYear})`, { size: 18 }) : naBadge(),
          s ? run(`${s.n}`, { size: 18 }) : naBadge(),
        ].map((content, i) => new TableCell({
          width:    { size: COL_WIDTHS[i + 1], type: WidthType.DXA },
          shading:  { type: ShadingType.SOLID, color: shade },
          children: [para([content], { alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 } })],
        }))),
      ],
    }));
  });

  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

// ── Snapshot panel (point-in-time WB indicators) ──────────────────────────────
function buildSnapshotTable(snapshots) {
  const rows = [];
  const pairs = [];
  for (let i = 0; i < WB_SNAPSHOTS.length; i += 2)
    pairs.push([WB_SNAPSHOTS[i], WB_SNAPSHOTS[i + 1]]);

  pairs.forEach(([a, b]) => {
    const sa = snapshots[a.key];
    const sb = b ? snapshots[b.key] : null;

    const mkCell = (meta, snap, shade) => {
      if (!meta) return new TableCell({
        width:    { size: 4500, type: WidthType.DXA },
        shading:  { type: ShadingType.SOLID, color: shade },
        children: [para([])],
      });
      const valStr = snap?.value !== null && snap?.value !== undefined
        ? `${fmtVal(snap.value, meta.unit)}${snap.year ? ` (${snap.year})` : ""}`
        : "n/a";
      return new TableCell({
        width:    { size: 4500, type: WidthType.DXA },
        shading:  { type: ShadingType.SOLID, color: shade },
        children: [
          para([bold(`${meta.label}:  `, { size: 18 }), run(valStr, { size: 18, color: SLATE })],
            { spacing: { before: 50, after: 50 } }),
        ],
      });
    };

    rows.push(new TableRow({
      children: [mkCell(a, sa, LIGHT), mkCell(b ?? null, sb, WHITE)],
    }));
  });

  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function buildAndDownload(country, allData, meta, snapshots) {
  const ALL_SERIES_META = [
    ...IMF_INDICATORS.map(d => ({ key: d.key, label: d.label, unit: d.unit, source: "IMF WEO" })),
    ...WB_SERIES.map(d => ({ key: d.key, label: d.label, unit: d.unit, source: "World Bank" })),
  ];

  // ── Render charts ──────────────────────────────────────────────────────────
  const charts = {};

  IMF_INDICATORS.forEach(ind => {
    if (!ind.showChart) return;
    charts[ind.key] = renderLineChart(allData[ind.key] ?? [], {
      title: `${ind.label} (${ind.unitLabel})`,
      unit:  ind.unit,
      color: ind.color,
    });
  });

  // Dual chart: fiscal balance + govt debt
  charts.fiscalDebt = renderDualLineChart(
    allData.fiscal ?? [], allData.debt ?? [],
    {
      title:  "Fiscal Balance & Govt Debt (% of GDP)",
      label1: "Fiscal Balance (% GDP)",
      label2: "Govt Gross Debt (% GDP)",
      color1: "#c2790a",
      color2: "#6d28d9",
    }
  );

  // Dual chart: debt service % exports + % GNI
  charts.debtService = renderDualLineChart(
    allData.debtServiceExports ?? [], allData.debtServiceGNI ?? [],
    {
      title:  "Debt Service Indicators",
      label1: "% of Exports",
      label2: "% of GNI",
      color1: "#dc2626",
      color2: "#ea580c",
    }
  );

  const notes = generateStatNotes(allData, ALL_SERIES_META);
  const gaps  = generateDataGaps(allData, ALL_SERIES_META.concat(
    WB_SNAPSHOTS.map(s => ({ key: s.key, label: s.label, unit: s.unit, source: "World Bank" }))
  ));

  // ── Build document ────────────────────────────────────────────────────────
  const doc = new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 260 } } } }],
      }],
    },
    sections: [{
      properties: { page: { margin: { top: 800, right: 900, bottom: 800, left: 900 } } },
      children: [

        // ══ PAGE 1: COVER ══════════════════════════════════════════════════
        space(800),
        para([bold("COUNTRY AT A GLANCE", { size: 48, color: NAVY })], { alignment: AlignmentType.CENTER }),
        space(120),
        para([bold(country.name.toUpperCase(), { size: 56, color: NAVY })], { alignment: AlignmentType.CENTER }),
        space(80),
        para([run(`Macroeconomic Statistical Summary  ·  ${ACTUALS_START}–${ACTUALS_END}`, { size: 24, color: SLATE })], { alignment: AlignmentType.CENTER }),
        space(60),
        para([run(`Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, { size: 20, color: SLATE })], { alignment: AlignmentType.CENTER }),
        space(200),
        para([run(`Data sources: IMF World Economic Outlook (April 2026)  ·  World Bank Open Data`, { size: 18, color: "aaaaaa" })], { alignment: AlignmentType.CENTER }),
        para([run(`Statistics are computed on actual observations only (2021–2025). IMF projections (2026–2029) are shown on selected charts.`, { size: 18, color: "aaaaaa" })], { alignment: AlignmentType.CENTER }),
        pb(),

        // ══ PAGE 2: CLASSIFICATION + STAT TABLE ════════════════════════════
        h1("Country Classification"),
        buildSnapshotTable(snapshots),
        space(40),
        ...(meta ? [
          para([
            bold("Income group:  ", { size: 20 }), run(meta.incomeLevel, { size: 20 }),
            run("    Region:  ", { size: 20 }), run(meta.region, { size: 20 }),
            run("    Lending type:  ", { size: 20 }), run(meta.lendingType, { size: 20 }),
            run("    Capital:  ", { size: 20 }), run(meta.capitalCity, { size: 20 }),
          ], { spacing: { before: 100, after: 80 } }),
        ] : []),

        h1("Statistical Summary  —  2021 to 2025"),
        para([run("All statistics computed on actual observations only. YoY = year-on-year change in percentage points.", { size: 17, color: SLATE })], { spacing: { before: 0, after: 80 } }),
        buildStatTable(allData, ALL_SERIES_META),
        pb(),

        // ══ PAGE 3: GDP · INFLATION · CURRENT ACCOUNT ═════════════════════
        h1("Economic Indicators — Growth & Prices"),
        h2("Real GDP Growth (%)"),
        chartPara(charts.gdp, 560, 195),
        h2("GDP per Capita (current USD)"),
        chartPara(charts.gdpPerCapita, 560, 195),
        h2("Inflation, CPI (%)"),
        chartPara(charts.inflation, 560, 195),
        pb(),

        // ══ PAGE 4: FISCAL · DEBT · EXTERNAL ══════════════════════════════
        h1("Fiscal & External Accounts"),
        h2("Fiscal Balance & Government Debt (% of GDP)"),
        chartPara(charts.fiscalDebt, 560, 195),
        h2("Government Revenue (% of GDP)"),
        chartPara(charts.govRevenue, 560, 195),
        h2("Current Account Balance (% of GDP)"),
        chartPara(charts.currentAccount, 560, 195),
        pb(),

        // ══ PAGE 5: DEBT SERVICE · UNEMPLOYMENT · NOTES ═══════════════════
        h1("Debt & Labour"),
        h2("Unemployment Rate (%)"),
        chartPara(charts.unemployment, 560, 185),
        h2("External Debt (% of GDP)"),
        chartPara(charts.externalDebt, 560, 185),
        h2("Debt Service Indicators"),
        chartPara(charts.debtService, 560, 185),
        pb(),

        // ══ PAGE 6: STATISTICAL NOTES + DATA NOTES ════════════════════════
        h1("Trends & Statistical Notes"),
        para([run(
          "Observations are generated from mathematical analysis of the data series only. " +
          "They flag statistical anomalies, outliers, large single-year movements, and consecutive directional trends. " +
          "No causal attribution, policy judgement, or income-group thresholds are applied.",
          { size: 18, color: SLATE }
        )], { spacing: { before: 0, after: 100 } }),
        ...notes.map(n => para(
          [run("• ", { size: 19, color: GOLD }), run(n, { size: 18 })],
          { spacing: { before: 50, after: 50 }, indent: { left: 240 } }
        )),

        space(160),
        h1("Data Notes"),
        para([bold("Available:", { size: 19 })], { spacing: { before: 40, after: 60 } }),
        ...gaps.available.map(t => para(
          [run("• ", { size: 17, color: GREEN }), run(t, { size: 17, color: SLATE })],
          { spacing: { before: 30, after: 30 }, indent: { left: 200 } }
        )),
        ...(gaps.missing.length > 0 ? [
          space(80),
          para([bold("Not available for this country:", { size: 19 })], { spacing: { before: 40, after: 60 } }),
          ...gaps.missing.map(t => para(
            [run("• ", { size: 17, color: "bbbbbb" }), run(t, { size: 17, color: "aaaaaa" })],
            { spacing: { before: 30, after: 30 }, indent: { left: 200 } }
          )),
        ] : []),

        space(120),
        para([
          run("IMF WEO indicators are sourced directly from the IMF DataMapper API (datamapper.imf.org). " +
            "World Bank indicators are sourced from the World Bank Open Data API (api.worldbank.org). " +
            "Statistics are computed on actuals (2021–2025) only. IMF projections (2026–2029) appear on selected charts as dashed lines and are not included in the statistical summary table. " +
            "Where data is unavailable for a country, a placeholder is shown and the indicator is listed above.",
            { size: 16, color: "888888" }),
        ]),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${country.name.replace(/[\s/]/g, "_")}_Country_at_a_Glance_${ACTUALS_START}_${ACTUALS_END}.docx`);
}
