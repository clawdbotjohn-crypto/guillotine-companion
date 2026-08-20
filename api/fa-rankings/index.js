const { parse } = require('node-html-parser');

module.exports = async function (context, req) {
  // Set CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers };
    return;
  }

  try {
    // Get params from request body
    const params = req.body;
    if (!params || !params.teams) {
      context.res = { status: 400, headers, body: JSON.stringify({ error: 'Missing required params (at minimum: teams)' }) };
      return;
    }

    // Build form data for FA POST
    // CRITICAL: ALL params must be sent, even zeros. FA returns empty page if any are missing.
    const DEFAULTS = {
      teams: '12', bn: '4', mon: '0',
      qb: '1', rb: '2', wr: '2', te: '1',
      qrwt: '0', rwt: '1', rw: '0', wt: '0',
      patd: '4.0', rutd: '6.0', retd: '6.0',
      payd: '0.04', ruyd: '0.1', reyd: '0.1',
      cmp: '0', inc: '0', int: '-2.0', car: '0',
      rec: '1.0', fum: '-2.0',
    };
    const formParams = new URLSearchParams();
    for (const [key, defaultVal] of Object.entries(DEFAULTS)) {
      const val = params[key] !== undefined && params[key] !== null ? String(params[key]) : defaultVal;
      formParams.append(key, val);
    }

    // POST to Football Absurdity (MUST be POST, not GET!)
    const faResponse = await fetch('https://footballabsurdity.com/draft-sheet/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formParams.toString(),
    });

    if (!faResponse.ok) {
      context.res = { status: 502, headers, body: JSON.stringify({ error: `FA returned ${faResponse.status}` }) };
      return;
    }

    const html = await faResponse.text();

    // Parse HTML response
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
          rankings.push({ name, position, team, vorp, rank });
        }
      }
    }

    context.res = { status: 200, headers, body: JSON.stringify({ rankings }) };
  } catch (err) {
    context.res = { status: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
