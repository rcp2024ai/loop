// lib/llm.js — ALL AI API calls go through here (CLAUDE.md rule: no direct
// fetch calls anywhere else). BYO-key model: the user supplies their own
// Anthropic, OpenAI, or OpenRouter key, or points at a local Ollama server
// for zero-cost inference. The system prompt is loaded from
// prompts/system-prompt.md — never inlined in code.

const PROVIDERS = ['openrouter', 'anthropic', 'openai', 'ollama'];

export const DEFAULT_MODELS = {
  anthropic: 'claude-haiku-4-5',
  openai: 'gpt-4o-mini',
  // OpenRouter proxies 100+ models behind one key, addressed as
  // "provider/model". This default is a solid, inexpensive general model —
  // browse current options (including free ones, suffixed ":free") at
  // openrouter.ai/models and paste any slug into the Model field.
  openrouter: 'anthropic/claude-3.5-haiku',
  ollama: 'llama3.2'
};

export class LlmError extends Error {
  constructor(message, detail = '') {
    super(message);
    this.name = 'LlmError';
    this.detail = detail;
  }
}

let systemPromptCache = null;

export async function loadSystemPrompt() {
  if (systemPromptCache) return systemPromptCache;
  const url = chrome.runtime.getURL('prompts/system-prompt.md');
  const res = await fetch(url);
  systemPromptCache = await res.text();
  return systemPromptCache;
}

// Returns an async ({ instruction, content }) => text function bound to the
// user's settings, recording token usage through `onUsage`.
//
// Precondition checks (provider is recognized; a key is present unless
// running Ollama) run BEFORE any I/O — including the local system-prompt
// read — so a misconfigured provider fails fast with a friendly LlmError
// rather than a raw fetch/runtime error.
export function makeLlm(settings, onUsage) {
  return async ({ instruction, content }) => {
    if (!PROVIDERS.includes(settings.provider)) {
      throw new LlmError(`Unknown provider: ${settings.provider}`);
    }
    if (settings.provider !== 'ollama') requireKey(settings);

    const system = await loadSystemPrompt();
    const user = `${instruction}\n\n${content}`;
    const model = settings.model || DEFAULT_MODELS[settings.provider];

    if (settings.provider === 'anthropic') {
      const res = await post(
        'https://api.anthropic.com/v1/messages',
        {
          'content-type': 'application/json',
          'x-api-key': settings.apiKey,
          'anthropic-version': '2023-06-01',
          // Required for calls made directly from a browser context:
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        {
          model,
          max_tokens: 2048,
          system,
          messages: [{ role: 'user', content: user }]
        }
      );
      onUsage?.(res.usage?.input_tokens || 0, res.usage?.output_tokens || 0);
      return (res.content || []).map((b) => b.text || '').join('');
    }

    if (settings.provider === 'openai' || settings.provider === 'openrouter') {
      // OpenRouter speaks the OpenAI Chat Completions format, so both
      // providers share one branch — only the URL and headers differ.
      const url = settings.provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const headers = {
        'content-type': 'application/json',
        authorization: `Bearer ${settings.apiKey}`
      };
      if (settings.provider === 'openrouter') {
        // Optional, OpenRouter-recommended attribution headers — purely
        // cosmetic (shows up in their dashboards), no effect on the response.
        headers['HTTP-Referer'] = 'https://betterwayai.com';
        headers['X-Title'] = 'LOOP by BetterWayAI';
      }
      const res = await post(url, headers, {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      });
      onUsage?.(
        res.usage?.prompt_tokens || 0,
        res.usage?.completion_tokens || 0
      );
      return res.choices?.[0]?.message?.content || '';
    }

    // ollama — the only provider that reaches here without an API key.
    const base = (settings.ollamaUrl || 'http://localhost:11434').replace(/\/$/, '');
    const res = await post(
      `${base}/api/chat`,
      { 'content-type': 'application/json' },
      {
        model,
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      }
    );
    onUsage?.(res.prompt_eval_count || 0, res.eval_count || 0);
    return res.message?.content || '';
  };
}

function requireKey(settings) {
  if (!settings.apiKey) {
    throw new LlmError(
      'No API key set. Open Settings (gear icon) and add one — or switch to Ollama for local, free inference.'
    );
  }
}

async function post(url, headers, body) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  } catch (e) {
    throw new LlmError(
      url.includes('localhost') || url.includes('127.0.0.1')
        ? 'Could not reach Ollama. Is it running? (`ollama serve`)'
        : 'Network error reaching the AI provider. Check your connection.',
      String(e)
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      throw new LlmError('API key rejected. Check it in Settings.', text);
    }
    if (res.status === 429) {
      throw new LlmError('Rate limited by the provider. Wait a minute and retry.', text);
    }
    throw new LlmError(`Provider error (HTTP ${res.status}). Try again.`, text);
  }
  return res.json();
}
