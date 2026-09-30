const {
  EXACT_FETCH_DEADLINE_OFFSET_MS,
  MAX_WEEK,
  canonicalCutoffForLocalDate,
  parseIsoTimestamp,
  zonedParts,
} = require('./projectionSnapshots');

// The database permits exact captures to finish through cutoff + 15 minutes.
// Refuse to start after minute 12 so every accepted workflow attempt retains
// at least two minutes (plus the remainder of minute 12) to finish.
const LATEST_CAPTURE_START_OFFSET_MS = EXACT_FETCH_DEADLINE_OFFSET_MS;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseSeason(value) {
  const season = Number(value);
  if (!Number.isInteger(season) || season < 2000 || season > 2100) {
    throw new Error('PROJECTION_SEASON must be an integer between 2000 and 2100');
  }
  return season;
}

function parseDecisionWeek(value) {
  const decisionWeek = Number(value);
  if (!Number.isInteger(decisionWeek) || decisionWeek < 1 || decisionWeek > MAX_WEEK) {
    throw new Error(`decision week must be an integer between 1 and ${MAX_WEEK}`);
  }
  return decisionWeek;
}

function parseFirstDecisionWeek(firstDecisionWeekLocalDate, season) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(firstDecisionWeekLocalDate || '');
  if (!match) throw new Error('PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE must be YYYY-MM-DD');
  const day = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const parsed = new Date(day);
  if (
    parsed.getUTCFullYear() !== Number(match[1])
    || parsed.getUTCMonth() !== Number(match[2]) - 1
    || parsed.getUTCDate() !== Number(match[3])
    || parsed.getUTCDay() !== 2
    || parsed.getUTCFullYear() !== season
  ) {
    throw new Error('PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE must be a Tuesday in PROJECTION_SEASON');
  }
  return day;
}

function localDateFromParts(parts) {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function decisionWeekForLocalDate(localDate, firstDecisionWeekLocalDate, season) {
  const firstDay = parseFirstDecisionWeek(firstDecisionWeekLocalDate, season);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  const localDay = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const elapsedDays = (localDay - firstDay) / DAY_MS;
  if (!Number.isInteger(elapsedDays) || elapsedDays % 7 !== 0) {
    throw new Error('current Pacific date does not map to a configured decision week');
  }
  return parseDecisionWeek(elapsedDays / 7 + 1);
}

function exactStartWindow(canonicalCutoffAt, now) {
  const cutoffMs = new Date(canonicalCutoffAt).getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(cutoffMs) || !Number.isFinite(nowMs)) throw new Error('capture timing is invalid');
  if (nowMs < cutoffMs) return { allowed: false, reason: 'before-exact-window' };
  if (nowMs >= cutoffMs + LATEST_CAPTURE_START_OFFSET_MS) return { allowed: false, reason: 'late-window' };
  return { allowed: true, reason: 'inside-exact-start-window' };
}

function resolveScheduledCapture({ now = new Date(), season, firstDecisionWeekLocalDate }) {
  const parsedSeason = parseSeason(season);
  const parts = zonedParts(now);
  const localDate = localDateFromParts(parts);
  if (parts.weekday !== 'Tue') return { capture: false, reason: 'outside-pacific-window' };
  const canonicalCutoffAt = canonicalCutoffForLocalDate(localDate);
  const window = exactStartWindow(canonicalCutoffAt, now);

  if (parts.hour !== '20') {
    return { capture: false, reason: window.reason === 'late-window' ? 'late-window' : 'outside-pacific-window' };
  }
  if (!window.allowed) return { capture: false, reason: window.reason };

  let decisionWeek;
  try {
    decisionWeek = decisionWeekForLocalDate(localDate, firstDecisionWeekLocalDate, parsedSeason);
  } catch (error) {
    if (/decision week must be an integer/.test(error.message)) return { capture: false, reason: 'outside-season' };
    throw error;
  }
  return {
    capture: true,
    reason: window.reason,
    season: parsedSeason,
    decisionWeek,
    canonicalCutoffAt,
    provenance: 'exact',
  };
}

function resolveManualCapture({ now = new Date(), season, decisionWeek, canonicalCutoffAt, provenance }) {
  const result = {
    capture: true,
    reason: 'manual-reconstructed',
    season: parseSeason(season),
    decisionWeek: parseDecisionWeek(decisionWeek),
    canonicalCutoffAt: parseIsoTimestamp(canonicalCutoffAt, 'canonicalCutoffAt'),
    provenance,
  };
  if (!['exact', 'reconstructed'].includes(provenance)) throw new Error('provenance must be exact or reconstructed');
  if (provenance === 'exact') {
    const window = exactStartWindow(result.canonicalCutoffAt, now);
    if (!window.allowed) return { capture: false, reason: window.reason };
    result.reason = window.reason;
  }
  return result;
}

module.exports = {
  LATEST_CAPTURE_START_OFFSET_MS,
  decisionWeekForLocalDate,
  exactStartWindow,
  resolveManualCapture,
  resolveScheduledCapture,
};
