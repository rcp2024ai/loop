// tests/dictation.test.js — the one piece of lib/dictation.js that's
// meaningfully testable outside a real browser.
//
// attachDictation() is fundamentally a DOM + Web Speech API wrapper; there
// is no DOM here (plain `node --test`, no jsdom, by design — see
// CLAUDE.md), so exercising start/stop/onresult needs a real browser and
// is covered by manual testing (docs/TESTING.md), not this suite.
//
// speechSupported() is different: it's a pure guard, and its job is to
// degrade safely with NO `window` at all — not just "window without
// SpeechRecognition" but no `window` global whatsoever, which is exactly
// the situation in a service worker (background.js has `self`, not
// `window`) or this Node test runner. If dictation.js ever got imported
// somewhere without a real DOM, a naive `window.SpeechRecognition` access
// throws a ReferenceError instead of returning false — that's the bug this
// guards against, and it's the same condition Node happens to reproduce.
import test from 'node:test';
import assert from 'node:assert/strict';
import { speechSupported } from '../lib/dictation.js';

test('speechSupported degrades to false with no window global (Node, or a service worker)', () => {
  assert.equal(typeof window, 'undefined'); // sanity: this environment has no window
  assert.equal(speechSupported(), false);   // must not throw
});
