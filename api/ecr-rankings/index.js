// Direct FantasyPros ECR integration, adapted from the proven Draft Assistant proxy.
// Provenance: the selected scoring page on fantasypros.com; no other ranking feed is relabeled.
const { FANTASYPROS_ROS_URLS } = require('./urls');

const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

module.exports = async function (context, req) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=3600',
  };

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers };
    return;
  }

  try {
    const requestedScoring = String(req.query?.scoring || 'ppr').toLowerCase();
    const scoring = ['ppr', 'half', 'standard'].includes(requestedScoring)
      ? requestedScoring
      : 'ppr';
    const cached = cache.get(scoring);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      context.res = {
        status: 200,
        headers: { ...headers, 'X-Cache': 'HIT' },
        body: JSON.stringify(cached.data),
      };
      return;
    }

    // FantasyPros has separate preseason/draft and in-season rest-of-season pages.
    // Waiver values must use the ROS pages; the draft URLs redirect to consensus cheat sheets.
    const sourceUrl = FANTASYPROS_ROS_URLS[scoring];
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    });
    if (!response.ok) {
      context.res = {
        status: 502,
        headers,
        body: JSON.stringify({ error: `FantasyPros returned ${response.status}` }),
      };
      return;
    }

    const html = await response.text();
    const ecrStart = html.indexOf('var ecrData');
    const jsonStart = ecrStart === -1 ? -1 : html.indexOf('{', ecrStart);
    const jsonEnd = jsonStart === -1 ? -1 : html.indexOf(';\n', jsonStart + 1);
    if (jsonStart === -1 || jsonEnd === -1) {
      context.res = {
        status: 502,
        headers,
        body: JSON.stringify({ error: 'FantasyPros ECR data was not present in the response' }),
      };
      return;
    }

    let ecrData;
    try {
      ecrData = JSON.parse(html.substring(jsonStart, jsonEnd));
    } catch {
      context.res = {
        status: 502,
        headers,
        body: JSON.stringify({ error: 'FantasyPros ECR data could not be parsed' }),
      };
      return;
    }

    const rawPlayers = Array.isArray(ecrData.players) ? ecrData.players : [];
    const eligible = rawPlayers
      .filter((player) => ['QB', 'RB', 'WR', 'TE'].includes(player.player_position_id))
      .map((player) => ({
        name: player.player_name,
        position: player.player_position_id,
        team: player.player_team_id || '',
        rank: Number(player.rank_ecr),
      }))
      .filter((player) => player.name && Number.isFinite(player.rank) && player.rank > 0);
    const maxRank = Math.max(0, ...eligible.map((player) => player.rank));
    const players = eligible.map((player) => ({
      ...player,
      // Waiver math expects higher values to rank first. Keep the real ECR rank separately.
      value: maxRank - player.rank + 1,
    }));
    const data = {
      players,
      scoring,
      sourceUrl,
      fetchedAt: new Date().toISOString(),
    };
    cache.set(scoring, { data, timestamp: Date.now() });
    context.res = {
      status: 200,
      headers: { ...headers, 'X-Cache': 'MISS' },
      body: JSON.stringify(data),
    };
  } catch (error) {
    context.res = {
      status: 500,
      headers,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};
