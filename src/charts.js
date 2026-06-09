// ─── CANVAS CHART RENDERER ───────────────────────────────────────────────────
// Renders to an offscreen canvas and returns a base64 PNG data URL.
// Used by the docx builder — no React dependency.
// Handles: missing data placeholder, actuals line, projection dashed tail,
//          forecast shaded zone, zero line, period mean reference line.
// ─────────────────────────────────────────────────────────────────────────────

const P = { t: 40, r: 32, b: 48, l: 64 };

function pad(vals) {
  if (vals.length < 2) return { yMin: -1, yMax: 1 };
  const mn  = Math.min(...vals);
  const mx  = Math.max(...vals);
  const rng = (mx - mn) * 0.20 || Math.abs(mx) * 0.2 || 1;
  return { yMin: mn - rng, yMax: mx + rng };
}

// ── Single-series line chart ──────────────────────────────────────────────────
export function renderLineChart(data, opts = {}) {
  const {
    title  = "",
    unit   = "%",
    color  = "#1a3a5c",
    width  = 980,
    height = 290,
  } = opts;

  const canvas = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const W   = width  - P.l - P.r;
  const H   = height - P.t - P.b;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // No-data placeholder
  if (!data || data.length < 2) {
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(P.l, P.t, W, H);
    ctx.fillStyle = "#aaaaaa";
    ctx.font      = "13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Data not available from IMF WEO / World Bank for this country", P.l + W / 2, P.t + H / 2);
    if (title) drawTitle(ctx, title, P.l, 26);
    return canvas.toDataURL("image/png");
  }

  const vals         = data.map(d => d.value);
  const { yMin, yMax } = pad(vals);
  const yR           = yMax - yMin;
  const xs           = i => P.l + (i / Math.max(data.length - 1, 1)) * W;
  const ys           = v => P.t + H - ((v - yMin) / yR) * H;
  const fcIdx        = data.findIndex(d => d.isForecast);
  const lastActIdx   = fcIdx > 0 ? fcIdx - 1 : data.length - 1;

  // Grid lines
  for (let g = 0; g <= 5; g++) {
    const y   = P.t + (g / 5) * H;
    const val = yMax - (g / 5) * yR;
    ctx.strokeStyle = "#eeeeee"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(P.l + W, y); ctx.stroke();
    ctx.fillStyle = "#999999"; ctx.font = "11px Arial"; ctx.textAlign = "right";
    ctx.fillText(val.toFixed(1) + (unit === "USD" ? "" : unit), P.l - 6, y + 4);
  }

  // Zero line
  if (yMin < 0 && yMax > 0) {
    const y0 = ys(0);
    ctx.strokeStyle = "#cccccc"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(P.l, y0); ctx.lineTo(P.l + W, y0); ctx.stroke();
  }

  // Mean reference line (actuals only)
  const actualsVals = data.filter(d => !d.isForecast).map(d => d.value);
  if (actualsVals.length >= 2) {
    const mean = actualsVals.reduce((s, v) => s + v, 0) / actualsVals.length;
    const ym   = ys(mean);
    ctx.setLineDash([4, 3]); ctx.strokeStyle = "#cccccc"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(P.l, ym); ctx.lineTo(P.l + W, ym); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#aaaaaa"; ctx.font = "10px Arial"; ctx.textAlign = "left";
    ctx.fillText("Period mean", P.l + 4, ym - 4);
  }

  // Forecast shading
  if (fcIdx > 0) {
    const x1 = xs(fcIdx);
    const x2 = P.l + W;
    ctx.fillStyle = "rgba(255, 244, 210, 0.8)";
    ctx.fillRect(x1, P.t, x2 - x1, H);
    ctx.strokeStyle = "#d4a820"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x1, P.t); ctx.lineTo(x1, P.t + H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#9a7000"; ctx.font = "10px Arial"; ctx.textAlign = "center";
    ctx.fillText("IMF projection →", x1 + (x2 - x1) / 2, P.t + 13);
  }

  // Area fill under actuals
  ctx.beginPath();
  ctx.moveTo(xs(0), ys(data[0].value));
  for (let i = 1; i <= lastActIdx; i++) ctx.lineTo(xs(i), ys(data[i].value));
  ctx.lineTo(xs(lastActIdx), P.t + H);
  ctx.lineTo(xs(0), P.t + H);
  ctx.closePath();
  ctx.fillStyle = color + "1a";
  ctx.fill();

  // Actuals line
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
  for (let i = 0; i <= lastActIdx; i++)
    i === 0 ? ctx.moveTo(xs(i), ys(data[i].value)) : ctx.lineTo(xs(i), ys(data[i].value));
  ctx.stroke();

  // Projection line (dashed, faded)
  if (fcIdx > 0) {
    ctx.beginPath(); ctx.strokeStyle = color + "99"; ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    // Connect last actual to first forecast
    ctx.moveTo(xs(lastActIdx), ys(data[lastActIdx].value));
    for (let i = fcIdx; i < data.length; i++)
      ctx.lineTo(xs(i), ys(data[i].value));
    ctx.stroke(); ctx.setLineDash([]);
  }

  // Data points
  data.forEach((d, i) => {
    ctx.beginPath();
    ctx.arc(xs(i), ys(d.value), d.isForecast ? 2.5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle   = d.isForecast ? color + "66" : color;
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5;
    ctx.fill(); ctx.stroke();
  });

  // Axes
  ctx.strokeStyle = "#dddddd"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(P.l, P.t); ctx.lineTo(P.l, P.t + H); ctx.lineTo(P.l + W, P.t + H); ctx.stroke();

  // X-axis labels
  ctx.fillStyle = "#888888"; ctx.font = "11px Arial"; ctx.textAlign = "center";
  const step = Math.max(1, Math.floor(data.length / 9));
  data.forEach((d, i) => {
    if (i % step === 0 || i === data.length - 1)
      ctx.fillText(d.year, xs(i), P.t + H + 17);
  });

  // Y-axis unit label
  if (unit && unit !== "%") {
    ctx.save();
    ctx.translate(14, P.t + H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#aaaaaa"; ctx.font = "10px Arial"; ctx.textAlign = "center";
    ctx.fillText(unit, 0, 0);
    ctx.restore();
  }

  if (title) drawTitle(ctx, title, P.l, 26);
  return canvas.toDataURL("image/png");
}

// ── Dual-series line chart ────────────────────────────────────────────────────
export function renderDualLineChart(data1, data2, opts = {}) {
  const {
    label1 = "Series 1",
    label2 = "Series 2",
    color1 = "#1a3a5c",
    color2 = "#b91c1c",
    unit   = "%",
    title  = "",
    width  = 980,
    height = 290,
  } = opts;

  const canvas = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const W   = width  - P.l - P.r;
  const H   = height - P.t - P.b;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const has1 = data1 && data1.length >= 2;
  const has2 = data2 && data2.length >= 2;

  if (!has1 && !has2) {
    ctx.fillStyle = "#f5f5f5"; ctx.fillRect(P.l, P.t, W, H);
    ctx.fillStyle = "#aaaaaa"; ctx.font = "13px Arial"; ctx.textAlign = "center";
    ctx.fillText("Data not available for this country / period", P.l + W / 2, P.t + H / 2);
    if (title) drawTitle(ctx, title, P.l, 26);
    return canvas.toDataURL("image/png");
  }

  const allYears = [...new Set([
    ...(has1 ? data1.map(d => d.year) : []),
    ...(has2 ? data2.map(d => d.year) : []),
  ])].sort((a, b) => a - b);

  const n    = allYears.length;
  const xs   = i => P.l + (i / Math.max(n - 1, 1)) * W;
  const xsY  = y => xs(allYears.indexOf(y));

  const allV = [
    ...(has1 ? data1.map(d => d.value) : []),
    ...(has2 ? data2.map(d => d.value) : []),
  ];
  const { yMin, yMax } = pad(allV);
  const yR  = yMax - yMin;
  const ys  = v => P.t + H - ((v - yMin) / yR) * H;

  // Grid
  for (let g = 0; g <= 5; g++) {
    const y = P.t + (g / 5) * H, val = yMax - (g / 5) * yR;
    ctx.strokeStyle = "#eeeeee"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(P.l + W, y); ctx.stroke();
    ctx.fillStyle = "#999999"; ctx.font = "11px Arial"; ctx.textAlign = "right";
    ctx.fillText(val.toFixed(1) + (unit === "USD" ? "" : unit), P.l - 6, y + 4);
  }

  // Zero line
  if (yMin < 0 && yMax > 0) {
    const y0 = ys(0);
    ctx.strokeStyle = "#cccccc"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(P.l, y0); ctx.lineTo(P.l + W, y0); ctx.stroke();
  }

  // Draw each series
  [[data1, color1, has1], [data2, color2, has2]].forEach(([data, color, has]) => {
    if (!has) return;
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
    data.forEach((d, i) => {
      const x = xsY(d.year);
      const y = ys(d.value);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    data.forEach(d => {
      ctx.beginPath();
      ctx.arc(xsY(d.year), ys(d.value), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5;
      ctx.fill(); ctx.stroke();
    });
  });

  // Axes
  ctx.strokeStyle = "#dddddd"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(P.l, P.t); ctx.lineTo(P.l, P.t + H); ctx.lineTo(P.l + W, P.t + H); ctx.stroke();

  // X labels
  ctx.fillStyle = "#888888"; ctx.font = "11px Arial"; ctx.textAlign = "center";
  const step = Math.max(1, Math.floor(n / 9));
  allYears.forEach((y, i) => { if (i % step === 0 || i === n - 1) ctx.fillText(y, xs(i), P.t + H + 17); });

  // Legend
  const legendY = P.t + H + 34;
  [[label1, color1], [label2, color2]].forEach(([lbl, col], idx) => {
    const lx = P.l + idx * 200;
    ctx.fillStyle = col; ctx.fillRect(lx, legendY - 8, 14, 10);
    ctx.fillStyle = "#555555"; ctx.font = "11px Arial"; ctx.textAlign = "left";
    ctx.fillText(lbl, lx + 18, legendY);
  });

  if (title) drawTitle(ctx, title, P.l, 26);
  return canvas.toDataURL("image/png");
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function drawTitle(ctx, title, x, y) {
  ctx.fillStyle = "#333333"; ctx.font = "bold 13px Arial"; ctx.textAlign = "left";
  ctx.fillText(title, x, y);
}
