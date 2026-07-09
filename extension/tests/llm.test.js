// tests/llm.test.js — provider validation, without hitting the network.
//
// loadSystemPrompt() needs `chrome.runtime.getURL`, which only exists inside
// a real extension — so these tests only exercise the synchronous
// precondition checks in makeLlm() (provider recognized; API key present
// unless Ollama). Those checks are deliberately ordered to run BEFORE any
// chrome API or network call (see the comment in lib/llm.js), which is
// exactly what makes them testable here in plain Node.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeLlm, DEFAULT_MODELS, LlmError } from '../lib/llm.js';

const call = (provider, apiKey = '') =>
  makeLlm({ provider, apiKey, ollamaUrl: 'http://localhost:11434' }, null)(
    { instruction: 'x', content: 'y' }
  );

test('DEFAULT_MODELS covers all four providers', () => {
  for (const p of ['anthropic', 'openai', 'openrouter', 'ollama']) {
    assert.ok(DEFAULT_MODELS[p], `missing default model for ${p}`);
  }
});

test('rejects an unknown provider before touching chrome or the network', async () => {
  await assert.rejects(call('carrier-pigeon'), LlmError);
});

test('requires an API key for anthropic', async () => {
  await assert.rejects(call('anthropic', ''), /API key/);
});

test('requires an API key for openai', async () => {
  await assert.rejects(call('openai', ''), /API key/);
});

test('requires an API key for openrouter', async () => {
  await assert.rejects(call('openrouter', ''), /API key/);
});

test('does NOT require a key for ollama (local, free)', async () => {
  // No key set. It should clear the requireKey gate and fail on the NEXT
  // step instead (loadSystemPrompt needs `chrome`, undefined in Node) —
  // proving the key check was skipped, not that something else went right.
  await assert.rejects(
    call('ollama', ''),
    (err) => !(err instanceof LlmError && /API key/.test(err.message))
  );
});
