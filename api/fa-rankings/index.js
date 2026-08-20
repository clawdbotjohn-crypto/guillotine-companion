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

    // Build query string for FA GET request
    // FA's POST endpoint is broken (WordPress caching strips POST body),
    // but GET returns the page with rankings using default settings.
    // The page reads cookie 'draftsheetForm' for custom settings on the client side.
    // Since we're server-side, we use GET and the VoRP values will be from FA's
    // default settings (10-team half-PPR). The player names, teams, and positions
    // are still accurate for matching purposes.
    //
    // NOTE: We pass league params in the URL (FA ignores them for now) and as a
    // cookie (in case FA's PHP starts reading it). This is a best-effort approach.
    const cookieData = {};
    const paramKeys = ['teams', 'bn', 'mon', 'qb', 'rb', 'wr', 'te', 'qrwt', 'rwt', 'rw', 'wt', 'patd', 'rutd', 'retd', 'payd', 'ruyd', 'reyd', 'cmp', 'inc', 'int', 'car', 'rec', 'fum'];
    for (const key of paramKeys) {
      if (params[key] !== undefined && params[key] !== null) {
        cookieData[key] = String(params[key]);
      }
    }

    // GET the draft sheet page
    const faResponse = await fetch('https://footballabsurdity.com/draft-sheet/', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': 'draftsheetForm=' + encodeURIComponent(JSON.stringify(cookieData)),
      },
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

    // Parse league settings from the page header for verification
    const leagueHeader = root.querySelector('#league-header');
    let pageSettings = {};
    if (leagueHeader) {
      const spans = leagueHeader.querySelectorAll('span > span');
      for (const span of spans) {
        const parts = span.text.trim().split('\n');
        if (parts.length === 2) {
          pageSettings[parts[0].trim()] = parts[1].trim();
        }
      }
    }

    context.res = {
      status: 200,
      headers,
      body: JSON.stringify({
        rankings,
        pageSettings,
        note: 'VoRP values use FA default settings (10-team half-PPR). Player names/teams/positions are accurate for matching.',
      }),
    };
  } catch (err) {
    context.res = { status: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
