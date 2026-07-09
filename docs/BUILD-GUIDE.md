# LOOP Build Guide — the plain-language tour

This explains how the extension works, file by file, and *why* it's built this way.
No jargon without a definition. Written for the owner to learn from, not just use.

## The mental model

Think of LOOP as three people working a tiny restaurant:

- **The dining room** (`sidebar.html/css/js`) — what you see and touch. It shows one of
  four screens depending on where you are in the day.
- **The kitchen** (`lib/` folder) — where the real work happens. Recipes (workflow rules),
  the order board (state), and the phone line to the AI (llm).
- **The night manager** (`background.js`) — awake even when the sidebar is closed.
  Sets the morning alarm, notices when you've gone quiet, taps you on the shoulder.

## Why a "state machine"?

Your day is always in exactly ONE of four phases: DUMP → TRIAGE → FOCUS → CLOSE.
A *state machine* is just code that (a) remembers which phase you're in, and (b) only
allows legal moves between phases. This is what stops the tool from ever showing you
five tasks at once — the FOCUS screen is physically incapable of it. The rule lives in
the structure, not in willpower.

All of that lives in `lib/state.js`. Every change to your day goes through a small,
named function (`addDump`, `commit`, `closeCurrentTask`…). Nothing else in the codebase
is allowed to fiddle with state directly. Why? So there's exactly one place bugs can hide.

## Where the AI is — and isn't

Here's the design decision that keeps this fast and nearly free to run:

- **Phases 1 and 4 have ZERO AI.** The spec fixes those responses word-for-word
  ("Go. Come back when done or stuck."). Fixed words = plain code. No API call, no
  cost, no drift. They're locked in with tests so nobody rewrites them accidentally.
- **Phases 2, 3, 5 use the AI** — the judgment calls: parsing your messy dump, naming
  each task's hidden blocker, choosing the one task that matters, reading your day
  honestly at close.

Every AI call sends `prompts/system-prompt.md` — the encoded workflow, the product's
actual IP — and demands **strict JSON** back (structured data, not prose). The code in
`lib/workflow.js` then *validates* everything: if the model returns 5 sub-steps, we cut
it to 3 (Hard Rule 2 is enforced in code, not trust); if it invents a bucket called
"WHENEVER", we coerce it to SOMEDAY. The model proposes; the code disposes.

## BYO key ("bring your own key")

The extension has no server. Your API key lives in `chrome.storage.local` — a small
private database Chrome gives each extension, stored on your machine only. Calls go
straight from your browser to your chosen provider:

- **OpenRouter** (the default) — one key, one bill, 100+ models from many labs behind
  it. Good default for a beginner: you're not locked into picking "the right" provider
  up front, and some models there are free.
- **Anthropic / OpenAI directly** — paste a key if you already have an account with
  either and prefer to use it directly.
- **Ollama** — an app that runs models locally on your machine. Free, private, no key
  at all.

That's why the free tier costs us nothing to operate — the bill (if any) goes straight
from you to your chosen provider; we never sit in the middle of it.

## File-by-file

| File | Job | Worth knowing |
|---|---|---|
| `manifest.json` | The extension's ID card: name, permissions, entry points | We ask for only 5 permissions — no "read every website" content script. Fewer permissions = faster store review + more user trust. |
| `sidebar.html/css` | Structure and skin | BetterWayAI dark theme. Everything fits 400px wide, no scrolling for the #1 card. |
| `sidebar.js` | The controller: renders the current phase, routes button presses | Re-renders from state each time; user text is never trusted as HTML (no injection bugs). |
| `background.js` | The night manager (a "service worker" — code Chrome wakes when needed, then puts back to sleep) | Alarms for morning dump / evening close / Sunday review; idle + tab-switch nudges. It checks `chrome.idle` first so it never nags you for making coffee. |
| `lib/state.js` | The state machine + saving/loading | Day rollover: unfinished TODAY items are auto-carried into tomorrow's dump. |
| `lib/workflow.js` | The 5-phase engine: spec-exact strings, JSON parsing, validators | The "model proposes, code disposes" layer. |
| `lib/llm.js` | The one and only door to AI providers | Friendly errors ("Is Ollama running?"), token counting for the Settings page. |
| `lib/patterns.js` | The blocker log + weekly "Procrastination DNA" review | Pure counting — deliberately not an AI call. Counting is free. |
| `lib/dictation.js` | Voice-to-text for any textarea, via the browser's built-in Web Speech API | No key, no server, no manifest permission — Chrome/Edge handle the mic prompt like any website would. Purely additive: typing always still works. |
| `settings.html/js` | Provider, key, schedule, nudge toggle, usage, weekly DNA | "Test connection" button so setup failures are obvious in 5 seconds. |
| `prompts/system-prompt.md` | The encoded workflow — the strategy document the AI follows | Edit THIS to change the AI's behavior. Never edit behavior by scattering prompt fragments through code. |
| `tests/` | 34 checks that run in plain Node | Protocol strings are tested character-for-character — the spec's words are load-bearing. |

## How to test it like a developer

```bash
cd extension && npm test
```

Then the human test (the one that matters): use it for 5 real days. The spec's own
success bar is that the loop closes daily — not that the code is clever.

## Decisions a reviewer might ask about

1. **No framework.** React would triple the size for zero benefit at this scale.
   Vanilla ES modules load instantly and the whole extension stays understandable.
2. **No content script.** The original spec injected a script into every webpage to
   watch tab context. We get the same signals from the `tabs` API inside the
   background worker — same feature, much smaller permission footprint.
3. **Strict JSON + local validators** instead of trusting model prose. Cheap models
   run this daily; the validators are what make cheap safe.
4. **Carried tasks auto-seed tomorrow's dump.** Closing the loop is only honest if
   yesterday's leftovers show up this morning by default.
5. **Dictation is additive, never load-bearing.** The mic button is a faster on-ramp
   for the exact moment typing is friction (dumping a stream of consciousness), but
   every dictation-enabled textarea is a normal textarea underneath — on a browser
   without speech support, or if the mic is denied, typing works exactly as if the
   button were never there. Every "wipe this part of the screen" code path also stops
   any live dictation first, so a mic session can never keep listening in the
   background after its textarea is gone.

## Glossary

- **Manifest V3** — Chrome's current extension format; `manifest.json` declares what you're allowed to do.
- **Service worker** — background code Chrome starts/stops on demand (that's why nothing is kept "in memory" there — everything important is written to storage).
- **Side Panel API** — Chrome 114+ feature giving extensions a persistent sidebar.
- **State machine** — code that's always in exactly one named state, with defined moves between states.
- **BYO key** — you supply your own AI provider key; the product ships no server.
- **Ollama** — free app that runs open models locally on your machine.
- **OpenRouter** — one API that proxies 100+ models from many providers behind a
  single key and a single bill.
- **Strict JSON** — machine-readable structured output we can validate, instead of prose we'd have to guess at.
- **Web Speech API** — the browser's built-in speech-to-text. Chrome's implementation sends audio to Google's speech service for transcription (cloud-based, not on-device) but needs no API key of its own and costs nothing to use — separate entirely from your OpenRouter/Anthropic/OpenAI/Ollama key.
