// background.js — LOOP service worker.
// Owns everything that must run when the sidebar is closed: scheduled
// reminders (chrome.alarms), the 20-minute focus watch (chrome.idle),
// and tab-switch procrastination detection (chrome.tabs.onActivated).
// It never modifies page content — LOOP has no content script by design.
// Nudges use the stuck protocol tone: a question, never guilt.

import { Store, setNudge } from './lib/state.js';
import { nudgeText } from './lib/workflow.js';

const store = new Store(chrome.storage.local);

// Clicking the toolbar icon opens the side panel.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onInstalled.addListener(scheduleAlarms);
chrome.runtime.onStartup.addListener(scheduleAlarms);
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'reschedule') scheduleAlarms();
});

async function scheduleAlarms() {
  const { settings } = await store.load();
  await chrome.alarms.clearAll();
  chrome.alarms.create('dump-reminder', {
    when: nextAt(settings.dumpTime), periodInMinutes: 1440
  });
  chrome.alarms.create('close-reminder', {
    when: nextAt(settings.closeTime), periodInMinutes: 1440
  });
  chrome.alarms.create('weekly-review', {
    when: nextSundayEvening(), periodInMinutes: 10080
  });
  chrome.alarms.create('focus-watch', { periodInMinutes: 5 });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const { state, settings } = await store.load();

  if (alarm.name === 'weekly-review') {
    await chrome.storage.local.set({ weeklyReviewDue: true });
    return nudge(state, 'Weekly review is ready — your procrastination DNA shows up in tonight’s close.');
  }
  if (!settings.nudges) return;

  if (alarm.name === 'dump-reminder' && state.phase === 'DUMP' && state.dumpBuffer.length === 0) {
    return nudge(state, 'Morning. Dump everything here — then we pick your #1.');
  }
  if (alarm.name === 'close-reminder' && state.phase !== 'CLOSE' && state.triage.length > 0) {
    return nudge(state, 'End of day. Time to close the loop.');
  }
  if (alarm.name === 'focus-watch' && state.phase === 'FOCUS' && state.currentTask && !state.nudge) {
    const sinceActivity = Date.now() - (state.lastActivity || 0);
    if (sinceActivity > 20 * 60 * 1000) {
      // Don't nag someone who walked away from the machine.
      const idle = await chrome.idle.queryState(300);
      if (idle === 'active') return nudge(state, nudgeText(state.currentTask.name));
    }
  }
});

// Rapid tab switching during FOCUS (>5 switches/min) is a procrastination
// signal. Throttled to one nudge per 10 minutes.
let switches = [];
let lastTabNudge = 0;

chrome.tabs.onActivated.addListener(async () => {
  const now = Date.now();
  switches = switches.filter((t) => now - t < 60_000);
  switches.push(now);
  if (switches.length <= 5 || now - lastTabNudge < 10 * 60_000) return;
  const { state, settings } = await store.load();
  if (!settings.nudges || state.phase !== 'FOCUS' || !state.currentTask || state.nudge) return;
  lastTabNudge = now;
  switches = [];
  await nudge(state, `Lots of tab switching. Stuck on "${state.currentTask.name}"? Procrastinating?`);
});

async function nudge(state, reason) {
  await store.save({ state: setNudge(state, reason) });
  chrome.action.setBadgeBackgroundColor({ color: '#F5A623' });
  chrome.action.setBadgeText({ text: '•' });
}

function nextAt(hhmm) {
  const [h, m] = String(hhmm || '07:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h || 7, m || 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

function nextSundayEvening() {
  const d = new Date();
  d.setHours(18, 0, 0, 0);
  while (d.getDay() !== 0 || d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}
