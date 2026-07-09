// tests/workflow.test.js — protocol strings, JSON parsing, validators.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACK, RESPONSES, verifyPrompt, nudgeText, parseStrictJson,
  validateTriage, validateCommit, validateStuck, validateClose,
  validateInterrupt, runTriage, runCommit
} from '../lib/workflow.js';
import { weeklyReview } from '../lib/patterns.js';

// --- Protocol strings are spec-exact (section 4 — do not drift) -------------

test('Phase 1 acknowledgment is spec-exact', () => {
  assert.equal(ACK, 'Got it. Is there more? Keep going.');
});

test('Phase 4 protocol strings match the spec', () => {
  assert.equal(RESPONSES.starting, 'Go. Come back when done or stuck.');
  assert.match(RESPONSES.procrastinating, /5 minutes of approved procrastination/);
  assert.match(RESPONSES.procrastinating, /JUST the first action/);
  assert.match(RESPONSES.procrastinating, /Set a 5-minute timer/);
});

test('verify prompt embeds the definition of done', () => {
  assert.match(verifyPrompt({ done_when: 'Test passes for fallback routing.' }),
    /Test passes for fallback routing/);
});

test('nudge is a question, not guilt', () => {
  const n = nudgeText('Fix Gazoo routing bug');
  assert.match(n, /Stuck\? Procrastinating\?/);
});

// --- Strict JSON parsing ------------------------------------------------------

test('parseStrictJson: bare object', () => {
  assert.deepEqual(parseStrictJson('{"a":1}'), { a: 1 });
});

test('parseStrictJson: fenced json', () => {
  assert.deepEqual(parseStrictJson('```json\n{"a":1}\n```'), { a: 1 });
});

test('parseStrictJson: prose-wrapped object', () => {
  assert.deepEqual(parseStrictJson('Here you go:\n{"a":1}\nHope that helps!'), { a: 1 });
});

test('parseStrictJson: garbage returns null', () => {
  assert.equal(parseStrictJson('no json here'), null);
  assert.equal(parseStrictJson('{broken'), null);
  assert.equal(parseStrictJson(''), null);
});

// --- Validators ---------------------------------------------------------------

test('validateTriage coerces bad buckets/blockers and drops empty tasks', () => {
  const items = validateTriage({
    items: [
      { task: 'a', bucket: 'TODAY', blocker: 'TOO_BIG', first_action: 'open', note: '' },
      { task: 'b', bucket: 'WHENEVER', blocker: 'LAZY', first_action: null, note: '' },
      { task: '', bucket: 'TODAY' },
      { nope: true }
    ]
  });
  assert.equal(items.length, 2);
  assert.equal(items[1].bucket, 'SOMEDAY');
  assert.equal(items[1].blocker, null);
});

test('validateCommit enforces Hard Rule 2 (max 3 substeps) and clamps estimate', () => {
  const res = validateCommit({
    pick: 0,
    reason: 'r',
    task: {
      name: 'big one',
      first_action: 'open terminal',
      done_when: 'tests pass',
      estimate_min: 9999,
      substeps: ['1', '2', '3', '4', '5']
    }
  }, [{ task: 'big one' }]);
  assert.equal(res.task.substeps.length, 3);
  assert.equal(res.task.estimate_min, 480);
});

test('validateCommit returns null on unusable output', () => {
  assert.equal(validateCommit(null, []), null);
  assert.equal(validateCommit({ task: {} }, []), null);
});

test('validateStuck falls back to smallest defaults', () => {
  const res = validateStuck({ blocker: 'NOT_A_THING', smallest_step: '' });
  assert.equal(res.blocker, 'TOO_VAGUE');
  assert.ok(res.smallest_step.length > 0);
});

test('validateClose covers every morning item; unknowns become NOT_STARTED', () => {
  const todays = [
    { task: 'Fix bug', blocker: 'TOO_BIG' },
    { task: 'Email supplier', blocker: 'NO_STAKES' }
  ];
  const res = validateClose({
    results: [{ task: 'fix bug', status: 'CLOSED', blocker: null }],
    patterns_note: 'ok',
    tomorrow_suggestion: 'Email supplier'
  }, todays);
  assert.equal(res.results.length, 2);
  assert.equal(res.results[0].status, 'CLOSED');
  assert.equal(res.results[0].blocker, null);
  assert.equal(res.results[1].status, 'NOT_STARTED');
  assert.equal(res.results[1].blocker, 'NO_STAKES'); // falls back to morning blocker
});

test('validateInterrupt keeps the raw text when the model returns junk', () => {
  const res = validateInterrupt(null, 'call the dentist');
  assert.equal(res.task, 'call the dentist');
  assert.equal(res.bucket, 'SOMEDAY');
});

// --- LLM-backed runners with a stub -------------------------------------------

test('runTriage parses and validates a stubbed response', async () => {
  const stub = async () => JSON.stringify({
    items: [{ task: 'ship it', bucket: 'TODAY', blocker: 'PERFECTIONISM', first_action: 'open repo', note: 'x' }]
  });
  const items = await runTriage(stub, 'ship it');
  assert.equal(items.length, 1);
  assert.equal(items[0].blocker, 'PERFECTIONISM');
});

test('runCommit survives a fenced response', async () => {
  const stub = async () => '```json\n{"pick":0,"reason":"r","task":{"name":"a","first_action":"open","done_when":"done","estimate_min":25,"substeps":[]}}\n```';
  const res = await runCommit(stub, [{ task: 'a' }]);
  assert.equal(res.task.name, 'a');
  assert.deepEqual(res.task.substeps, []);
});

// --- Weekly review -------------------------------------------------------------

test('weeklyReview counts recent blockers and proposes exactly one change', () => {
  const day = new Date().toISOString().slice(0, 10);
  const patterns = [
    { day, task: 'a', blocker: 'NO_STAKES' },
    { day, task: 'b', blocker: 'NO_STAKES' },
    { day, task: 'c', blocker: 'TOO_BIG' },
    { day: '2020-01-01', task: 'old', blocker: 'WAITING' }
  ];
  const wr = weeklyReview(patterns);
  assert.equal(wr.totalStalls, 3);
  assert.equal(wr.top[0].blocker, 'NO_STAKES');
  assert.ok(wr.proposedChange);
});
