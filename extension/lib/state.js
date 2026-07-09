// lib/state.js — single source of truth for LOOP state.
// All state transitions go through the pure functions below (no direct
// mutation anywhere else — CLAUDE.md file-organization rule). The Store
// class is a thin persistence wrapper around chrome.storage.local, with
// the storage object injected so tests can pass an in-memory shim.

export const PHASES = ['DUMP', 'TRIAGE', 'FOCUS', 'CLOSE'];
export const BUCKETS = ['TODAY', 'WEEK', 'SOMEDAY', 'DELETE'];
export const BLOCKERS = [
  'TOO_VAGUE', 'TOO_BIG', 'PERFECTIONISM', 'CONTEXT_SWITCH',
  'WAITING', 'LOW_ENERGY', 'NO_STAKES'
];

export const DEFAULT_SETTINGS = {
  provider: 'anthropic',            // anthropic | openai | ollama
  apiKey: '',
  model: '',                        // blank = provider default
  ollamaUrl: 'http://localhost:11434',
  dumpTime: '07:00',
  closeTime: '17:00',
  nudges: true
};

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function blankDay() {
  return {
    day: today(),
    phase: 'DUMP',
    dumpBuffer: [],       // raw dump chunks, in order
    triage: [],           // [{task, bucket, blocker, first_action, note}]
    currentTask: null,    // {name, first_action, done_when, estimate_min, substeps, started_at}
    closed: [],           // task names closed today
    checkins: [],         // [{t, type, text}] type: starting|done|stuck|procrastinating|note
    nudge: null,          // {reason, t} — set by background worker, cleared by sidebar
    lastActivity: Date.now()
  };
}

// ---------------------------------------------------------------------------
// Pure transition functions. Each takes state, returns a NEW state object.
// ---------------------------------------------------------------------------

export function addDump(state, text) {
  const chunk = String(text || '').trim();
  if (!chunk) return state;
  return touch({ ...state, dumpBuffer: [...state.dumpBuffer, chunk] });
}

export function setTriage(state, items) {
  return touch({ ...state, phase: 'TRIAGE', triage: items });
}

export function cycleBucket(state, index) {
  const triage = state.triage.map((item, i) => {
    if (i !== index) return item;
    const next = BUCKETS[(BUCKETS.indexOf(item.bucket) + 1) % BUCKETS.length];
    return { ...item, bucket: next };
  });
  return touch({ ...state, triage });
}

export function commit(state, task) {
  return touch({
    ...state,
    phase: 'FOCUS',
    currentTask: { ...task, started_at: Date.now() },
    checkins: [...state.checkins, entry('committed', task.name)]
  });
}

export function checkin(state, type, text = '') {
  return touch({ ...state, checkins: [...state.checkins, entry(type, text)] });
}

export function closeCurrentTask(state) {
  if (!state.currentTask) return state;
  return touch({
    ...state,
    closed: [...state.closed, state.currentTask.name],
    currentTask: null,
    checkins: [...state.checkins, entry('closed', state.currentTask.name)]
  });
}

export function remainingToday(state) {
  return state.triage.filter(
    (i) => i.bucket === 'TODAY' && !state.closed.includes(i.task)
      && !(state.currentTask && state.currentTask.name === i.task)
  );
}

export function startClose(state) {
  return touch({ ...state, phase: 'CLOSE' });
}

export function setNudge(state, reason) {
  return { ...state, nudge: { reason, t: Date.now() } };
}

export function clearNudge(state) {
  return { ...state, nudge: null };
}

// Finalize the day. Returns the archived summary, pattern-log entries, and
// tomorrow's pre-seeded state (carried tasks flow into tomorrow's dump).
export function finishClose(state, results, patternsNote, tomorrowTask) {
  const carried = results
    .filter((r) => r.status !== 'CLOSED')
    .map((r) => r.task);
  const patternEntries = results
    .filter((r) => r.status !== 'CLOSED' && r.blocker)
    .map((r) => ({ day: state.day, task: r.task, blocker: r.blocker }));
  const summary = {
    day: state.day,
    closed: results.filter((r) => r.status === 'CLOSED').length,
    carried: results.filter((r) => r.status === 'CARRIED').length,
    notStarted: results.filter((r) => r.status === 'NOT_STARTED').length,
    patternsNote: patternsNote || '',
    tomorrow: tomorrowTask || ''
  };
  const nextState = blankDay();
  nextState.dumpBuffer = [
    ...(tomorrowTask ? [`#1 CANDIDATE: ${tomorrowTask}`] : []),
    ...carried.filter((t) => t !== tomorrowTask).map((t) => `CARRIED: ${t}`)
  ];
  return { summary, patternEntries, nextState };
}

function entry(type, text) {
  return { t: Date.now(), type, text };
}

function touch(state) {
  return { ...state, lastActivity: Date.now() };
}

// ---------------------------------------------------------------------------
// Persistence wrapper. `storage` is chrome.storage.local in the extension,
// or an in-memory shim in tests: { get(null), set(obj) } returning Promises.
// ---------------------------------------------------------------------------

export class Store {
  constructor(storage) {
    this.storage = storage;
  }

  async load() {
    const data = (await this.storage.get(null)) || {};
    return {
      state: data.state || blankDay(),
      patterns: data.patterns || [],
      history: data.history || [],
      settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
      usage: data.usage || { calls: 0, inTokens: 0, outTokens: 0 }
    };
  }

  async save(partial) {
    await this.storage.set(partial);
  }

  // Called on sidebar open. If the stored day is stale, archive it and carry
  // unfinished TODAY items into a fresh day's dump buffer.
  async rollIfNewDay() {
    const { state, history } = await this.load();
    if (state.day === today()) return state;
    const carried = state.triage
      .filter((i) => i.bucket === 'TODAY' && !state.closed.includes(i.task))
      .map((i) => `CARRIED: ${i.task}`);
    const fresh = blankDay();
    fresh.dumpBuffer = carried;
    const touchedDay = state.triage.length > 0 || state.checkins.length > 0;
    const archive = touchedDay
      ? [...history, {
          day: state.day,
          closed: state.closed.length,
          carried: carried.length,
          notStarted: 0,
          patternsNote: 'Day ended without closing the loop.',
          tomorrow: ''
        }]
      : history;
    await this.save({ state: fresh, history: archive });
    return fresh;
  }
}
