// settings.js — options page: provider config, schedule, usage, weekly DNA.

import { Store, DEFAULT_SETTINGS } from './lib/state.js';
import { makeLlm, DEFAULT_MODELS, LlmError } from './lib/llm.js';
import { dnaBars } from './lib/patterns.js';
import { dnaCard } from './lib/dna-view.js';

const store = new Store(chrome.storage.local);
const $ = (id) => document.getElementById(id);

// Curated, live-verified OpenRouter slugs (checked against
// openrouter.ai/api/v1/models). These are the exact values sent to the API;
// the dropdown labels are plain-language tiers so nobody has to know or type
// a slug. Anything outside this list is still reachable via "Custom…".
// Keep in sync with the <option> values in settings.html.
const PRESET_SLUGS = [
  'openai/gpt-4o-mini',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-sonnet-4.5',
  'meta-llama/llama-3.3-70b-instruct:free'
];
const CUSTOM = '__custom__';

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

  // Preselect the dropdown from the saved slug: an exact preset match picks
  // that tier; any other non-empty slug means "Custom…" (and reveals the
  // text box holding it); blank falls back to Balanced (the recommendation).
  if (PRESET_SLUGS.includes(settings.model)) {
    $('model-preset').value = settings.model;
  } else if (settings.model) {
    $('model-preset').value = CUSTOM;
  } else {
    $('model-preset').value = 'anthropic/claude-haiku-4.5';
  }

  syncProviderRows();
  $('provider').addEventListener('change', syncProviderRows);
  $('model-preset').addEventListener('change', () => { syncModelRows(); updateEffectiveModel(); });
  $('model').addEventListener('input', updateEffectiveModel);
  $('btn-save').addEventListener('click', save);
  $('btn-test').addEventListener('click', test);

  $('usage').textContent =
    `${usage.calls} calls · ${usage.inTokens.toLocaleString()} in / ${usage.outTokens.toLocaleString()} out tokens`;

  renderReview(patterns);
}

// Provider drives which rows show. The curated dropdown is OpenRouter-only
// (its slugs are OpenRouter-addressed); every other provider keeps the
// freeform text field, since their model names differ.
function syncProviderRows() {
  const p = $('provider').value;
  $('row-key').style.display = p === 'ollama' ? 'none' : '';
  $('row-ollama').style.display = p === 'ollama' ? '' : 'none';
  $('row-model-preset').style.display = p === 'openrouter' ? '' : 'none';
  $('model').placeholder = DEFAULT_MODELS[p] || '';
  syncModelRows();
  updateEffectiveModel();
}

// The freeform slug box appears only when it's actually needed: any
// non-OpenRouter provider, or OpenRouter with "Custom…" chosen.
function syncModelRows() {
  const p = $('provider').value;
  const custom = p !== 'openrouter' || $('model-preset').value === CUSTOM;
  $('row-model-custom').style.display = custom ? '' : 'none';
  $('model-custom-label').textContent = p === 'openrouter'
    ? 'Custom model slug (from openrouter.ai/models)'
    : 'Model (blank = sensible default)';
}

// The exact slug that will be sent, given provider + dropdown + text box.
// This is the single source of truth for both the "Using:" line and save.
function resolveModel() {
  if ($('provider').value !== 'openrouter') return $('model').value.trim();
  const preset = $('model-preset').value;
  return preset === CUSTOM ? $('model').value.trim() : preset;
}

// Spell out, in plain text, the literal string that will actually be sent —
// a dropdown label like "Balanced" shouldn't hide which model that really is,
// and a stale/blank value should never be mistaken for a real one (that
// ambiguity is what let a bad default 404 silently before).
function updateEffectiveModel() {
  const p = $('provider').value;
  const chosen = resolveModel();
  const effective = chosen || DEFAULT_MODELS[p] || '(none set)';
  const freeNote = effective.endsWith(':free') ? ' · free tier may be slower / rate-limited' : '';
  $('model-effective').textContent =
    `Using: ${effective}${chosen ? '' : ' (default)'}${freeNote}`;
}

function collect() {
  return {
    ...DEFAULT_SETTINGS,
    provider: $('provider').value,
    apiKey: $('apiKey').value.trim(),
    model: resolveModel(),
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
  const dna = dnaBars(patterns);
  if (!dna.bars.length) return; // keep the inviting empty-state copy in the HTML
  $('review').replaceChildren(dnaCard(dna));
}
