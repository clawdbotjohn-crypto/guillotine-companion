const cache = new Map();
const CACHE_TTL = 12 * 60 * 60 * 1000;

module.exports = async function (context, req) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers };
    return;
  }

  try {
    const teams = Math.min(32, Math.max(4, Number(req.query?.teams) || 12));
    const ppr = [0, 0.5, 1].includes(Number(req.query?.ppr)) ? Number(req.query.ppr) : 1;
    const superflex = req.query?.sf === '1';
    const cacheKey = `${teams}-${ppr}-${superflex}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      context.res = { status: 200, headers: { ...headers, 'X-Cache': 'HIT' }, body: JSON.stringify(cached.data) };
      return;
    }

    const url = new URL('https://api.fantasycalc.com/values/current');
    url.search = new URLSearchParams({
      isDynasty: 'false',
      numQbs: superflex ? '2' : '1',
      numTeams: String(teams),
      ppr: String(ppr),
    }).toString();
    const response = await fetch(url, {
      headers: { 'User-Agent': 'GuillotineCompanion/1.0', Accept: 'application/json' },
    });
    if (!response.ok) {
      context.res = { status: 502, headers, body: JSON.stringify({ error: `FantasyCalc returned ${response.status}` }) };
      return;
    }

    const raw = await response.json();
    const players = (Array.isArray(raw) ? raw : [])
      .filter((item) => ['QB', 'RB', 'WR', 'TE'].includes(item.player?.position || item.position || ''))
      .map((item, index) => ({
        name: item.player?.name || item.playerName || '',
        position: item.player?.position || item.position || '',
        team: item.player?.maybeTeam || item.player?.team || item.team || '',
        sleeperId: item.player?.sleeperId ? String(item.player.sleeperId) : undefined,
        value: Number(item.value) || 0,
        rank: Number(item.overallRank) || index + 1,
      }))
      .filter((player) => player.name);
    const data = { players, scoring: ppr, teams, superflex, fetchedAt: new Date().toISOString() };
    cache.set(cacheKey, { data, timestamp: Date.now() });
    context.res = { status: 200, headers: { ...headers, 'X-Cache': 'MISS' }, body: JSON.stringify(data) };
  } catch (error) {
    context.res = { status: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
