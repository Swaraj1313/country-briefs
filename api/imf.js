// api/imf.js — Vercel serverless function
// Proxies IMF DataMapper API calls server-side to bypass browser CORS restrictions.
// The IMF API blocks localhost origins but allows server-side requests.
//
// Called as: /api/imf?indicator=NGDP_RPCH&country=IND
// Returns:   raw IMF DataMapper JSON

export default async function handler(req, res) {
  const { indicator, country } = req.query;

  if (!indicator || !country) {
    return res.status(400).json({ error: "Missing indicator or country parameter" });
  }

  // Sanitise — only allow alphanumeric + underscores
  if (!/^[A-Z0-9_]+$/i.test(indicator) || !/^[A-Z]{3}$/i.test(country)) {
    return res.status(400).json({ error: "Invalid parameter format" });
  }

  try {
    const url = `https://www.imf.org/external/datamapper/api/v1/${indicator}/${country}`;
    const upstream = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; country-briefs/1.0)",
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `IMF API returned ${upstream.status}` });
    }

    const data = await upstream.json();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
