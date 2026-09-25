const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflow = fs.readFileSync(path.join(__dirname, '../../.github/workflows/projection-snapshot.yml'), 'utf8');

test('workflow covers PDT/PST UTC hours and gates them by Pacific local capture window', () => {
  assert.match(workflow, /cron: '0 3,4 \* \* 3'/);
  assert.match(workflow, /timeZone: 'America\/Los_Angeles'/);
  assert.match(workflow, /parts\.weekday === 'Tue'/);
  assert.match(workflow, /parts\.hour === '20'/);
  assert.match(workflow, /Number\(parts\.minute\) <= 15/);
  assert.match(workflow, /provenance = 'exact'/);
  assert.match(workflow, /PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE/);
});
