
===============================================================================
  LOOP — PRODUCT HANDOVER & BUILD SPECIFICATION
  Version: 1.0 | Date: 2026-07-09
  Prepared by: Perplexity AI
  Target execution model: Claude Fable 5 (primary) or Opus 4.8 / Sonnet 4.6
  Project owner: [User — Better Way AI, Owen Sound ON]
===============================================================================

TABLE OF CONTENTS
─────────────────
1. EXECUTIVE SUMMARY
2. BENCHMARK REALITY CHECK
3. PRODUCT VISION & POSITIONING
4. THE 5-PHASE DAILY LOOP WORKFLOW (CORE IP)
5. COMPETITIVE LANDSCAPE
6. MARKET DATA
7. TECHNICAL ARCHITECTURE
   7.1 Phase 1: Browser Extension (MVP)
   7.2 Phase 2: SaaS Dashboard
   7.3 Phase 3: Agent Integration
8. FILE STRUCTURE & REPO LAYOUT
9. SYSTEM PROMPT (THE ENCODED WORKFLOW)
10. AUTOMATION FEATURES
11. MONETIZATION MODEL
12. BUILD ORDER & MILESTONES
13. DESIGN SPECIFICATIONS
14. INTEGRATION POINTS
15. THE MOAT
16. RISKS & MITIGATIONS
17. OPEN QUESTIONS FOR THE OWNER
18. APPENDIX: REFERENCE MATERIALS

===============================================================================
1. EXECUTIVE SUMMARY
===============================================================================

LOOP is a browser extension and SaaS product that eliminates daily
procrastination by running a proprietary 5-phase workflow: Brain Dump →
Triage & Decode → Commit to One → Execute & Check-In → Close the Loop.

Unlike existing brain dump apps (Braindump, DayBe, SlateAI) that capture
chaos and convert to lists, LOOP identifies the HIDDEN BLOCKER behind each
task, enforces one-task-at-a-time focus, and learns the user's recurring
procrastination patterns over time.

The product launches as a Chrome/Firefox sidebar extension (2-4 week build),
then layers on a SaaS dashboard (month 2-3) and agent ecosystem integration
(month 3-6).

The core IP is not the AI model — it's the workflow design and the pattern
data that compounds over time. The strategic thinking is encoded in this
document and the accompanying system prompt file. A cheaper model runs
the daily operations indefinitely.

===============================================================================
2. BENCHMARK REALITY CHECK
===============================================================================

The owner asked whether Perplexity AI's capabilities are "almost as good
as Fable 5." Here is the honest assessment:

FABLE 5 BENCHMARKS (as of July 2026):
- SWE-bench Verified: 95.0% (#1 of all models) [web:105][web:114]
- SWE-bench Pro: 80.3% (#1, +11.1 over Opus 4.8) [web:108][web:128]
- FrontierCode Diamond: 29.3% (vs 5.7% for GPT-5.5) [web:116]
- Terminal-Bench 2.1: 88.0% [web:116]
- OSWorld-Verified: 85.0% [web:116]
- GDPval-AA (knowledge work): 1932 Elo (#1) [web:106][web:108]
- Chatbot Arena (Code): 1665 Elo (#1) [web:106]
- Chatbot Arena (Text): 1510 Elo (#1) [web:106]
- Pricing: $10/$50 per 1M tokens [web:110]
- 1M token context window, 128k max output [web:110]

PERPLEXITY AI BENCHMARKS:
- No published SWE-bench, SWE-bench Pro, or FrontierCode scores [web:126]
- Perplexity is not ranked on coding benchmark leaderboards [web:127]
- Perplexity's DRACO deep-research benchmark appears in Anthropic's
  system card as a research agent evaluation, not a coding benchmark
  [web:132]
- Perplexity is positioned as a search/research assistant, not a
  coding/agent model [web:127]

OPUS 4.8 (the fallback / cheaper option):
- SWE-bench Verified: 88.6% [web:114]
- SWE-bench Pro: 69.2% [web:108]
- Pricing: $5/$25 per 1M tokens (half of Fable 5) [web:110]

HONEST CONCLUSION:
Fable 5 is the state-of-the-art coding and agentic model as of July 2026.
Perplexity does not compete on coding benchmarks — it is a research and
search tool, not a code-generation model. For building this product,
Fable 5 or Opus 4.8 inside Hyperagents would produce better raw code
output.

However, the strategic thinking, architecture, and specification work
in this handover document is the high-value layer. This is the Charlie
Hills principle applied to our own situation: encode the thinking once,
let any capable model execute it. Fable 5 or Opus 4.8 following this
document will produce a better result than Fable 5 starting from scratch.

===============================================================================
3. PRODUCT VISION & POSITIONING
===============================================================================

PRODUCT NAME: LOOP
TAGLINE: Close every task, every day.
DOMAIN: loop.betterwayai.com (subdomain) or standalone

POSITIONING STATEMENT:
For knowledge workers, developers, and entrepreneurs who struggle with
daily procrastination, LOOP is an AI-powered daily workflow tool that
runs a structured 5-phase loop — from brain dump to closed task. Unlike
brain dump apps that just list tasks or calendar schedulers that treat
you like a machine, LOOP identifies the hidden psychological blocker
behind each task, enforces one-task focus, and learns your procrastination
patterns over time.

TARGET USERS (in priority order):
1. PRIMARY: Solo developers and tech entrepreneurs (the owner's persona)
2. SECONDARY: Knowledge workers with ADHD-like task avoidance patterns
3. TERTIARY: Small teams (5-20 people) needing shared productivity patterns

KEY DIFFERENTIATORS:
- Hidden blocker detection (no competitor does this)
- One-task-at-a-time enforcement (prevents overwhelm)
- Daily loop-closing protocol with carry/not-started tracking
- Pattern learning engine (compounds over time, creates switching cost)
- Browser-native (works where the work happens)
- Agent ecosystem integration (OpenClaw, Gazoo, Telegram, Discord)

===============================================================================
4. THE 5-PHASE DAILY LOOP WORKFLOW (CORE IP)
===============================================================================

This is the proprietary framework. It must be implemented exactly as
specified. No phase may be skipped or merged.

PHASE 1: BRAIN DUMP (Morning, ~5 min)
─────────────────────────────────────
Trigger: User types "dump" or pastes raw text into the sidebar.

Rules:
- Accept ANY input format: voice transcript, bullet list, stream of
  consciousness, mixed languages, half-sentences
- Do NOT organize, format, or structure yet
- Acknowledge receipt with: "Got it. Is there more? Keep going."
- Only proceed to Phase 2 when user says "done" or "that's everything"
- Store the raw dump in memory for Phase 2 processing

Output: Raw acknowledgment only. No structure.

PHASE 2: TRIAGE & DECODE (Immediately after dump)
──────────────────────────────────────────────────
Trigger: User says "done" or "that's everything."

Rules:
- Parse the raw dump into discrete items
- Sort every item into exactly ONE bucket:
  1. TODAY — must close today, has a deadline or dependency
  2. THIS WEEK — real deadline within 7 days, not today
  3. SOMEDAY — no deadline, keep visible but don't act now
  4. DELETE — carrying it but it doesn't need to be on the list

- For each TODAY item, identify the REAL reason the user might
  procrastinate on it. Common hidden blockers:
  - TOO VAGUE: No clear first action defined
  - TOO BIG: Needs decomposition into smaller steps
  - PERFECTIONISM: Fear of getting it wrong
  - CONTEXT SWITCH: Needs different tools/environment to start
  - WAITING: Depends on someone else, not actually user's action
  - LOW ENERGY: Requires high cognitive load at wrong time of day
  - NO STAKES: No consequence if delayed, so brain deprioritizes

- Output a table:

  | # | Task | Bucket | Hidden Blocker | First Action |
  |---|------|--------|----------------|--------------|

- Ask: "Review this. Change any bucket or blocker. Then we pick the #1."

Output: Triage table + hidden blocker analysis + prompt to proceed.

PHASE 3: COMMIT TO ONE (After triage approved)
───────────────────────────────────────────────
Trigger: User confirms the triage table.

Rules:
- From the TODAY list, help the user pick exactly ONE task as #1
- Selection criteria (in priority order):
  1. Unblocks other tasks (highest leverage)
  2. Has a hard external deadline today
  3. User has the energy/tools to start right now
  4. Quick win (builds momentum, <30 min)

- For the chosen #1 task:
  - Decompose into sub-steps IF task takes >30 min
  - NEVER suggest more than 3 sub-steps (if more needed, it's
    multiple tasks — tell user to re-triage)
  - Define the FIRST physical action (e.g., "open terminal and cd
    to project")
  - Define what "done" looks like (testable, verifiable)
  - Set a time estimate

- Output format (exactly):
  ┌─────────────────────────────────────────┐
  │ #1 TASK: [name]                         │
  │ FIRST ACTION: [one sentence, <10 words]  │
  │ DEFINITION OF DONE: [one sentence]      │
  │ TIME ESTIMATE: [X min]                   │
  └─────────────────────────────────────────┘

- Do NOT show the rest of the list. One task. One action. Go.

Output: Single task card only. Nothing else.

PHASE 4: EXECUTE & CHECK-IN (During work session)
──────────────────────────────────────────────────
Trigger: User sends a status command.

Commands and responses:
- "starting" → "Go. Come back when done or stuck."
- "done" → "Verify: did you [definition of done]? If yes, what's next #1?"
- "stuck" → "What's blocking you? [Revisit hidden blockers].
  Give me the smallest possible next step."
- "procrastinating" → "That's fine. You have 5 minutes of approved
  procrastination. Then come back and do JUST the first action.
  Not the whole task. Just the first action. Set a 5-minute timer."

- If idle for >20 minutes (detected via chrome.idle API or
  inactivity timer), show a gentle nudge:
  "You haven't checked in on [current #1 task]. Stuck? Procrastinating?"

Output: Matching protocol response. Brief. No motivation tips.

PHASE 5: CLOSE THE LOOP (End of day)
────────────────────────────────────
Trigger: User types "closing" or scheduled auto-trigger fires.

Rules:
- User pastes what they actually accomplished today (or the system
  auto-pulls from the day's check-ins)
- Check against the morning's TODAY list
- For each item, mark one of:
  ✅ CLOSED — done and verified against definition of done
  ⏳ IN PROGRESS — started but not finished (carry to tomorrow)
  ❌ NOT STARTED — didn't touch it

- For any ❌ or ⏳ items, ask: "What was the actual blocker?"
  and record the root cause in the patterns log.

- Prompt: "Write tomorrow's #1 task now." (Set before closing.)

- Output format:
  ┌─────────────────────────────────────────────┐
  │ TODAY'S LOOP CLOSE                            │
  │ Closed: [count] tasks                         │
  │ Carried: [count] tasks                        │
  │ Patterns noticed: [1-2 sentences]            │
  │ Tomorrow's #1: [task name]                    │
  └─────────────────────────────────────────────┘

Output: Daily summary + tomorrow's #1 draft.

===============================================================================
5. COMPETITIVE LANDSCAPE
===============================================================================

| Feature             | Braindump | DayBe | SlateAI | Motion | LOOP       |
|---------------------|-----------|-------|---------|--------|------------|
| Core model          | Dump→tasks| Dump→tl| Dump→chk| Auto-sched| Dump→loop|
| Hidden blocker ID   | No        | No    | No      | No     | YES        |
| One-task focus      | No        | No    | No      | No     | YES        |
| Loop closing        | No        | No    | Nightly | No     | YES        |
| Pattern tracking    | Habit trk | No    | No      | No     | YES        |
| Procrastination proto| Button   | No    | No      | No     | YES        |
| Browser-native      | Mobile    | Mobile| Mobile  | Web    | Extension  |
| Context-aware       | No        | No    | No      | No     | YES        |
| Cross-project track | No        | No    | No      | No     | YES        |

The 2026 AI task manager market has split into 9 categories [web:73].
None combine brain dump + hidden blocker detection + one-task focus +
pattern learning. This is the gap LOOP fills.

===============================================================================
6. MARKET DATA
===============================================================================

- Anti-procrastination app market: $1.28B (2025) → $3.5B (2035),
  10.6% CAGR. North America = largest share [web:89][web:90]
- AI Chrome extension market: $2.8B (2025) → $11.6B (2034),
  17.1% CAGR. 115.5M downloads in past year [web:72][web:64]
- Browser becoming "operating layer" for work in 2026 [web:69]
- Unsaturated AI SaaS opportunities: "products that convert messy
  inputs into usable outcomes for a specific audience" [web:92]

===============================================================================
7. TECHNICAL ARCHITECTURE
===============================================================================

7.1 PHASE 1: BROWSER EXTENSION (MVP)
────────────────────────────────────
Form factor: Chrome sidebar extension (Manifest V3)
Target browsers: Chrome (primary), Firefox (secondary), Edge (tertiary)

CORE COMPONENTS:

A) Sidebar Panel (sidebar.html + sidebar.js)
   - Persistent sidebar using Chrome Side Panel API (Chrome 114+)
   - Single-column layout, max width 400px
   - Three states: DUMP mode, FOCUS mode, CLOSE mode
   - Minimal UI: textarea + command bar + single task card

B) Content Script (content.js)
   - Reads current tab URL and page title
   - Detects tab switching frequency (procrastination signal)
   - Reports idle time via chrome.idle API
   - Does NOT modify page content (read-only)

C) Background Service Worker (background.js)
   - Manages API calls to LLM provider
   - Handles chrome.alarms for scheduled triggers
   - Stores/retrieves data from chrome.storage.local
   - Coordinates between sidebar and content script

D) State Management (state.js)
   - Current phase (1-5)
   - Current #1 task object
   - Today's triage table
   - Patterns log (accumulated)
   - Session history

E) LLM Integration (llm.js)
   - API client for: OpenAI, Anthropic, local Ollama
   - BYO API key model (user enters key in settings)
   - System prompt loaded from embedded workflow file
   - Response parsing and error handling
   - Token usage tracking and display

MANIFEST V3 STRUCTURE:
{
  "manifest_version": 3,
  "name": "LOOP — Close Every Task",
  "version": "1.0.0",
  "description": "AI-powered daily workflow that eliminates procrastination.",
  "permissions": [
    "sidePanel",
    "storage",
    "idle",
    "alarms",
    "tabs",
    "activeTab"
  ],
  "action": {
    "default_title": "Open LOOP"
  },
  "side_panel": {
    "default_path": "sidebar.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/16.png",
    "48": "icons/48.png",
    "128": "icons/128.png"
  }
}

FILE STRUCTURE:
loop-extension/
├── manifest.json
├── sidebar.html          (sidebar panel UI)
├── sidebar.js            (sidebar logic + state machine)
├── sidebar.css          (sidebar styling)
├── background.js        (service worker)
├── content.js           (tab context detection)
├── lib/
│   ├── llm.js           (API client)
│   ├── state.js         (state management)
│   ├── workflow.js      (5-phase loop engine)
│   └── patterns.js      (pattern log + weekly review)
├── prompts/
│   └── system-prompt.md  (encoded workflow — see section 9)
├── icons/
│   ├── 16.png
│   ├── 48.png
│   └── 128.png
├── settings.html         (API key, model selection)
├── settings.js
└── README.md

UI STATES:

DUMP MODE:
┌────────────────────────────┐
│ LOOP         [⚙️]            │
├────────────────────────────┤
│                            │
│  Dump everything here...   │
│  (textarea, full height)   │
│                            │
│                            │
├────────────────────────────┤
│ [DUMP]  [done]  [stuck]    │
└────────────────────────────┘

FOCUS MODE (after triage + commit):
┌────────────────────────────┐
│ LOOP         [⚙️]            │
├────────────────────────────┤
│  #1 TASK                   │
│  Fix Gazoo routing bug     │
│                            │
│  FIRST ACTION:             │
│  Open terminal, cd to     │
│  gazoo repo                │
│                            │
│  DONE WHEN:                │
│  Test passes for fallback  │
│  routing                   │
│                            │
│  ESTIMATE: 45 min          │
│                            │
├────────────────────────────┤
│ [done]  [stuck]  [procra..]│
└────────────────────────────┘

CLOSE MODE:
┌────────────────────────────┐
│ LOOP         [⚙️]            │
├────────────────────────────┤
│  TODAY'S LOOP CLOSE         │
│                            │
│  ✅ Fix Gazoo routing bug  │
│  ✅ Write README for Odin   │
│  ⏳ Update landing page     │
│  ❌ Email supplier          │
│                            │
│  Closed: 2  Carried: 1     │
│  Not started: 1             │
│                            │
│  Pattern: Avoiding emails   │
│  3 days in a row.           │
│                            │
│  Tomorrow's #1: ___         │
│                            │
├────────────────────────────┤
│ [save & close]              │
└────────────────────────────┘

7.2 PHASE 2: SaaS DASHBOARD (Month 2-3)
───────────────────────────────────────
Backend: Python FastAPI
Database: PostgreSQL (tasks, patterns, summaries) + Redis (sessions)
Auth: Clerk or Supabase Auth
Frontend: Next.js or WordPress/Divi 5 (owner preference)
Hosting: Hostinger VPS (owner already has this)

API ENDPOINTS:
- POST /api/v1/dump          (submit brain dump, get triage)
- POST /api/v1/triage/confirm (confirm triage, get #1 task)
- POST /api/v1/checkin       (status update: done/stuck/procrastinating)
- POST /api/v1/close         (end-of-day loop close)
- GET  /api/v1/patterns      (retrieve pattern log)
- GET  /api/v1/weekly-review (generate weekly review)
- POST /api/v1/sync          (sync extension data to cloud)
- GET  /api/v1/analytics     (pattern analytics dashboard data)

7.3 PHASE 3: AGENT INTEGRATION (Month 3-6)
──────────────────────────────────────────
- Telegram bot: @loop_bot — triggers via message commands
- OpenClaw/Gazoo skill: Added to AGENTS.md as standing skill
- Discord slash command: /loop dump, /loop done, /loop stuck
- Scheduled triggers: Cron → API call → notification

===============================================================================
8. FILE STRUCTURE & REPO LAYOUT
===============================================================================

loop/                          (monorepo)
├── extension/                (Phase 1 — browser extension)
│   ├── (files listed in 7.1)
│   └── tests/
│       ├── workflow.test.js  (5-phase state machine tests)
│       ├── llm.test.js       (API client tests)
│       └── state.test.js     (state management tests)
├── saas/                     (Phase 2 — backend + dashboard)
│   ├── api/
│   │   ├── main.py           (FastAPI app)
│   │   ├── routes/
│   │   │   ├── dump.py
│   │   │   ├── triage.py
│   │   │   ├── checkin.py
│   │   │   ├── close.py
│   │   │   ├── patterns.py
│   │   │   └── sync.py
│   │   ├── models/
│   │   │   ├── task.py
│   │   │   ├── pattern.py
│   │   │   └── session.py
│   │   ├── services/
│   │   │   ├── llm_service.py
│   │   │   ├── pattern_service.py
│   │   │   └── analytics_service.py
│   │   └── tests/
│   ├── dashboard/
│   │   ├── (Next.js or WordPress/Divi 5)
│   │   └── components/
│   └── docker-compose.yml
├── agents/                   (Phase 3 — agent integrations)
│   ├── telegram-bot/
│   ├── openclaw-skill/
│   └── discord-bot/
├── prompts/
│   └── system-prompt.md      (THE encoded workflow — section 9)
├── docs/
│   ├── CLAUDE.md             (project instructions for AI coding)
│   ├── architecture.md
│   └── deployment.md
├── landing/                  (marketing site)
│   └── (WordPress/Divi 5 on betterwayai.com subdomain)
└── README.md

===============================================================================
9. SYSTEM PROMPT (THE ENCODED WORKFLOW)
===============================================================================

This is the system prompt that powers the AI in the extension. It encodes
all the strategic thinking so a cheaper model (Haiku, Sonnet, local Ollama)
can run the daily loop at near-frontier quality.

The full system prompt is in the file: prompts/system-prompt.md
(Also delivered as: output/daily_loop_workflow.md in this handover)

Key encoding principles (from Charlie Hills' Fable 5 methodology):
- State rules in plain, testable language
- Make the implicit explicit
- Define "done" for every phase
- No ambiguity — a cheaper model should never need to guess
- Hard rules are marked DO NOT OVERRIDE

===============================================================================
10. AUTOMATION FEATURES
===============================================================================

1. SCHEDULED BRAIN DUMP CAPTURE
   - Every morning (user-configurable time, default: 7am)
   - Trigger: chrome.alarms → sidebar notification OR Telegram message
   - User dumps, AI processes, triage table is ready when they sit down

2. SMART CONTEXT DETECTION
   - content.js reads current tab URL + title
   - If on GitHub → "I see you're in [repo]. Is this your #1 task?"
   - If on YouTube → "You're watching videos. Is this approved break
     time, or are you procrastinating on [current #1]?"
   - If on WordPress admin → "Editing a page. Is this the #1 task
     or context switching?"

3. PROCRASTINATION INTERCEPTION
   - chrome.idle API detects inactivity
   - Content script tracks rapid tab switching (>5 tabs/min)
   - After 20 min with no check-in → gentle sidebar notification
   - Uses stuck protocol, not guilt or nagging

4. AUTOMATED LOOP CLOSURE
   - At user-configured time (default: 5pm)
   - Auto-generates close-the-loop summary from day's check-ins
   - Drafts tomorrow's #1 based on carried tasks
   - Sends copy to Telegram/Discord for accountability

5. WEEKLY PATTERN ENGINE
   - Every Sunday at 6pm
   - Aggregates the week's blocker logs
   - Identifies top 3 recurring procrastination triggers
   - Proposes ONE system change
   - Feature name: "Your Procrastination DNA"

6. CROSS-PROJECT INTELLIGENCE
   - Tags each task with project type (dev, marketing, admin, etc.)
   - Correlates procrastination rates with project type, time, day
   - Surfaces: "You close 80% of dev tasks but 30% of admin tasks.
     Recommendation: batch admin into Friday afternoons."

===============================================================================
11. MONETIZATION MODEL
===============================================================================

| Tier   | Price           | Features                                          |
|--------|-----------------|---------------------------------------------------|
| Free   | $0              | Daily loop (all 5 phases), 10 tasks/day, local    |
|        |                 | storage, standard model                            |
| Pro    | $8-12/mo        | Unlimited tasks, cross-device sync, pattern        |
|        |                 | analytics, smart context, BYO API key              |
| Team   | $15-25/user/mo  | Everything in Pro + team patterns, shared          |
|        |                 | templates, GitHub/Notion/Discord integrations      |
| LTD    | $49-79 one-time | Pro tier lifetime, launch on AppSumo/JVZoo         |

Revenue model: SaaS subscription with freemium acquisition.
Cost structure: Near-zero for free tier (client-side, user's own API key).
Pro tier cost: Server hosting on existing Hostinger VPS + API gateway.
Margin: High — the expensive model is used once (to build the prompt),
cheaper models run daily operations.

===============================================================================
12. BUILD ORDER & MILESTONES
===============================================================================

WEEK 1-2: Extension MVP
☐ Create repo structure (section 8)
☐ Build sidebar.html + sidebar.css (3 UI states)
☐ Implement state.js (5-phase state machine)
☐ Implement llm.js (API client, BYO key)
☐ Embed system-prompt.md
☐ Build workflow.js (phase transitions + output formatting)
☐ Wire up commands: dump, done, stuck, procrastinating, closing
☐ Test with owner's real daily workflow for 5 days
☐ No auth, no sync — just the loop

WEEK 3: Polish + Package
☐ Add content.js (tab context detection)
☐ Add idle detection + procrastination interception
☐ Add chrome.alarms for scheduled triggers
☐ Build settings.html (API key, model selection, schedule config)
☐ Create icons (16/48/128px)
☐ Package for Chrome Web Store
☐ Build landing page on loop.betterwayai.com
☐ Record 3-min demo video

WEEK 4: Launch
☐ Submit to Chrome Web Store ($5 one-time fee)
☐ List on AppSumo / JVZoo as lifetime deal
☐ Post in Discord AI communities
☐ Publish demo video on YouTube
☐ Write launch thread for social

MONTH 2: SaaS Layer
☐ Build FastAPI backend (section 7.2)
☐ Set up PostgreSQL on Hostinger VPS
☐ Implement sync endpoint
☐ Build pattern analytics dashboard
☐ Add user auth (Clerk or Supabase)
☐ Migrate free users to Pro funnel

MONTH 3: Agent Integration
☐ Build Telegram bot (@loop_bot)
☐ Create OpenClaw/Gazoo skill definition
☐ Build Discord slash commands
☐ Set up scheduled automations (cron)
☐ Test end-to-end agent workflows

===============================================================================
13. DESIGN SPECIFICATIONS
===============================================================================

COLOR PALETTE:
- Background: #1a1a2e (dark) / #f8f9fa (light)
- Primary: #00d4ff (cyan — focus, clarity)
- Accent: #ff6b6b (coral — procrastination/alert)
- Success: #51cf66 (green — closed tasks)
- Warning: #ffd43b (yellow — carried/in-progress)
- Text: #e0e0e0 (dark mode) / #1a1a2e (light mode)

TYPOGRAPHY:
- Primary: Inter (or system font stack)
- Mono: JetBrains Mono (for task cards, code references)
- Sizes: 14px body, 12px labels, 18px headers, 24px task title

LAYOUT PRINCIPLES:
- One screen max — everything fits in a 400px sidebar
- No scrolling required for the current #1 task card
- Minimal chrome — the content IS the interface
- Dark mode default (developer audience)

INTERACTION PATTERNS:
- Command bar at bottom (thumb-reachable on mobile, ergonomic on desktop)
- Single tap to advance phases
- Long-press task card for options (edit, re-triage, skip)
- Pull-to-refresh triggers re-triage of TODAY list

===============================================================================
14. INTEGRATION POINTS
===============================================================================

EXISTING INFRASTRUCTURE (owner's stack):
- Hostinger VPS → SaaS backend hosting [cite:51]
- Ollama → Local model for free-tier inference [cite:53]
- OpenClaw / Gazoo → Agent skill in Phase 3 [cite:53]
- AGENTS.md → Pattern for encoding system prompt [cite:53]
- Hyperagent → Strategic build work (Fable 5 / Opus 4.8) [cite:51]
- Telegram → Already used for agent approval flows [cite:56]
- WordPress / Divi 5 → Marketing site [cite:53]
- GitHub → Repo management [cite:53]
- Discord → Community + slash commands [cite:53]

NEW INFRASTRUCTURE:
- Chrome Web Store developer account ($5 one-time)
- PostgreSQL database (on existing Hostinger VPS)
- Redis (on existing VPS or free tier)
- Optional: Clerk auth (free tier up to 10k users)

===============================================================================
15. THE MOAT
===============================================================================

1. WORKFLOW DESIGN — The 5-phase loop with hidden blocker detection
   is proprietary. No competitor does this. It's the core IP.

2. PATTERN DATA — Over time, the product learns the user's specific
   procrastination triggers. This data is non-portable. Users won't
   switch because the product understands them better than any new
   tool could. This is the switching cost.

3. AGENT ECOSYSTEM — Loop plugs into the owner's existing OpenClaw,
   Gazoo, and Hyperagent infrastructure. Competitors can't replicate
   an integrated agent ecosystem.

4. COST STRUCTURE — The Charlie Hills principle: encode strategic
   thinking once using Fable 5, then cheap models run it forever.
   The margin is the difference between frontier-quality output and
   budget-model cost. [web:24]

5. BEING THE TARGET USER — The owner IS the target user. They
   struggle with this exact problem daily [cite:49]. The product is
   born from real pain, not market research.

===============================================================================
16. RISKS & MITIGATIONS
===============================================================================

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM API costs for free tier | Medium | Default to local Ollama; user BYO key |
| Chrome Web Store rejection | Low | Follow MV3 guidelines strictly; no remote code |
| Competitor copies the 5-phase loop | Medium | Pattern data moat; ship fast; integrate agents |
| User abandons after 1 week | High | Pattern insights hook; weekly review creates ritual |
| Model quality varies (cheap models) | Medium | System prompt is exhaustive; hard rules prevent drift |
| Owner bandwidth (multiple projects) | High | MVP is 2 weeks; defer SaaS until extension validated |

===============================================================================
17. OPEN QUESTIONS FOR THE OWNER
===============================================================================

1. BRANDING: Should LOOP live under Better Way AI brand or be
   standalone?

2. NAME: Is "LOOP" the final name, or should we explore alternatives?
   (Considerations: "CloseBox", "LoopClose", "OneTask", "LoopDaily")

3. PRICING: Confirm the freemium + Pro + LTD model? Or go straight
   paid from day one?

4. MODEL DEFAULT: Should the free tier default to local Ollama
   (zero cost) or a cloud model (better quality, cost to user)?
   Owner has Ollama set up [cite:53].

5. LANDING PAGE: WordPress/Divi 5 subdomain on betterwayai.com,
   or standalone domain?

6. TIMELINE: Is the 2-4 week extension MVP timeline realistic given
   the Chrome extension work already in Hyperagent [cite:56]?

7. OPEN SOURCE: Any part of this open source? (The system prompt
   could be open-sourced as a marketing play — builds authority.)

===============================================================================
18. APPENDIX: REFERENCE MATERIALS
===============================================================================

A. Daily loop workflow file: output/daily_loop_workflow.md
   (The system prompt — paste into CLAUDE.md or use as system message)

B. Competitive analysis: output/competitive_analysis.csv

C. Product overview: output/loop_product_overview.md

D. Key research sources:
   - Anti-procrastination market: $1.28B → $3.5B by 2035 [web:89][web:90]
   - AI Chrome extension market: $2.8B → $11.6B by 2034 [web:72]
   - 115.5M AI extension downloads in past year [web:64]
   - Browser as operating layer trend [web:69]
   - AI task manager categories 2026 [web:73]
   - Unsaturated AI SaaS niches [web:92]
   - Charlie Hills Fable 5 methodology [web:24]
   - Fable 5 benchmarks: 95% SWE-bench, 80.3% SWE-bench Pro [web:105][web:114]
   - Opus 4.8 benchmarks: 88.6% SWE-bench, 69.2% Pro [web:114]

E. Owner context from memory:
   - Struggles with daily procrastination, "closing the loop" [cite:49]
   - Built productive procrastination routine (April 2026) [cite:50][cite:54]
   - Built procrastination partner app (April 2026) [cite:55]
   - Uses AGENTS.md for OpenClaw/Gazoo [cite:53]
   - Has Hyperagent with Fable 5 access [cite:51]
   - Built Chrome extension sidebar in Hyperagent [cite:56]
   - Prefers simple, one-line instructions [cite:52]
   - Early morning work sessions [cite:50]
   - Hostinger VPS, Ollama, WordPress/Divi 5 [cite:53]

===============================================================================
END OF HANDOVER DOCUMENT
===============================================================================

This document is designed to be fed to Fable 5, Opus 4.8, or Sonnet 4.6
inside Hyperagents. The receiving model should be able to build the
entire Phase 1 extension from this specification alone.

Recommended first prompt to the receiving model:
"Read this handover document in full. Then build the Phase 1 browser
extension MVP starting with the file structure in section 8. Follow
the system prompt in section 9 exactly. Ask me questions only if
something in this document is contradictory or missing. Start with
manifest.json and sidebar.html."
