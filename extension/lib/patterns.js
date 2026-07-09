// lib/patterns.js — the pattern log and weekly review.
// Every uncompleted task's root-cause blocker lands here (Hard Rule 7).
// The weekly review is computed locally — counting doesn't need an LLM.

import { BLOCKERS } from './state.js';

export const BLOCKER_LABELS = {
  TOO_VAGUE: 'Too vague — no clear first action',
  TOO_BIG: 'Too big — needed decomposition',
  PERFECTIONISM: 'Perfectionism — fear of getting it wrong',
  CONTEXT_SWITCH: 'Context switch — different tools needed to start',
  WAITING: 'Waiting on someone else',
  LOW_ENERGY: 'Low energy — wrong time of day for this load',
  NO_STAKES: 'No stakes — nothing happens if it slips'
};

// One concrete system change per dominant blocker ("Your Procrastination DNA").
export const SYSTEM_CHANGES = {
  TOO_VAGUE: 'During triage, refuse any TODAY item without a <10-word first action.',
  TOO_BIG: 'Cap TODAY items at 45 minutes; split anything bigger at triage time.',
  PERFECTIONISM: 'Define "done" as shippable-not-perfect at commit time, before starting.',
  CONTEXT_SWITCH: 'Batch same-tool tasks; open tomorrow\'s tools the night before.',
  WAITING: 'Convert every WAITING item into a 2-minute nudge-the-blocker task.',
  LOW_ENERGY: 'Schedule heavy-load tasks into your first work block of the day.',
  NO_STAKES: 'Give no-stakes tasks an artificial deadline and tell someone about it.'
};

export function addEntries(patterns, entries) {
  return [...patterns, ...entries];
}

export function lastNDays(patterns, n, now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - n);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return patterns.filter((p) => p.day >= cutoffKey);
}

// Aggregates the week's blockers → top 3 triggers + ONE proposed change.
export function weeklyReview(patterns, now = new Date()) {
  const week = lastNDays(patterns, 7, now);
  const counts = {};
  for (const p of week) {
    if (!BLOCKERS.includes(p.blocker)) continue;
    counts[p.blocker] = (counts[p.blocker] || 0) + 1;
  }
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([blocker, count]) => ({
      blocker,
      count,
      label: BLOCKER_LABELS[blocker]
    }));
  return {
    totalStalls: week.length,
    top,
    proposedChange: top.length ? SYSTEM_CHANGES[top[0].blocker] : null
  };
}
