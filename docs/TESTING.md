# Testing LOOP locally

A full walkthrough — install to first closed loop — written for someone doing this
for the first time. Budget about 15 minutes.

## 1. Install (2 min)

- Download the release zip and unzip it (or clone the repo and run
  `python3 tools/make_icons.py` first — needs `pip install pillow` — since generated
  icons aren't committed; see the repo README).
- Chrome → address bar → type `chrome://extensions` → Enter.
- Toggle **Developer mode** (top-right corner).
- Click **Load unpacked** → select the unzipped folder (the one that directly
  contains `manifest.json`).
- A LOOP icon appears in your toolbar. Click it — the sidebar opens on the right.

## 2. Connect a provider (2 min)

Click the **⚙ gear icon** at the top of the sidebar — that opens the full Settings tab.

**Fastest path — OpenRouter (preselected by default):**
1. Go to [openrouter.ai](https://openrouter.ai) → sign up (free) → **Keys** → **Create Key**.
2. Copy the key (starts with `sk-or-`).
3. Back in LOOP Settings, paste it into **API key**.
4. Pick a **Model** from the dropdown — plain-language tiers, no slugs to type:
   ⚡ Fast & cheap (GPT-4o mini) · ⚖️ Balanced (Claude Haiku 4.5, the default) ·
   🧠 Most capable (Claude Sonnet 4.5) · 🆓 Free (Llama 3.3 70B). Pick **✍️ Custom…**
   to type any slug from [openrouter.ai/models](https://openrouter.ai/models) yourself.
   The **"Using: …"** line always shows the exact model that will be sent.
5. Click **Test connection** — should show "Connected: OK" within a couple seconds.
6. Click **Save**.

**Alternatives**, if you'd rather:
- **Anthropic / OpenAI** — paste a key you already have with either directly.
- **Ollama** — install [ollama.com](https://ollama.com), run `ollama serve`, pull a
  model (`ollama pull llama3.2`), select Ollama as the provider. No key, zero cost.

## 3. Walk one full loop (8-10 min)

This exercises every phase in one sitting.

1. **Dump.** On first ever open you'll see a short **welcome** explaining the 5-step
   flow with a **"Try it with an example"** button — tap it to auto-fill a realistic
   messy dump, then hit "That's everything →" to watch triage work instantly. (The
   welcome disappears once you've closed your first loop.) Otherwise, type something
   messy — or
   tap the **🎙 mic button** next to the textarea and just talk (Chrome will ask for
   microphone access the first time; click Allow). Either way, real is better than tidy:
   > fix the gazoo routing bug, write readme for odin, update landing page hero, email the supplier about pricing, learn more about the new claude model, renew the domain

   Click **Dump**. It replies "Got it. Is there more? Keep going." — add another line
   if you like, then click **That's everything →**.

   *Dictation notes:* the mic button turns red and pulses while listening; tap it again
   to stop (it also auto-stops after a few seconds of silence). It only works in
   Chrome/Edge — Firefox has no built-in speech API, so the button disables itself
   there and typing is the only path. If the mic doesn't work for any reason, your
   operating system's own dictation works in this textarea too, with zero setup:
   **Windows** → Win+H, **Mac** → tap Fn twice (or your configured dictation shortcut).

2. **Triage.** Within a few seconds, a table appears: every item bucketed
   TODAY / WEEK / SOMEDAY / DELETE, with a hidden-blocker tag on TODAY items (e.g. a
   ⚑ NO_STAKES flag on the domain renewal). Tap any bucket chip to cycle it if you
   disagree with the call — LOOP makes a call on everything rather than asking you to
   sort it itself; correcting it is expected and fine. Click **Pick my #1**.

3. **Focus.** One task card only: name, first action, "done when," time estimate.
   - Click **starting** → "Go. Come back when done or stuck."
   - Try **stuck** once, just to see it: type a reason, click **Shrink it** — you get
     back one smaller physical step, not encouragement.
   - Try **procrastinating** once too — a 5-minute countdown appears, then a nudge to
     do just the first action.
   - Click **done** when ready → it asks you to verify against "done when" →
     **Yes — closed ✓**. It automatically pulls your next #1 from the TODAY list.

4. **Close.** Once TODAY is empty (or whenever you're ready to stop for the day),
   click **close the loop for today**. Type what actually happened, click
   **Close the loop →**. You'll get a ✅ / ⏳ / ❌ summary against this morning's list,
   a one-line pattern note, and a box to set tomorrow's #1 before you go.

## 4. Check the extras

- **Settings → Usage** — call count and token totals, so the real cost is visible as
  you go (tiny with Haiku-class models).
- **Settings → Your procrastination DNA** — empty until you've closed a few days;
  that's expected, not a bug.
- Leave the sidebar open and step away for 20+ minutes during Focus — a gold nudge
  banner should appear asking if you're stuck. It checks `chrome.idle` first, so it
  won't fire if your whole machine is idle — only if you're active elsewhere (a real
  procrastination signal, not "you went to lunch").

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "API key rejected" | Typo, or a key from the wrong provider | Re-copy the key; make sure the selected Provider matches where it came from |
| "Model not recognized by the provider" / "Provider error (HTTP 404)" | The model slug doesn't exist (typo, or the provider retired/renamed it) | Settings → check the "Using: …" line under Model — that's the *exact* string being sent. For OpenRouter, confirm it's still listed at openrouter.ai/models and paste a current one into the Model field |
| "Could not reach Ollama" | `ollama serve` isn't running | Open a terminal, run `ollama serve`, click Test connection again |
| "Model not found locally" (Ollama) | The model was never pulled | Run `ollama pull <model>` for whatever's set in Settings → Model |
| Nothing happens after "That's everything" | Network blocked, provider down, or bad key | Settings → Test connection to isolate it |
| Sidebar looks unstyled / broken | Loaded the wrong folder | The Load-unpacked target must directly contain `manifest.json` |
| Mic button is grayed out | Browser has no speech API (e.g. Firefox) | Use Chrome or Edge for dictation, or type normally — nothing else is affected |
| "Mic blocked" after tapping 🎙 | Denied the browser's mic permission prompt | Click the site/extension info icon in Chrome's address-bar area, allow Microphone, reload |

## Automated tests (the code itself, not the UI)

```bash
cd extension
npm test
```

Covers the state machine, the spec-exact protocol strings, the JSON validators, and
provider selection — currently 34 checks, all fast, no network calls. Dictation itself
is a real-browser feature (Web Speech API) with no headless equivalent in this test
runner, so its start/stop/transcribe behavior is verified by hand per the walkthrough
above, not by `npm test`.

## The real test

Per the build order in the handover spec: use it for 5 real days before judging it.
The bar is "did the loop actually close daily," not "is the code clever."
