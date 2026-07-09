// lib/workflow.js — the 5-phase loop engine.
// Deterministic protocol strings from the spec live HERE (Phases 1 & 4 are
// fixed by design — zero API cost, zero drift). The LLM handles judgment
// calls only (Phases 2, 3, 5, stuck-shrinking, interrupt triage) and must
// return strict JSON, which we validate and render locally.

import { BUCKETS, BLOCKERS } from './state.js';

// --- Phase 1 + Phase 4 protocol strings (spec section 4 — do not reword) ---

export const ACK = 'Got it. Is there more? Keep going.';

export const RESPONSES = {
  starting: 'Go. Come back when done or stuck.',
  procrastinating:
    "That's fine. You have 5 minutes of approved procrastination. " +
    'Then come back and do JUST the first action. Not the whole task. ' +
    'Just the first action. Set a 5-minute timer.',
  stuckAsk:
    "What's blocking you? Tell me what's in the way and I'll shrink the next step."
};

export function verifyPrompt(task) {
  return `Verify: ${task.done_when} — true? If yes, close it and we pick the next #1.`;
}

export function nudgeText(taskName) {
  return `You haven't checked in on "${taskName}". Stuck? Procrastinating?`;
}

// --- Strict-JSON parsing with defensive fallbacks ---------------------------

export function parseStrictJson(text) {
  if (!text) return null;
  let t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.search(/[{[]/);
  if (start === -1) return null;
  const opener = t[start];
  const closer = opener === '{' ? '}' : ']';
  const end = t.lastIndexOf(closer);
  if (end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

// --- Validators (coerce LLM output into shapes the UI can trust) ------------

export function validateTriage(raw) {
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return items
    .filter((i) => i && typeof i.task === 'string' && i.task.trim())
    .map((i) => ({
      task: i.task.trim(),
      bucket: BUCKETS.includes(i.bucket) ? i.bucket : 'SOMEDAY',
      blocker: BLOCKERS.includes(i.blocker) ? i.blocker : null,
      first_action: typeof i.first_action === 'string' ? i.first_action : null,
      note: typeof i.note === 'string' ? i.note : ''
    }));
}

export function validateCommit(raw, todayItems) {
  const t = raw?.task;
  if (!t || typeof t.name !== 'string') return null;
  return {
    pick: Number.isInteger(raw.pick) ? raw.pick : 0,
    reason: typeof raw.reason === 'string' ? raw.reason : '',
    task: {
      name: t.name.trim() || (todayItems[0] ? todayItems[0].task : 'Task'),
      first_action: String(t.first_action || 'Start.').trim(),
      done_when: String(t.done_when || 'It is done and verified.').trim(),
      estimate_min: clampInt(t.estimate_min, 5, 480, 30),
      substeps: Array.isArray(t.substeps)
        ? t.substeps.slice(0, 3).map(String) // Hard Rule 2: never more than 3
        : []
    }
  };
}

export function validateStuck(raw) {
  if (!raw) return null;
  return {
    blocker: BLOCKERS.includes(raw.blocker) ? raw.blocker : 'TOO_VAGUE',
    smallest_step: String(raw.smallest_step || 'Open the file. Nothing else.'),
    note: String(raw.note || '')
  };
}

export function validateClose(raw, todayItems) {
  const byName = new Map(
    (Array.isArray(raw?.results) ? raw.results : [])
      .filter((r) => r && typeof r.task === 'string')
      .map((r) => [normalize(r.task), r])
  );
  const results = todayItems.map((i) => {
    const r = byName.get(normalize(i.task));
    const status = ['CLOSED', 'CARRIED', 'NOT_STARTED'].includes(r?.status)
      ? r.status
      : 'NOT_STARTED';
    return {
      task: i.task,
      status,
      blocker:
        status === 'CLOSED'
          ? null
          : BLOCKERS.includes(r?.blocker) ? r.blocker : (i.blocker || 'NO_STAKES')
    };
  });
  return {
    results,
    patterns_note: String(raw?.patterns_note || ''),
    tomorrow_suggestion: String(raw?.tomorrow_suggestion || '')
  };
}

export function validateInterrupt(raw, fallbackText) {
  return {
    task: String(raw?.task || fallbackText || '').trim(),
    bucket: BUCKETS.includes(raw?.bucket) ? raw.bucket : 'SOMEDAY',
    note: String(raw?.note || '')
  };
}

// --- LLM-backed phase runners ------------------------------------------------
// `llm` is an async function ({ instruction, content }) => text.
// The real one lives in lib/llm.js; tests pass a stub.

export async function runTriage(llm, dumpText) {
  const text = await llm({
    instruction: 'PHASE 2 — TRIAGE & DECODE. The raw brain dump follows.',
    content: dumpText
  });
  return validateTriage(parseStrictJson(text));
}

export async function runCommit(llm, todayItems) {
  const text = await llm({
    instruction:
      'PHASE 3 — COMMIT TO ONE. The confirmed TODAY items follow as JSON.',
    content: JSON.stringify(todayItems)
  });
  return validateCommit(parseStrictJson(text), todayItems);
}

export async function runStuck(llm, task, blockerText) {
  const text = await llm({
    instruction:
      "PHASE 4 — STUCK PROTOCOL. Current #1 task JSON and the user's blocker description follow.",
    content: JSON.stringify({ task, blocked_by: blockerText })
  });
  return validateStuck(parseStrictJson(text));
}

export async function runClose(llm, todayItems, checkins, accomplished) {
  const text = await llm({
    instruction:
      "PHASE 5 — CLOSE THE LOOP. Morning TODAY list, check-in log, and the user's account follow as JSON.",
    content: JSON.stringify({
      today_list: todayItems,
      checkins: checkins.map((c) => ({ type: c.type, text: c.text })),
      accomplished
    })
  });
  return validateClose(parseStrictJson(text), todayItems);
}

export async function runInterrupt(llm, text) {
  const out = await llm({
    instruction: 'INTERRUPT TRIAGE. One new item arrived mid-day. The item follows.',
    content: text
  });
  return validateInterrupt(parseStrictJson(out), text);
}

// --- Helpers -----------------------------------------------------------------

function clampInt(v, min, max, fallback) {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalize(s) {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim();
}
