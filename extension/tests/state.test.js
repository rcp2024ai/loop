// tests/state.test.js — the 5-phase state machine.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blankDay, addDump, setTriage, cycleBucket, commit, checkin,
  closeCurrentTask, remainingToday, finishClose, Store, today
} from '../lib/state.js';

function memStorage(initial = {}) {
  let data = { ...initial };
  return {
    async get() { return data; },
    async set(partial) { data = { ...data, ...partial }; },
    dump() { return data; }
  };
}

const item = (task, bucket = 'TODAY', blocker = 'TOO_VAGUE') =>
  ({ task, bucket, blocker, first_action: 'open it', note: '' });

test('addDump appends trimmed chunks and ignores empties', () => {
  let s = blankDay();
  s = addDump(s, '  fix the bug  ');
  s = addDump(s, '   ');
  assert.deepEqual(s.dumpBuffer, ['fix the bug']);
});

test('setTriage moves to TRIAGE phase', () => {
  const s = setTriage(blankDay(), [item('a')]);
  assert.equal(s.phase, 'TRIAGE');
  assert.equal(s.triage.length, 1);
});

test('cycleBucket walks TODAY → WEEK → SOMEDAY → DELETE → TODAY', () => {
  let s = setTriage(blankDay(), [item('a', 'TODAY')]);
  for (const expected of ['WEEK', 'SOMEDAY', 'DELETE', 'TODAY']) {
    s = cycleBucket(s, 0);
    assert.equal(s.triage[0].bucket, expected);
  }
});

test('commit enters FOCUS with a started_at timestamp', () => {
  const task = { name: 'a', first_action: 'open', done_when: 'done', estimate_min: 30, substeps: [] };
  const s = commit(setTriage(blankDay(), [item('a')]), task);
  assert.equal(s.phase, 'FOCUS');
  assert.equal(s.currentTask.name, 'a');
  assert.ok(s.currentTask.started_at > 0);
});

test('closeCurrentTask records the close and clears the slot (Hard Rule 5)', () => {
  const task = { name: 'a', first_action: 'open', done_when: 'done', estimate_min: 30, substeps: [] };
  let s = commit(setTriage(blankDay(), [item('a'), item('b')]), task);
  s = closeCurrentTask(s);
  assert.deepEqual(s.closed, ['a']);
  assert.equal(s.currentTask, null);
});

test('remainingToday excludes closed, current, and non-TODAY items', () => {
  const task = { name: 'a', first_action: 'open', done_when: 'done', estimate_min: 30, substeps: [] };
  let s = setTriage(blankDay(), [item('a'), item('b'), item('c', 'SOMEDAY')]);
  s = commit(s, task);
  assert.deepEqual(remainingToday(s).map((i) => i.task), ['b']);
  s = closeCurrentTask(s);
  assert.deepEqual(remainingToday(s).map((i) => i.task), ['b']);
});

test('finishClose: counts, pattern entries, and tomorrow pre-seed', () => {
  let s = setTriage(blankDay(), [item('a'), item('b'), item('c')]);
  const results = [
    { task: 'a', status: 'CLOSED', blocker: null },
    { task: 'b', status: 'CARRIED', blocker: 'TOO_BIG' },
    { task: 'c', status: 'NOT_STARTED', blocker: 'NO_STAKES' }
  ];
  const { summary, patternEntries, nextState } = finishClose(s, results, 'note', 'b');
  assert.equal(summary.closed, 1);
  assert.equal(summary.carried, 1);
  assert.equal(summary.notStarted, 1);
  assert.deepEqual(patternEntries.map((p) => p.blocker), ['TOO_BIG', 'NO_STAKES']);
  // Tomorrow's dump: the chosen #1 candidate first, then carried (no duplicate of b).
  assert.deepEqual(nextState.dumpBuffer, ['#1 CANDIDATE: b', 'CARRIED: c']);
  assert.equal(nextState.phase, 'DUMP');
});

test('Store.rollIfNewDay keeps a same-day state untouched', async () => {
  const storage = memStorage();
  const store = new Store(storage);
  let s = addDump(blankDay(), 'hello');
  await store.save({ state: s });
  const rolled = await store.rollIfNewDay();
  assert.deepEqual(rolled.dumpBuffer, ['hello']);
});

test('Store.rollIfNewDay archives a stale day and carries unfinished TODAY items', async () => {
  const stale = setTriage(blankDay(), [item('a'), item('b')]);
  stale.day = '2020-01-01';
  stale.closed = ['a'];
  const storage = memStorage({ state: stale, history: [] });
  const store = new Store(storage);
  const fresh = await store.rollIfNewDay();
  assert.equal(fresh.day, today());
  assert.deepEqual(fresh.dumpBuffer, ['CARRIED: b']);
  assert.equal(storage.dump().history.length, 1);
  assert.equal(storage.dump().history[0].day, '2020-01-01');
});

test('checkin appends typed entries', () => {
  const s = checkin(blankDay(), 'procrastinating', '');
  assert.equal(s.checkins.at(-1).type, 'procrastinating');
});
