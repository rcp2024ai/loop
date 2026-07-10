// sidebar.js — the LOOP sidebar controller.
// Renders one of four views (DUMP / TRIAGE / FOCUS / CLOSE) from state,
// routes commands, and calls the workflow engine. All state changes go
// through lib/state.js transitions; all AI calls through lib/llm.js.

import {
  Store, addDump, setTriage, cycleBucket, commit, checkin,
  closeCurrentTask, remainingToday, startClose, finishClose, clearNudge
} from './lib/state.js';
import * as W from './lib/workflow.js';
import { makeLlm, LlmError } from './lib/llm.js';
import { addEntries, dnaBars } from './lib/patterns.js';
import { dnaCard } from './lib/dna-view.js';
import { attachDictation } from './lib/dictation.js';

// A realistic messy dump for the first-run "Try an example" button — the
// fastest way to show what triage does (buckets + hidden blockers) without
// making a cold new user compose their own first.
const EXAMPLE_DUMP =
  'finish the Q3 proposal, book the dentist, that podcast idea from March, ' +
  'reply to Sarah about the collab, fix the checkout bug, renew the domain, ' +
  'read the pricing book, start a YouTube channel, do my taxes';

const store = new Store(chrome.storage.local);
let db = null;            // { state, patterns, history, settings, usage }
let busy = false;
let timerId = null;
let flash = null;         // one-shot message rendered into the next view
let dictationStoppers = []; // active attachDictation() cleanup fns for this view

init();

async function init() {
  await store.rollIfNewDay();
  db = await store.load();
  document.getElementById('btn-settings').addEventListener('click', () =>
    chrome.runtime.openOptionsPage()
  );
  chrome.storage.onChanged.addListener(onStorageChanged);
  render();
}

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

function llm() {
  return makeLlm(db.settings, async (inTok, outTok) => {
    db.usage = {
      calls: db.usage.calls + 1,
      inTokens: db.usage.inTokens + inTok,
      outTokens: db.usage.outTokens + outTok
    };
    await store.save({ usage: db.usage });
  });
}

async function setState(next) {
  db.state = next;
  await store.save({ state: next });
  render();
}

function onStorageChanged(changes, area) {
  if (area !== 'local' || !changes.state) return;
  const next = changes.state.newValue;
  if (!next) return;
  // Only react to background-worker nudges; our own writes already rendered.
  if (JSON.stringify(next.nudge) !== JSON.stringify(db.state.nudge)) {
    db.state = next;
    renderNudge();
  }
}

async function guard(fn) {
  if (busy) return;
  busy = true;
  showError('');
  try {
    await fn();
  } catch (e) {
    showError(e instanceof LlmError ? e.message : `Unexpected error: ${e.message}`);
  } finally {
    busy = false;
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function render() {
  stopTimer();
  stopAllDictation();
  renderNudge();
  const v = document.getElementById('view');
  const c = document.getElementById('cmdbar');
  v.replaceChildren();
  c.replaceChildren();
  const phase = db.state.phase;
  if (phase === 'DUMP') renderDump(v, c);
  else if (phase === 'TRIAGE') renderTriage(v, c);
  else if (phase === 'FOCUS') renderFocus(v, c);
  else if (phase === 'CLOSE') renderClose(v, c);
  if (flash) {
    v.append(h('div', { class: 'toast' }, flash));
    flash = null;
  }
}

function renderNudge() {
  const n = document.getElementById('nudge');
  const nudge = db.state.nudge;
  n.replaceChildren();
  n.classList.toggle('hidden', !nudge);
  if (!nudge) return;
  n.append(
    h('div', {}, nudge.reason),
    h('button', { class: 'icon-btn', onclick: dismissNudge }, 'dismiss')
  );
}

async function dismissNudge() {
  await setState(clearNudge(db.state));
  chrome.action.setBadgeText({ text: '' });
}

function showError(msg) {
  const e = document.getElementById('error');
  e.textContent = msg;
  e.classList.toggle('hidden', !msg);
}

function showBusy(label) {
  const v = document.getElementById('view');
  v.append(h('div', { class: 'spin' }, label));
}

// Wraps a textarea with a mic button + status line so the user can dictate
// instead of typing — the whole reason this exists: typing is friction
// exactly when the point is to get thoughts out as fast as they arrive.
// Releases the mic automatically whenever the view changes (see render()).
function withDictation(textarea) {
  const status = h('div', { class: 'dictate-status' });
  const mic = h('button', { class: 'mic-btn', type: 'button', title: 'Click to dictate' }, '🎙');
  const row = h('div', { class: 'dictate-row' }, textarea, mic);
  dictationStoppers.push(attachDictation(textarea, mic, status));
  return h('div', {}, row, status);
}

function stopAllDictation() {
  for (const stop of dictationStoppers) stop();
  dictationStoppers = [];
}

// --- DUMP -------------------------------------------------------------------

function renderDump(v, c) {
  v.append(h('div', { class: 'eyebrow' }, 'Phase 1 — Brain dump'));
  const ta = h('textarea', { class: 'dump', placeholder: 'Dump everything here…' });
  // First run — never dumped, never closed a loop: show a welcome that
  // explains LOOP in one glance and offers a one-tap example.
  const firstRun = db.history.length === 0 && db.state.dumpBuffer.length === 0;
  if (firstRun) {
    v.append(welcomeCard(ta));
  } else if (db.state.dumpBuffer.length) {
    v.append(h('div', { class: 'dumplog' },
      ...db.state.dumpBuffer.map((t) => h('div', { class: 'chunk' }, t))
    ));
    v.append(h('div', { class: 'hint' }, W.ACK));
  } else {
    v.append(h('div', { class: 'hint' },
      'Everything in your head. Messy is fine. Half-sentences are fine.'));
  }
  v.append(withDictation(ta));
  c.append(
    btn('Dump', 'blue', () => {
      if (!ta.value.trim()) return;
      setState(addDump(db.state, ta.value));
    }),
    btn("That's everything →", 'primary', () => doTriage(ta.value),
      db.state.dumpBuffer.length === 0 && true)
  );
  // Enable triage button when there's anything to work with.
  const triageBtn = c.lastChild;
  const sync = () => { triageBtn.disabled = !ta.value.trim() && db.state.dumpBuffer.length === 0; };
  ta.addEventListener('input', sync);
  sync();
}

async function doTriage(pending) {
  await guard(async () => {
    let state = db.state;
    if (pending && pending.trim()) state = addDump(state, pending);
    showBusy('Decoding your dump');
    const items = await W.runTriage(llm(), state.dumpBuffer.join('\n'));
    if (!items.length) throw new LlmError('I could not parse any tasks out of that. Add a line or two and retry.');
    await setState(setTriage(state, items));
  });
  render();
}

// --- TRIAGE -----------------------------------------------------------------

function renderTriage(v, c) {
  v.append(h('div', { class: 'eyebrow' }, 'Phase 2 — Triage & decode'));
  v.append(h('div', { class: 'hint' }, 'Tap a bucket to change it. Then pick your #1.'));
  const list = h('div', { class: 'triage' });
  db.state.triage.forEach((item, i) => {
    const meta = [];
    if (item.bucket === 'TODAY' && item.blocker) {
      meta.push(h('span', { class: 'blocker-tag' }, `⚑ ${item.blocker}`));
    }
    if (item.bucket === 'TODAY' && item.first_action) {
      meta.push(h('span', {}, ' first: '), h('span', { class: 'fa' }, item.first_action));
    }
    if (item.note && item.bucket !== 'TODAY') meta.push(h('span', {}, item.note));
    list.append(
      h('div', { class: 'row' },
        h('div', { class: 'top' },
          h('div', { class: 'task' }, item.task),
          h('button', {
            class: `chip ${item.bucket}`,
            title: 'Tap to change bucket',
            onclick: () => setState(cycleBucket(db.state, i))
          }, item.bucket)
        ),
        meta.length ? h('div', { class: 'meta' }, ...meta) : null
      )
    );
  });
  v.append(list);
  const todayCount = db.state.triage.filter((x) => x.bucket === 'TODAY').length;
  c.append(
    btn('← More dump', 'ghost', () => setState({ ...db.state, phase: 'DUMP' })),
    btn(`Pick my #1 (${todayCount} today) →`, 'primary', doCommit, todayCount === 0)
  );
}

async function doCommit() {
  await guard(async () => {
    showBusy('Choosing the one that matters');
    const todays = remainingToday(db.state);
    if (!todays.length) throw new LlmError('Nothing left in TODAY. Close the loop or re-triage.');
    const res = await W.runCommit(llm(), todays);
    if (!res) throw new LlmError('The model returned something unusable. Retry.');
    await setState(commit(db.state, res.task));
  });
  render();
}

// --- FOCUS ------------------------------------------------------------------

function renderFocus(v, c) {
  const t = db.state.currentTask;
  v.append(h('div', { class: 'eyebrow' }, 'Phase 3/4 — Your #1'));
  if (!t) {
    // TODAY list exhausted.
    v.append(h('div', { class: 'response cool' },
      'TODAY list clear. Close the loop, or pull something forward.'));
    c.append(
      btn('Re-triage', 'ghost', () => setState({ ...db.state, phase: 'TRIAGE' })),
      btn('Close the loop →', 'primary', () => setState(startClose(db.state)))
    );
    return;
  }
  const card = h('div', { class: 'card' },
    h('div', { class: 'label' }, '#1 task'),
    h('div', { class: 'name' }, t.name),
    field('First action', t.first_action, 'first-action'),
    field('Done when', t.done_when),
    field('Estimate', `${t.estimate_min} min`, 'estimate')
  );
  if (t.substeps && t.substeps.length) {
    card.append(h('div', { class: 'label' }, 'Steps (max 3)'),
      h('div', { class: 'substeps' },
        ...t.substeps.map((s) => h('label', {},
          h('input', { type: 'checkbox' }), h('span', {}, s)))
      ));
  }
  v.append(card);
  v.append(h('div', { class: 'response hidden', id: 'protocol' }));

  const started = db.state.checkins.some(
    (x) => x.type === 'starting' && x.t >= (t.started_at || 0)
  );
  c.append(
    started
      ? btn('done', 'primary', cmdDone)
      : btn('starting', 'primary', cmdStarting),
    btn('stuck', '', cmdStuck),
    btn('procrastinating', '', cmdProcrastinating)
  );

  // Mid-day interrupt: park a new idea without touching the #1.
  const wrap = h('div', { class: 'interrupt' },
    h('input', { type: 'text', placeholder: 'New idea mid-day? Drop it — I’ll park it.' }));
  const input = wrap.firstChild;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) cmdInterrupt(input.value.trim());
  });
  v.append(wrap);
  v.append(h('button', { class: 'btn ghost danger', onclick: () => setState(startClose(db.state)) },
    'close the loop for today'));
}

function protocolSay(text, cool = false) {
  // #protocol is the one place outside render() that gets wiped directly
  // (e.g. the stuck-textarea's dictation row lives here) — stop any live
  // mic before discarding whatever DOM was hosting it.
  stopAllDictation();
  const p = document.getElementById('protocol');
  if (!p) return;
  p.classList.remove('hidden');
  p.classList.toggle('cool', cool);
  p.replaceChildren(document.createTextNode(text));
}

async function cmdStarting() {
  await setState(checkin(db.state, 'starting'));
  protocolSay(W.RESPONSES.starting);
}

async function cmdDone() {
  const t = db.state.currentTask;
  protocolSay(W.verifyPrompt(t), true);
  const p = document.getElementById('protocol');
  p.append(h('div', { class: 'cmdbar' },
    btn('Yes — closed ✓', 'primary', async () => {
      await guard(async () => {
        let s = closeCurrentTask(checkin(db.state, 'done', t.name));
        const rest = remainingToday(s);
        if (rest.length === 0) { await setState(s); return; }
        showBusy('Picking the next #1');
        const res = await W.runCommit(llm(), rest);
        s = res ? commit(s, res.task) : s;
        await setState(s);
      });
      render();
    }),
    btn('Not yet', 'ghost', () => render())
  ));
}

async function cmdStuck() {
  protocolSay(W.RESPONSES.stuckAsk);
  const p = document.getElementById('protocol');
  const ta = h('textarea', { placeholder: "What's in the way?" });
  p.append(withDictation(ta), h('div', { class: 'cmdbar' },
    btn('Shrink it', 'blue', async () => {
      await guard(async () => {
        const res = await W.runStuck(llm(), db.state.currentTask, ta.value || '(no detail given)');
        await setState(checkin(db.state, 'stuck', `${res.blocker}: ${ta.value}`));
        protocolSay(`⚑ ${res.blocker}\nSMALLEST STEP: ${res.smallest_step}\n${res.note}`);
      });
    })
  ));
}

async function cmdProcrastinating() {
  await setState(checkin(db.state, 'procrastinating'));
  protocolSay(W.RESPONSES.procrastinating);
  const p = document.getElementById('protocol');
  const clock = h('div', { class: 'timer' }, '5:00');
  p.append(clock);
  let secs = 300;
  timerId = setInterval(() => {
    secs -= 1;
    clock.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    if (secs <= 0) {
      stopTimer();
      protocolSay(`Timer done. Do JUST the first action: ${db.state.currentTask.first_action}`);
    }
  }, 1000);
}

async function cmdInterrupt(text) {
  await guard(async () => {
    const parked = await W.runInterrupt(llm(), text);
    const s = { ...db.state, triage: [...db.state.triage, parked] };
    flash = `Parked in ${parked.bucket}: ${parked.task}`;
    await setState(checkin(s, 'note', `interrupt → ${parked.bucket}: ${parked.task}`));
  });
}

function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
}

// --- CLOSE ------------------------------------------------------------------

function renderClose(v, c) {
  v.append(h('div', { class: 'eyebrow' }, 'Phase 5 — Close the loop'));
  const closed = db.state.closed;
  const seed = [
    ...closed.map((t) => `Done: ${t}`),
    ...db.state.checkins.filter((x) => x.type === 'stuck')
      .map((x) => `Got stuck: ${x.text}`)
  ].join('\n');
  const ta = h('textarea', { placeholder: 'What actually happened today?' });
  ta.value = seed;
  v.append(h('div', { class: 'hint' },
    'Say what really happened — closed, half-done, untouched. No judgment, just data.'));
  v.append(withDictation(ta));
  c.append(
    btn('← Back', 'ghost', () => setState({ ...db.state, phase: db.state.currentTask ? 'FOCUS' : 'TRIAGE' })),
    btn('Close the loop →', 'primary', () => doClose(ta.value))
  );
}

async function doClose(accomplished) {
  await guard(async () => {
    showBusy('Checking the day against the morning list');
    const todays = db.state.triage.filter((i) => i.bucket === 'TODAY');
    const res = await W.runClose(llm(), todays, db.state.checkins, accomplished);
    renderCloseSummary(res);
  });
}

function renderCloseSummary(res) {
  // Replaces the view directly (not via render()) — the close textarea's
  // dictation row is about to be discarded, so stop it first.
  stopAllDictation();
  const v = document.getElementById('view');
  const c = document.getElementById('cmdbar');
  v.replaceChildren();
  c.replaceChildren();
  v.append(h('div', { class: 'eyebrow' }, "Today's loop close"));
  const marks = { CLOSED: '✅', CARRIED: '⏳', NOT_STARTED: '❌' };
  const sum = h('div', { class: 'summary' },
    ...res.results.map((r) => h('div', { class: 'line' },
      h('span', { class: 'status' }, marks[r.status]),
      h('span', {}, r.task),
      r.blocker ? h('span', { class: 'blocker-tag' }, ` ${r.blocker}`) : null
    ))
  );
  const counts = {
    c: res.results.filter((r) => r.status === 'CLOSED').length,
    k: res.results.filter((r) => r.status === 'CARRIED').length,
    n: res.results.filter((r) => r.status === 'NOT_STARTED').length
  };
  sum.append(h('div', { class: 'counts' },
    `Closed: ${counts.c}   Carried: ${counts.k}   Not started: ${counts.n}`));
  if (res.patterns_note) sum.append(h('div', { class: 'patterns' }, `Pattern: ${res.patterns_note}`));
  v.append(sum);
  v.append(h('div', { class: 'hint' }, "Tomorrow's #1 — set it now, before you close:"));
  const tin = h('input', { type: 'text' });
  tin.value = res.tomorrow_suggestion || '';
  v.append(tin);

  // Weekly review, if the background worker flagged it due.
  chrome.storage.local.get('weeklyReviewDue').then(({ weeklyReviewDue }) => {
    if (!weeklyReviewDue) return;
    const dna = dnaBars(db.patterns);
    if (!dna.bars.length) return;
    v.append(h('div', { class: 'review' },
      h('div', { class: 'eyebrow' }, 'Your procrastination DNA — this week'),
      dnaCard(dna)
    ));
    chrome.storage.local.set({ weeklyReviewDue: false });
  });

  c.append(btn('save & close', 'primary', async () => {
    const { summary, patternEntries, nextState } =
      finishClose(db.state, res.results, res.patterns_note, tin.value.trim());
    db.patterns = addEntries(db.patterns, patternEntries);
    db.history = [...db.history, summary];
    await store.save({ patterns: db.patterns, history: db.history });
    flash = 'Loop closed. See you tomorrow.';
    await setState(nextState);
    chrome.action.setBadgeText({ text: '' });
  }));
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, val] of Object.entries(attrs)) {
    if (k === 'class') node.className = val;
    else if (k === 'onclick') node.addEventListener('click', val);
    else node.setAttribute(k, val);
  }
  for (const child of children) {
    if (child == null) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function field(label, value, cls = '') {
  return h('div', { class: `field ${cls}` },
    h('div', { class: 'label' }, label),
    h('div', { class: 'value' }, value));
}

// First-run welcome: one mentor-toned line, the 5-phase flow shown visually,
// a tease of the DNA payoff, and a one-tap example that fills the dump box so
// a brand-new user sees triage do something impressive immediately.
function welcomeCard(ta) {
  const steps = ['Dump', 'Triage', 'Commit', 'Execute', 'Close'];
  const flow = h('div', { class: 'flow' });
  steps.forEach((s, i) => {
    flow.append(h('span', { class: 'flow-step' }, s));
    if (i < steps.length - 1) flow.append(h('span', { class: 'flow-arrow' }, '→'));
  });
  const cta = h('button', {
    class: 'btn blue welcome-cta',
    onclick: () => {
      ta.value = EXAMPLE_DUMP;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.focus();
    }
  }, 'Try it with an example');
  return h('div', { class: 'welcome' },
    h('div', { class: 'welcome-title' }, 'Welcome — this is LOOP'),
    h('div', { class: 'welcome-sub' },
      'Empty your head below. I turn the pile into one clear next task — then again tomorrow.'),
    flow,
    h('div', { class: 'welcome-sub dim' },
      'After a few days I show your #1 procrastination trigger — and one change to beat it.'),
    cta
  );
}

function btn(label, kind, onclick, disabled = false) {
  const b = h('button', { class: `btn ${kind}`.trim(), onclick }, label);
  b.disabled = disabled;
  return b;
}
