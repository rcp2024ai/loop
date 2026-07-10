# LOOP — Close every task, every day

A Chrome side-panel extension by [BetterWayAI](https://betterwayai.com) that eliminates daily
procrastination by running a 5-phase loop:

**Brain Dump → Triage & Decode → Commit to One → Execute & Check-In → Close the Loop**

Unlike brain-dump apps that just make lists, LOOP identifies the *hidden blocker* behind each
task (too vague? too big? no stakes?), enforces one-task-at-a-time focus, and learns your
procrastination patterns week over week.

## Monorepo layout

| Folder | What | Status |
|---|---|---|
| `extension/` | Chrome side-panel extension (Manifest V3, vanilla JS) | **Phase 1 — this is the MVP** |
| `saas/` | FastAPI backend + dashboard (sync, analytics) | Phase 2 — planned |
| `agents/` | Telegram / Discord / OpenClaw integrations | Phase 3 — planned |
| `prompts/` | The encoded workflow (system prompt) — the core IP | ✅ |
| `docs/` | Handover spec + plain-language build guide | ✅ |
| `tools/` | Icon generator | ✅ |

## Install (2 minutes)

1. **Icons** (one-time, only when cloning from git): `python3 tools/make_icons.py`
   (needs Pillow: `pip install pillow`). The release zip already includes them.
2. Open `chrome://extensions`, toggle **Developer mode** (top right).
3. Click **Load unpacked** → select the `extension/` folder.
4. Click the LOOP toolbar icon → the sidebar opens.
5. Gear icon → Settings → pick a provider (OpenRouter is preselected):
   - **OpenRouter** (recommended) — one key, 100+ models (Claude, GPT, Llama, and more).
     Free account at [openrouter.ai](https://openrouter.ai) → Keys → Create Key. Pick a
     model from a plain-language dropdown (fast/cheap → most capable, plus a free tier) —
     no slugs to memorize; a "Custom…" option accepts any slug for power users.
   - **Anthropic / OpenAI** — paste your own key if you already have one with them.
   - **Ollama** — free local inference, zero cost (`ollama serve` must be running).
6. Type — or tap the 🎙 mic and just talk — your first brain dump. Hit **That's everything →**.

## The daily loop

| Phase | You | LOOP |
|---|---|---|
| 1 · Dump | Empty your head — type or 🎙 talk, messy is fine | "Got it. Is there more? Keep going." |
| 2 · Triage | Review the table | Buckets everything (TODAY / WEEK / SOMEDAY / DELETE) + names each task's hidden blocker |
| 3 · Commit | Confirm | Picks exactly ONE #1 task: first action, definition of done, estimate |
| 4 · Execute | `starting` / `done` / `stuck` / `procrastinating` | Protocol responses. Stuck? It shrinks the step. Idle 20 min? A gentle nudge. |
| 5 · Close | Say what really happened | ✅/⏳/❌ against the morning list, logs root causes, drafts tomorrow's #1 |

## Development

```bash
cd extension
npm test          # 36 tests: state machine, protocol strings, validators, DNA bars
```

No build step. No frameworks. Vanilla ES modules, loaded directly by Chrome.

## The 7 hard rules

1. One task at a time. 2. Never more than 3 sub-steps. 3. If stuck, shrink the task.
4. No moralizing. 5. Close before you open. 6. One screen max. 7. Record every blocker.

See [`CLAUDE.md`](CLAUDE.md) for working conventions,
[`docs/BUILD-GUIDE.md`](docs/BUILD-GUIDE.md) for the plain-language tour of how it all works,
[`docs/TESTING.md`](docs/TESTING.md) for a full local test walkthrough,
and [`docs/HANDOFF.md`](docs/HANDOFF.md) if you're picking up the project (architecture, version history, gotchas, roadmap).
