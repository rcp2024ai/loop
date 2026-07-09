// settings.js — options page: provider config, schedule, usage, weekly DNA.

import { Store, DEFAULT_SETTINGS } from './lib/state.js';
import { makeLlm, DEFAULT_MODELS, LlmError } from './lib/llm.js';
import { weeklyReview } from './lib/patterns.js';

const store = new Store(chrome.storage.local);
const $ = (id) => document.getElementById(id);

init();

async function init() {
  const { settings, usage, patterns } = await store.load();
  $('provider').value = settings.provider;
  $('apiKey').value = settings.apiKey;
  $('model').value = settings.model;
  $('ollamaUrl').value = settings.ollamaUrl;
  $('dumpTime').value = settings.dumpTime;
  $('closeTime').value = settings.closeTime;
  $('nudges').checked = settings.nudges;

  syncProviderRows();
  $('provider').addEventListener('change', syncProviderRows);
  $('model').addEventListener('input', updateEffectiveModel);
  $('btn-save').addEventListener('click', save);
  $('btn-test').addEventListener('click', test);

  $('usage').textContent =
    `${usage.calls} calls · ${usage.inTokens.toLocaleString()} in / ${usage.outTokens.toLocaleString()} out tokens`;

  renderReview(patterns);
}

function syncProviderRows() {
  const p = $('provider').value;
  $('row-key').style.display = p === 'ollama' ? 'none' : '';
  $('row-ollama').style.display = p === 'ollama' ? '' : 'none';
  $('model').placeholder = DEFAULT_MODELS[p] || '';
  updateEffectiveModel();
}

// The Model field's placeholder text (gray) can look identical to a real
// typed value at a glance — that exact confusion is what caused a bad
// hardcoded default to go unnoticed until it 404'd. Spell out, in plain
// text, the literal string that will actually be sent.
function updateEffectiveModel() {
  const p = $('provider').value;
  const typed = $('model').value.trim();
  const effective = typed || DEFAULT_MODELS[p] || '(none set)';
  $('model-effective').textContent = typed
    ? `Using: ${effective}`
    : `Using: ${effective} (default — nothing typed above)`;
}

function collect() {
  return {
    ...DEFAULT_SETTINGS,
    provider: $('provider').value,
    apiKey: $('apiKey').value.trim(),
    model: $('model').value.trim(),
    ollamaUrl: $('ollamaUrl').value.trim() || DEFAULT_SETTINGS.ollamaUrl,
    dumpTime: $('dumpTime').value || DEFAULT_SETTINGS.dumpTime,
    closeTime: $('closeTime').value || DEFAULT_SETTINGS.closeTime,
    nudges: $('nudges').checked
  };
}

async function save() {
  await store.save({ settings: collect() });
  chrome.runtime.sendMessage({ type: 'reschedule' }).catch(() => {});
  flash('Saved.', true);
}

async function test() {
  flash('Testing…');
  try {
    const llm = makeLlm(collect(), null);
    const out = await llm({
      instruction: 'Connection test. Reply with the word OK and nothing else.',
      content: 'ping'
    });
    flash(out && out.length < 40 ? `Connected: "${out.trim()}"` : 'Connected.', true);
  } catch (e) {
    flash(e instanceof LlmError ? e.message : `Failed: ${e.message}`, false);
  }
}

function flash(msg, ok) {
  const el = $('test-result');
  el.textContent = msg;
  el.className = ok === true ? 'ok' : ok === false ? 'bad' : '';
}

function renderReview(patterns) {
  const wr = weeklyReview(patterns);
  if (!wr.top.length) return;
  const box = $('review');
  box.replaceChildren();
  for (const t of wr.top) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    const label = document.createElement('span');
    label.textContent = t.label;
    const count = document.createElement('span');
    count.textContent = `×${t.count}`;
    bar.append(label, count);
    box.append(bar);
  }
  const change = document.createElement('div');
  change.className = 'change';
  change.textContent = `One change: ${wr.proposedChange}`;
  box.append(change);
}
