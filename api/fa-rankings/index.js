const { parse } = require('node-html-parser');

// In-memory cache: key = sorted serialized params, value = { data, timestamp }
const cache = new Map();
const CACHE_TTL = 86400000; // 24 hours

// Default values FA expects for all form params (zero-value ones MUST be sent)
const DEFAULTS = {
  teams: 12, bn: 4, mon: 0,
  qb: 1, rb: 2, wr: 2, te: 1,
  qrwt: 0, rwt: 1, rw: 0, wt: 0,
  patd: 4, rutd: 6, retd: 6,
  payd: 0.04, ruyd: 0.1, reyd: 0.1,
  cmp: 0, inc: 0, int: -2,
  car: 0, rec: 1, fum: -2,
};

module.exports = async function (context, req) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers };
    return;
  }

  try {
    const params = req.body;
    if (!params || !params.teams) {
      context.res = { status: 400, headers, body: JSON.stringify({ error: 'Missing required params (at minimum: teams)' }) };
      return;
    }

    // Merge incoming params with defaults (all keys must be present for FA)
    const merged = { ...DEFAULTS };
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && key in DEFAULTS) {
        merged[key] = val;
      }
    }

    // Build form-urlencoded body
    const formBody = Object.entries(merged)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    // Check cache
    const cacheKey = Object.keys(merged).sort().map(k => `${k}=${merged[k]}`).join('&');
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      context.res = {
        status: 200,
        headers: { ...headers, 'X-Cache': 'HIT' },
        body: JSON.stringify(cached.data),
      };
      return;
    }

    // POST to FA with form-urlencoded (this is what their form does)
    const faResponse = await fetch('https://footballabsurdity.com/draft-sheet/', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });

    if (!faResponse.ok) {
      context.res = { status: 502, headers, body: JSON.stringify({ error: `FA returned ${faResponse.status}` }) };
      return;
    }

    const html = await faResponse.text();
    const root = parse(html);
    const rankings = [];

    const rows = root.querySelectorAll('tr[player-pos]');
    for (const row of rows) {
      const position = (row.getAttribute('player-pos') || '').toUpperCase();
      const nameEl = row.querySelector('.player-name');
      const teamEl = row.querySelector('.team');
      const vorpEl = row.querySelector('.vorp');
      const rankEl = row.querySelector('.ln');

      if (nameEl && position) {
        const name = nameEl.text.trim();
        const team = (teamEl?.text || '').trim().toUpperCase();
        const vorp = parseFloat(vorpEl?.text || '0');
        const rank = parseInt(rankEl?.text || '0', 10);

        if (name) {
          rankings.push({ name, position, team, vorp, value: vorp, rank });
        }
      }
    }

    context.res = {
      status: 200,
      headers: { ...headers, 'X-Cache': 'MISS' },
      body: JSON.stringify({
        rankings,
        settings: merged,
      }),
    };

    // Store in cache
    cache.set(cacheKey, { data: { rankings, settings: merged }, timestamp: Date.now() });
  } catch (err) {
    context.res = { status: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
