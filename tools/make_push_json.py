#!/usr/bin/env python3
"""Compose github__push_files params from files on disk.

Writes /tmp/push_<set>.json for each commit set so the (large) file contents
never pass through the model's token output. Referenced via paramsFile.
"""
import json
import os

REPO_ROOT = "/agent/workspace/loop"
OWNER, REPO = "rcp2024ai", "loop"

TRAILER = "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"

SETS = {
    "scaffold": {
        "branch": "main",
        "message": (
            "chore: scaffold LOOP monorepo - docs, conventions, encoded workflow\n\n"
            "Project skeleton for LOOP (BetterWayAI), the 5-phase daily-loop product.\n"
            "- README, CLAUDE.md conventions, .gitignore\n"
            "- docs/: plain-language build guide + full handover specification\n"
            "- prompts/system-prompt.md: the encoded 5-phase workflow (core IP)\n"
            "- saas/ and agents/ placeholders for Phase 2 and Phase 3\n\n"
            + TRAILER
        ),
        "files": [
            ".gitignore",
            "README.md",
            "CLAUDE.md",
            "docs/BUILD-GUIDE.md",
            "docs/LOOP_handover_specification.md",
            "prompts/system-prompt.md",
            "saas/README.md",
            "agents/README.md",
        ],
    },
    "extension": {
        "branch": "feat/extension-mvp",
        "message": (
            "feat: LOOP Phase 1 browser extension MVP\n\n"
            "Chrome side-panel extension (Manifest V3, vanilla ES modules) running the\n"
            "full 5-phase daily loop: Brain Dump -> Triage -> Commit to One -> Execute ->\n"
            "Close the Loop.\n\n"
            "- Deterministic engine for Phases 1 & 4 (zero-cost, spec-exact strings);\n"
            "  LLM with strict-JSON contracts for Phases 2/3/5, validated locally\n"
            "- BYO key: Anthropic / OpenAI / local Ollama\n"
            "- Background worker: scheduled dump/close reminders, weekly review,\n"
            "  20-min idle nudge, tab-switch detection (no content script)\n"
            "- BetterWayAI dark theme; icon generated from brand vector specs\n"
            "- 27 passing tests (state machine, protocol strings, validators)\n"
            "- tools/make_icons.py generates icons/ (not committed; see README)\n\n"
            + TRAILER
        ),
        "files": [
            "extension/manifest.json",
            "extension/package.json",
            "extension/sidebar.html",
            "extension/sidebar.css",
            "extension/sidebar.js",
            "extension/background.js",
            "extension/settings.html",
            "extension/settings.js",
            "extension/lib/state.js",
            "extension/lib/workflow.js",
            "extension/lib/llm.js",
            "extension/lib/patterns.js",
            "extension/prompts/system-prompt.md",
            "extension/tests/state.test.js",
            "extension/tests/workflow.test.js",
            "tools/make_icons.py",
        ],
    },
    "openrouter": {
        "branch": "feat/extension-mvp",
        "message": (
            "feat: add OpenRouter as a provider; make it the default compute\n\n"
            "OpenRouter proxies 100+ models (Claude, GPT, Llama, and more) behind one\n"
            "key, which is the simplest on-ramp for a first install - so it's now the\n"
            "preselected default provider. Anthropic, OpenAI, and Ollama remain fully\n"
            "supported and are one click away in Settings.\n\n"
            "- lib/llm.js: openrouter shares the OpenAI-compatible branch (same request\n"
            "  shape, different URL/headers); provider + key checks now run BEFORE any\n"
            "  I/O (including the local system-prompt read), so a bad config fails fast\n"
            "  with a friendly LlmError instead of a raw runtime error\n"
            "- lib/state.js: DEFAULT_SETTINGS.provider -> 'openrouter'\n"
            "- manifest.json: host_permissions + openrouter.ai; version -> 1.1.0\n"
            "- settings.html: provider dropdown, OpenRouter first + marked recommended\n"
            "- tests/llm.test.js (new): provider/key validation, 6 tests, no network\n"
            "- docs/TESTING.md (new): full local install-to-first-close walkthrough\n"
            "- README / CLAUDE.md / BUILD-GUIDE.md updated to reflect the new default\n\n"
            + TRAILER
        ),
        "files": [
            "extension/manifest.json",
            "extension/package.json",
            "extension/lib/llm.js",
            "extension/lib/state.js",
            "extension/settings.html",
            "extension/tests/llm.test.js",
            "README.md",
            "CLAUDE.md",
            "docs/BUILD-GUIDE.md",
            "docs/TESTING.md",
            "tools/make_push_json.py",
        ],
    },
}


def main():
    for name, cfg in SETS.items():
        files = []
        for rel in cfg["files"]:
            with open(os.path.join(REPO_ROOT, rel), "r", encoding="utf-8") as fh:
                files.append({"path": rel, "content": fh.read()})
        params = {
            "owner": OWNER,
            "repo": REPO,
            "branch": cfg["branch"],
            "message": cfg["message"],
            "files": files,
        }
        out = f"/tmp/push_{name}.json"
        with open(out, "w", encoding="utf-8") as fh:
            json.dump(params, fh)
        print(f"{name}: {len(files)} files -> {out} ({os.path.getsize(out)} bytes)")


if __name__ == "__main__":
    main()
