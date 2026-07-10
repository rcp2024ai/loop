# LOOP — Engineering Handoff (v1.0 → v1.4)

> Read this first if you're taking over LOOP. It's written so you can be productive
> in 30 minutes without re-deriving anything. Companion docs: `BUILD-GUIDE.md`
> (plain-language file tour), `TESTING.md` (manual walkthrough),
> `LOOP_handover_specification.md` (the original product spec), and `../CLAUDE.md`
> (conventions + hard rules).

## TL;DR — current state

**Product:** LOOP by BetterWayAI — a Chrome side-panel extension that kills daily
procrastination by running a 5-phase loop: **Brain Dump → Triage & Decode → Commit to
One → Execute & Check-In → Close the Loop.**

**Repo:** `github.com/rcp2024ai/loop` (private).

**Version state:** `main` is **v1.4.0** — everything below is merged. There are no open
PRs. (History: PR #1 bundled v1.0.0→v1.3.0; PR #2 landed v1.4.0.)

**Stack:** Manifest V3, vanilla JS ES modules, **no build step, no frameworks**. AI via
bring-your-own-key (OpenRouter default; also Anthropic, OpenAI, local Ollama). **No
server** — the user's key calls the provider directly from the browser.

**Philosophy — the model proposes, the code disposes.** Deterministic phases are
hard-coded (zero cost); judgment phases call the LLM with strict-JSON contracts that
local validators enforce. A cheap model runs it safely because the guardrails are in
code, not trust.

## First 30 minutes

```bash
git clone git@github.com:rcp2024ai/loop.git
cd loop

# 1. Generate icons (NOT committed — see Gotchas). Needs Pillow.
pip install pillow
python3 tools/make_icons.py            # writes extension/icons/{16,48,128}.png

# 2. Run the test suite (pure Node, no deps, no DOM).
cd extension && npm test               # 36 passing
```

**Load in Chrome:** `chrome://extensions` → Developer mode ON → **Load unpacked** →
select `extension/` (must contain `manifest.json` directly). Click the toolbar icon →
sidebar opens. ⚙ → pick a provider, add a key (or Ollama), Save.

**Read, in order:** `../CLAUDE.md` → `BUILD-GUIDE.md` → `LOOP_handover_specification.md`
→ `../extension/prompts/system-prompt.md` (the core IP — change behavior *there*, not by
scattering prompt fragments in code) → `TESTING.md`.

## Architecture

```
loop/
├── extension/          ← Phase 1 — the shipped MVP
│   ├── manifest.json   MV3; permissions: sidePanel, storage, idle, alarms, tabs
│   ├── sidebar.html/css/js   the 4-view UI (DUMP/TRIAGE/FOCUS/CLOSE)
│   ├── background.js   service worker: alarms, idle + tab-switch nudges
│   ├── settings.html/js  provider/key, model dropdown, schedule, usage, DNA
│   ├── lib/
│   │   ├── state.js      state machine (pure transitions) + Store (chrome.storage)
│   │   ├── workflow.js   5-phase engine: spec-exact strings + JSON validators
│   │   ├── llm.js        the ONLY door to AI providers (BYO key)
│   │   ├── patterns.js   blocker log, weeklyReview, dnaBars (pure)
│   │   ├── dna-view.js   shared DNA visual (DOM card)
│   │   └── dictation.js  Web Speech API voice-to-text wrapper
│   ├── prompts/system-prompt.md   SHIPPED copy of the workflow (Chrome loads this)
│   ├── icons/          generated, gitignored
│   └── tests/          node --test: state, workflow, llm, dictation
├── saas/               Phase 2 placeholder (README only)
├── agents/             Phase 3 placeholder (README only)
├── prompts/system-prompt.md   CANONICAL workflow (keep in sync w/ extension copy)
├── docs/               BUILD-GUIDE, TESTING, HANDOFF, LOOP_handover_specification
├── tools/              make_icons.py, make_push_json.py
└── CLAUDE.md, README.md, .gitignore
```

**The engine split (key decision):**
- **Phases 1 (Dump) & 4 (Execute)** — deterministic. Spec fixes these responses
  word-for-word (e.g. *"Go. Come back when done or stuck."*). Plain code, **zero API
  calls**, tested character-for-character.
- **Phases 2 (Triage), 3 (Commit), 5 (Close)** + stuck-shrink + interrupt-triage — LLM
  calls demanding **strict JSON**; `lib/workflow.js` parses tolerantly (code fences /
  prose) and **validates** (trims >3 substeps for Hard Rule 2, coerces unknown buckets to
  SOMEDAY). The UI only sees validated shapes.

**State:** single source of truth in `lib/state.js`; every change goes through a named
pure transition. `Store` wraps `chrome.storage.local` (injected, so tests use an
in-memory shim). Day rollover auto-carries unfinished TODAY items into tomorrow's dump.

**No content script** — deliberate deviation from spec §7.1. Tab context + switch
detection run in the background worker via the `tabs` API. Same signals, fewer
permissions, easier Web Store review.

## Design system (BetterWayAI dark)

Tokens live in `sidebar.css` `:root` (shared by settings.html).

| Token | Hex | Use |
|---|---|---|
| base bg | `#060B18` | sidebar background |
| surface | `#0D1829` | cards |
| surface-2 | `#122036` | tracks, chips |
| gold | `#F5A623` | primary CTAs, TODAY, accents |
| blue | `#2563EB` | secondary buttons |
| cyan | `#60EFFF` | focus accents |
| green | `#34D399` | success/closed |
| red | `#F87171` | alerts/blockers |

**Fonts:** Plus Jakarta Sans (headings), Inter (body 14px), JetBrains Mono
(labels/eyebrows) — currently a system-font stack; bundling brand WOFF2s is a deferred
polish item. **Icon:** navy `#0C2448` rounded square + gold `#F5A623` border + gold
round-cap up-arrow, generated by `tools/make_icons.py`. **Layout law:** 400px sidebar,
one screen, no scrolling for the #1 card. Clinical, no cheerleading.

## The 5-phase loop + 8 hard rules (core IP)

Encoded in `prompts/system-prompt.md`. Do not water this down.

**Hidden-blocker taxonomy** (the differentiator): `TOO_VAGUE · TOO_BIG · PERFECTIONISM ·
CONTEXT_SWITCH · WAITING · LOW_ENERGY · NO_STAKES`.
**Buckets:** `TODAY · WEEK · SOMEDAY · DELETE` (>1 month untouched = delete candidate).

**HARD RULES (DO NOT OVERRIDE):**
1. One task at a time — never show more than one #1.
2. Never suggest more than 3 sub-steps — else re-triage.
3. If stuck, shrink the task — never add motivation, make the next step smaller.
4. No moralizing — direct and clinical.
5. Close before you open — finish or carry before a new #1.
6. One screen max.
7. Record every blocker — root causes logged, reviewed weekly.
8. Make a call on everything — during triage, never ask clarifying questions.

**Procrastination DNA (the moat):** every uncompleted task logs its root-cause blocker;
the weekly review names the top-3 triggers and proposes **one** concrete change. This
pattern data compounds and is the switching cost. Computed locally in `lib/patterns.js` —
counting doesn't need an LLM.

## Version history v1.0 → v1.4

| Ver | What shipped | Tests |
|---|---|---|
| 1.0.0 | Phase 1 MVP: 5-phase loop, providers (Anthropic/OpenAI/Ollama), background worker, state machine, icons | 27 |
| 1.1.0 | OpenRouter added as 4th provider and made the default | 33 |
| 1.1.1 | Fixed OpenRouter default-model 404 (`claude-3.5-haiku`→`claude-haiku-4.5`); actionable 404 handling; "Using: <slug>" line | 33 |
| 1.2.0 | Voice dictation (`lib/dictation.js`, Web Speech API) on all free-text fields | 34 |
| 1.3.0 | Friendly model dropdown — curated, live-verified OpenRouter tiers + Custom | 34 |
| 1.4.0 | First-run welcome + Procrastination DNA visualization | 36 |

## Known gotchas

1. **OpenRouter model slugs drift.** Hardcoded defaults *will* 404 over time. Verify
   against `https://openrouter.ai/api/v1/models` before shipping a default. Dropdown
   slugs (`settings.js` `PRESET_SLUGS` + `settings.html`) were live-verified 2026-07-09.
2. **Icons are NOT committed** (gitignored). Run `python3 tools/make_icons.py` after
   cloning, or Chrome errors on missing icons. The release zip includes them.
3. **Two copies of `system-prompt.md`** — `prompts/system-prompt.md` (canonical) and
   `extension/prompts/system-prompt.md` (the one Chrome loads). Keep them in sync.
4. **Unpacked-extension updates:** copying files ≠ reload. Click ↻ on the
   `chrome://extensions` card (or Remove + Load unpacked). Verify via the version number.
5. **`chrome.storage.local` persists across reloads.** The first-run welcome only shows
   when history is empty — returning users won't see it. To force it, load from a fresh
   folder path (new extension ID = fresh storage).
6. **Dictation is Chrome/Edge only** (Web Speech API); self-disables elsewhere. Chrome's
   recognizer sends audio to Google's cloud (no key needed; privacy note). Side-panel vs
   tab behavior wasn't fully verified — OS dictation (Win+H / Fn-Fn) is the fallback.
7. **No build step.** Vanilla ES modules. `background.js` is a service worker
   (`self`, not `window`) — shared code must not assume `window`.
8. **Tests are `node --test`, no DOM.** Pure logic is covered; DOM-bound UI
   (`sidebar.js`, `settings.js`) is verified manually per `TESTING.md`.
9. **Free-tier OpenRouter models** can be slower/rate-limited — flagged inline in the picker.
10. **Branch housekeeping:** merged feature branches (`feat/extension-mvp`,
    `feat/first-run-polish`) may still be listed. Delete them, and consider enabling
    repo Settings → "Automatically delete head branches."

## What's left

**Immediate**
- [ ] Delete merged branches; enable auto-delete head branches.
- [ ] Optional reliability win: **escalate-on-failure** — if a cheap model returns
  unparseable/empty JSON, retry once on a stronger model (pairs with the validators).

**Finish Phase 1 (spec Weeks 3–4)**
- [ ] Bundle brand WOFF2 fonts (currently system stack).
- [ ] Chrome Web Store listing + assets + submission ($5 one-time).
- [ ] Landing page on `loop.betterwayai.com`.
- [ ] 3-min demo video.
- [ ] The real bar (spec): use it for **5 real days** before judging.

**Phase 2 — SaaS (spec §7.2):** FastAPI + PostgreSQL + Redis on the Hostinger VPS;
`/dump /triage/confirm /checkin /close /patterns /weekly-review /sync /analytics`; auth
(Clerk/Supabase); pattern-analytics dashboard. `saas/` is a placeholder.

**Phase 3 — Agents (spec §7.3):** Telegram bot, Discord slash commands, OpenClaw/Gazoo
skill. `agents/` is a placeholder.

**Open product questions (spec §17):** pricing model (Free/Pro/Team/LTD), free-tier
default model (Ollama vs cloud), open-sourcing the system prompt as marketing. Branding
resolved (BetterWayAI dark; name = LOOP).
