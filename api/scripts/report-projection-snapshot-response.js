#!/usr/bin/env node
const fs = require('node:fs');

function classifyProjectionSnapshotResponse(status, body) {
  const code = typeof body?.code === 'string' ? body.code : 'UNKNOWN_ERROR';
  if (status === 200 || status === 201) {
    return {
      ok: true,
      message: `Snapshot ${body.snapshotId}: ${body.alreadyCompleted ? 'already completed (upstream fetch skipped)' : body.created ? 'created' : 'idempotent retry'}; rows=${body.rowCount}; provenance=${body.provenance}`,
    };
  }
  if ([401, 403, 404].includes(status)) {
    return {
      ok: false,
      title: 'Endpoint/auth mismatch',
      message: `Capture returned HTTP ${status} (${code}) after health passed. Stop and inspect endpoint/runtime configuration; no retry will run.`,
    };
  }
  if (status === 409) {
    if (code === 'SNAPSHOT_CONFLICT') {
      return {
        ok: false,
        title: 'Immutable snapshot conflict',
        message: 'The coordinate already contains different immutable evidence. No overwrite or retry was attempted.',
      };
    }
    if (code === 'WINDOW_CLOSED') {
      return {
        ok: false,
        title: 'Exact capture window closed',
        message: 'The API refused late exact evidence. Do not retry as exact; use reconstructed provenance only through an owner-approved recovery.',
      };
    }
    if (code === 'WINDOW_NOT_OPEN') {
      return {
        ok: false,
        title: 'Exact capture window not open',
        message: 'The API rejected an early exact capture. Verify clock and cutoff coordinates; no retry was attempted.',
      };
    }
    if (code === 'CALENDAR_MISMATCH') {
      return {
        ok: false,
        title: 'Snapshot calendar mismatch',
        message: 'The requested season/week/cutoff disagrees with the configured calendar. Correct configuration before retrying.',
      };
    }
    return {
      ok: false,
      title: 'Snapshot request conflict',
      message: `Capture returned HTTP 409 (${code}); inspect the API error before deciding whether any retry is safe.`,
    };
  }
  return {
    ok: false,
    title: 'Snapshot API error',
    message: `Capture returned HTTP ${status} (${code}); no post-window retry will run.`,
  };
}

function readBody(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

if (require.main === module) {
  const status = Number(process.argv[2]);
  const result = classifyProjectionSnapshotResponse(status, readBody(process.argv[3]));
  if (result.ok) {
    console.log(result.message);
  } else {
    console.error(`::error title=${result.title}::${result.message}`);
    process.exitCode = 1;
  }
}

module.exports = { classifyProjectionSnapshotResponse };
