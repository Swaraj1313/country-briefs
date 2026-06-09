// ─── DATA WINDOW ─────────────────────────────────────────────────────────────
export const ACTUALS_START    = 2021;
export const ACTUALS_END      = 2025;
export const PROJECTION_END   = 2029;
export const FORECAST_FROM    = 2026;

// ─── IMF DATAMAPPER — via /api/imf serverless proxy ──────────────────────────
// Direct browser fetch blocked on localhost. Proxy in api/imf.js handles it.
// All codes confirmed present in April 2026 WEO release.

export const IMF_INDICATORS = [
  {
    key:         "gdp",
    code:        "NGDP_RPCH",
    label:       "Real GDP Growth",
    unit:        "%",
    unitLabel:   "Annual % change",
    color:       "#1a3a5c",
    showChart:   true,
    showProj:    true,   // projection tail on chart
    tableOrder:  1,
  },
  {
    key:         "gdpPerCapita",
    code:        "NGDPDPC",
    label:       "GDP per Capita",
    unit:        "USD",
    unitLabel:   "Current USD",
    color:       "#2563a8",
    showChart:   true,
    showProj:    true,
    tableOrder:  2,
  },
  {
    key:         "inflation",
    code:        "PCPIPCH",
    label:       "Inflation, CPI",
    unit:        "%",
    unitLabel:   "Annual % change",
    color:       "#b91c1c",
    showChart:   true,
    showProj:    true,
    tableOrder:  3,
  },
  {
    key:         "fiscal",
    code:        "GGXCNL_NGDP",
    label:       "Fiscal Balance",
    unit:        "% GDP",
    unitLabel:   "% of GDP",
    color:       "#c2790a",
    showChart:   true,
    showProj:    true,
    tableOrder:  4,
  },
  {
    key:         "govRevenue",
    code:        "GGR_NGDP",
    label:       "Govt Revenue",
    unit:        "% GDP",
    unitLabel:   "% of GDP",
    color:       "#0f766e",
    showChart:   true,
    showProj:    false,  // patchy projection coverage
    tableOrder:  5,
  },
  {
    key:         "debt",
    code:        "GGXWDG_NGDP",
    label:       "Govt Gross Debt",
    unit:        "% GDP",
    unitLabel:   "% of GDP",
    color:       "#6d28d9",
    showChart:   true,
    showProj:    true,
    tableOrder:  6,
  },
  {
    key:         "currentAccount",
    code:        "BCA_NGDPD",
    label:       "Current Account",
    unit:        "% GDP",
    unitLabel:   "% of GDP",
    color:       "#0e7a3e",
    showChart:   true,
    showProj:    true,
    tableOrder:  7,
  },
  {
    key:         "unemployment",
    code:        "LUR",
    label:       "Unemployment Rate",
    unit:        "%",
    unitLabel:   "% of labour force",
    color:       "#9333ea",
    showChart:   true,
    showProj:    false,  // patchy projection coverage
    tableOrder:  8,
  },
];

// ─── WORLD BANK — direct browser fetch ───────────────────────────────────────
// Base: https://api.worldbank.org/v2/country/{wbCode}/indicator/{code}?format=json&mrv=10&per_page=10
export const WB_BASE = "https://api.worldbank.org/v2";

// Time-series WB indicators (get last 5 years, show in chart + table)
export const WB_SERIES = [
  {
    key:        "debtServiceExports",
    code:       "DT.TDS.DECT.EX.ZS",
    label:      "Debt Service",
    unit:       "% Exports",
    unitLabel:  "% of exports",
    color:      "#dc2626",
    showChart:  true,
    tableOrder: 9,
  },
  {
    key:        "debtServiceGNI",
    code:       "DT.TDS.DECT.GN.ZS",
    label:      "Debt Service",
    unit:       "% GNI",
    unitLabel:  "% of GNI",
    color:      "#ea580c",
    showChart:  true,
    tableOrder: 10,
  },
  {
    key:        "externalDebt",
    code:       "DT.DOD.DECT.GD.ZS",
    label:      "External Debt",
    unit:       "% GDP",
    unitLabel:  "% of GDP",
    color:      "#0284c7",
    showChart:  true,
    tableOrder: 11,
  },
];

// Point-in-time WB indicators (latest single value only — no chart, shown in snapshot panel)
export const WB_SNAPSHOTS = [
  { key: "reserves",      code: "FI.RES.TOTL.CD",      label: "Int'l Reserves",     unit: "current USD"  },
  { key: "exchangeRate",  code: "PA.NUS.FCRF",           label: "Exchange Rate",      unit: "LCU per USD"  },
  { key: "population",    code: "SP.POP.TOTL",           label: "Population",         unit: "millions"     },
  { key: "popGrowth",     code: "SP.POP.GROW",           label: "Population Growth",  unit: "%"            },
  { key: "urbanPop",      code: "SP.URB.TOTL.IN.ZS",    label: "Urban Population",   unit: "% of total"   },
  { key: "lifeExpect",    code: "SP.DYN.LE00.IN",        label: "Life Expectancy",    unit: "years"        },
  { key: "infantMort",    code: "SP.DYN.IMRT.IN",        label: "Infant Mortality",   unit: "per 1,000"    },
  { key: "co2PerCapita",  code: "EN.ATM.CO2E.PC",        label: "CO₂ per Capita",     unit: "metric tons"  },
];

// ─── COUNTRIES ───────────────────────────────────────────────────────────────
export const COUNTRIES = [
  // South Asia
  { imf: "IND", wb: "IN",  name: "India",                region: "South Asia" },
  { imf: "BGD", wb: "BD",  name: "Bangladesh",           region: "South Asia" },
  { imf: "PAK", wb: "PK",  name: "Pakistan",             region: "South Asia" },
  { imf: "LKA", wb: "LK",  name: "Sri Lanka",            region: "South Asia" },
  { imf: "NPL", wb: "NP",  name: "Nepal",                region: "South Asia" },
  { imf: "BTN", wb: "BT",  name: "Bhutan",               region: "South Asia" },
  { imf: "MDV", wb: "MV",  name: "Maldives",             region: "South Asia" },
  { imf: "AFG", wb: "AF",  name: "Afghanistan",          region: "South Asia" },

  // Southeast Asia
  { imf: "IDN", wb: "ID",  name: "Indonesia",            region: "Southeast Asia" },
  { imf: "PHL", wb: "PH",  name: "Philippines",          region: "Southeast Asia" },
  { imf: "VNM", wb: "VN",  name: "Viet Nam",             region: "Southeast Asia" },
  { imf: "THA", wb: "TH",  name: "Thailand",             region: "Southeast Asia" },
  { imf: "MYS", wb: "MY",  name: "Malaysia",             region: "Southeast Asia" },
  { imf: "SGP", wb: "SG",  name: "Singapore",            region: "Southeast Asia" },
  { imf: "KHM", wb: "KH",  name: "Cambodia",             region: "Southeast Asia" },
  { imf: "LAO", wb: "LA",  name: "Lao PDR",              region: "Southeast Asia" },
  { imf: "MMR", wb: "MM",  name: "Myanmar",              region: "Southeast Asia" },

  // East Asia
  { imf: "CHN", wb: "CN",  name: "China",                region: "East Asia" },
  { imf: "JPN", wb: "JP",  name: "Japan",                region: "East Asia" },
  { imf: "KOR", wb: "KR",  name: "South Korea",          region: "East Asia" },
  { imf: "MNG", wb: "MN",  name: "Mongolia",             region: "East Asia" },

  // Central & West Asia
  { imf: "KAZ", wb: "KZ",  name: "Kazakhstan",           region: "Central & West Asia" },
  { imf: "UZB", wb: "UZ",  name: "Uzbekistan",           region: "Central & West Asia" },
  { imf: "GEO", wb: "GE",  name: "Georgia",              region: "Central & West Asia" },
  { imf: "ARM", wb: "AM",  name: "Armenia",              region: "Central & West Asia" },
  { imf: "AZE", wb: "AZ",  name: "Azerbaijan",           region: "Central & West Asia" },
  { imf: "KGZ", wb: "KG",  name: "Kyrgyz Republic",      region: "Central & West Asia" },
  { imf: "TJK", wb: "TJ",  name: "Tajikistan",           region: "Central & West Asia" },
  { imf: "TKM", wb: "TM",  name: "Turkmenistan",         region: "Central & West Asia" },

  // Pacific
  { imf: "PNG", wb: "PG",  name: "Papua New Guinea",     region: "Pacific" },
  { imf: "FJI", wb: "FJ",  name: "Fiji",                 region: "Pacific" },
  { imf: "WSM", wb: "WS",  name: "Samoa",                region: "Pacific" },
  { imf: "TON", wb: "TO",  name: "Tonga",                region: "Pacific" },
  { imf: "SLB", wb: "SB",  name: "Solomon Islands",      region: "Pacific" },
  { imf: "VUT", wb: "VU",  name: "Vanuatu",              region: "Pacific" },

  // Europe
  { imf: "DEU", wb: "DE",  name: "Germany",              region: "Europe" },
  { imf: "FRA", wb: "FR",  name: "France",               region: "Europe" },
  { imf: "GBR", wb: "GB",  name: "United Kingdom",       region: "Europe" },
  { imf: "ITA", wb: "IT",  name: "Italy",                region: "Europe" },
  { imf: "ESP", wb: "ES",  name: "Spain",                region: "Europe" },
  { imf: "NLD", wb: "NL",  name: "Netherlands",          region: "Europe" },
  { imf: "POL", wb: "PL",  name: "Poland",               region: "Europe" },
  { imf: "SWE", wb: "SE",  name: "Sweden",               region: "Europe" },
  { imf: "TUR", wb: "TR",  name: "Turkey",               region: "Europe" },
  { imf: "GRC", wb: "GR",  name: "Greece",               region: "Europe" },
  { imf: "NOR", wb: "NO",  name: "Norway",               region: "Europe" },
  { imf: "PRT", wb: "PT",  name: "Portugal",             region: "Europe" },

  // Americas
  { imf: "USA", wb: "US",  name: "United States",        region: "Americas" },
  { imf: "CAN", wb: "CA",  name: "Canada",               region: "Americas" },
  { imf: "BRA", wb: "BR",  name: "Brazil",               region: "Americas" },
  { imf: "MEX", wb: "MX",  name: "Mexico",               region: "Americas" },
  { imf: "COL", wb: "CO",  name: "Colombia",             region: "Americas" },
  { imf: "CHL", wb: "CL",  name: "Chile",                region: "Americas" },
  { imf: "ARG", wb: "AR",  name: "Argentina",            region: "Americas" },
  { imf: "PER", wb: "PE",  name: "Peru",                 region: "Americas" },

  // Middle East
  { imf: "SAU", wb: "SA",  name: "Saudi Arabia",         region: "Middle East" },
  { imf: "ARE", wb: "AE",  name: "UAE",                  region: "Middle East" },
  { imf: "EGY", wb: "EG",  name: "Egypt",                region: "Middle East" },
  { imf: "IRN", wb: "IR",  name: "Iran",                 region: "Middle East" },
  { imf: "IRQ", wb: "IQ",  name: "Iraq",                 region: "Middle East" },
  { imf: "JOR", wb: "JO",  name: "Jordan",               region: "Middle East" },

  // Africa
  { imf: "NGA", wb: "NG",  name: "Nigeria",              region: "Africa" },
  { imf: "ZAF", wb: "ZA",  name: "South Africa",         region: "Africa" },
  { imf: "KEN", wb: "KE",  name: "Kenya",                region: "Africa" },
  { imf: "ETH", wb: "ET",  name: "Ethiopia",             region: "Africa" },
  { imf: "GHA", wb: "GH",  name: "Ghana",                region: "Africa" },
  { imf: "MAR", wb: "MA",  name: "Morocco",              region: "Africa" },
  { imf: "TZA", wb: "TZ",  name: "Tanzania",             region: "Africa" },
  { imf: "CIV", wb: "CI",  name: "Côte d'Ivoire",        region: "Africa" },
  { imf: "CMR", wb: "CM",  name: "Cameroon",             region: "Africa" },
  { imf: "UGA", wb: "UG",  name: "Uganda",               region: "Africa" },
  { imf: "SEN", wb: "SN",  name: "Senegal",              region: "Africa" },
  { imf: "MOZ", wb: "MZ",  name: "Mozambique",           region: "Africa" },
  { imf: "ZMB", wb: "ZM",  name: "Zambia",               region: "Africa" },
  { imf: "RWA", wb: "RW",  name: "Rwanda",               region: "Africa" },
  { imf: "AGO", wb: "AO",  name: "Angola",               region: "Africa" },

  // Other Advanced
  { imf: "AUS", wb: "AU",  name: "Australia",            region: "Other Advanced" },
  { imf: "NZL", wb: "NZ",  name: "New Zealand",          region: "Other Advanced" },
];

export const REGIONS = [...new Set(COUNTRIES.map(c => c.region))];
