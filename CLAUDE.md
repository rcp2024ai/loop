# CLAUDE.md — LOOP Project

## Project Purpose
LOOP is a Chrome/Firefox sidebar extension and SaaS product that eliminates
daily procrastination by running a proprietary 5-phase workflow: Brain Dump →
Triage & Decode → Commit to One → Execute & Check-In → Close the Loop.

## Stack
- **Extension**: Manifest V3, vanilla JS ES modules, Chrome Side Panel API
- **Backend (Phase 2)**: Python FastAPI, PostgreSQL, Redis
- **Hosting**: Hostinger VPS
- **AI**: BYO API key (Anthropic, OpenAI, local Ollama)
- **Marketing**: WordPress/Divi 5 on betterwayai.com subdomain

## Standards & Conventions

### Code Style
- Keep bundle small — no heavy frameworks in the extension
- One screen max — every UI output fits in a 400px sidebar
- Dark mode default, **BetterWayAI theme**: base `#060B18`, surface `#0D1829`,
  gold `#F5A623` (primary CTAs), blue `#2563EB` (secondary), cyan `#60EFFF`
  (focus accents). Brand-mark navy is `#0C2448` (icon only — distinct from UI surfaces).
- Type: Inter body (14px), Plus Jakarta Sans headings, JetBrains Mono labels/eyebrows
- Functions are small and named after what they do, not how

### Workflow Rules (HARD RULES — DO NOT OVERRIDE)
1. ONE TASK AT A TIME — never show more than one #1 task
2. NEVER suggest more than 3 sub-steps — if more needed, re-triage
3. IF STUCK, SHRINK THE TASK — don't add motivation, make next step smaller
4. NO MORALIZING — no cheerleading, be direct and clinical
5. CLOSE BEFORE YOU OPEN — finish or carry before picking new task
6. ONE SCREEN MAX — every output fits on a phone screen
7. RECORD EVERY BLOCKER — log root causes, review weekly

### File Organization
- System prompt lives in `prompts/system-prompt.md` — never inline it
  (`extension/prompts/system-prompt.md` is the shipped copy; keep them in sync)
- All AI API calls go through `lib/llm.js` — no direct fetch calls elsewhere
- State transitions go through `lib/state.js` — no direct state mutation
- Tests mirror source structure in `tests/` directory

### Definition of Done
A feature is done when:
1. It works in the sidebar at 400px width
2. It handles the error case (API failure, empty input, malformed response)
3. It has at least one test covering the happy path
4. It does not exceed one screen of output
5. It follows the 7 hard rules above

### Checks Before Calling Work Finished
- [ ] Does it work at 400px sidebar width?
- [ ] Does it handle API failure gracefully?
- [ ] Does it follow all 7 hard rules?
- [ ] Is there a test?
- [ ] Does the output fit on one screen?

## What I Like
- Simple, one-line commands and explanations
- Direct, clinical tone — no fluff
- Dark mode UI
- Minimal chrome — content IS the interface
- Bottom command bar (thumb-reachable, ergonomic)

## What I Don't Like
- Cheerleading or motivational language
- Showing multiple tasks at once
- Long outputs that require scrolling
- Over-engineered abstractions for simple tasks
- Frameworks where vanilla JS suffices

## How to Work Here
- Read the full handover document (`docs/LOOP_handover_specification.md`)
  before starting any work
- The 5-phase workflow is the core IP — implement it exactly as specified
- Ask before deleting or restructuring existing files
- Test against real daily usage, not synthetic data
