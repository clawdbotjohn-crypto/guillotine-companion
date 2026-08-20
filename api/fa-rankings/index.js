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
    const formParams = new URLSearchParams();
    const paramKeys = ['teams', 'bn', 'mon', 'qb', 'rb', 'wr', 'te', 'qrwt', 'rwt', 'rw', 'wt', 'patd', 'rutd', 'retd', 'payd', 'ruyd', 'reyd', 'cmp', 'inc', 'int', 'car', 'rec', 'fum'];
    for (const key of paramKeys) {
      if (params[key] !== undefined && params[key] !== null) {
        formParams.append(key, String(params[key]));
      }
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
