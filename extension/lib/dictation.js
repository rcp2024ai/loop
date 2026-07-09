// lib/dictation.js — optional voice-to-text for any textarea, via the
// browser's built-in Web Speech API (SpeechRecognition). No API key, no
// server, no manifest permission to declare — Chrome/Edge handle the
// one-time microphone prompt themselves, the same way any website asking
// for mic access would.
//
// Purely additive: on an unsupported browser (Firefox has no shipped
// implementation) or a denied/failed mic, typing still works exactly as
// before — dictation never blocks the underlying textarea.
//
// Note for anyone reading this after a support report: Chrome's built-in
// recognizer sends audio to Google's speech service for transcription
// (it's cloud-based, not on-device) — worth knowing, though it needs no
// key and costs nothing. This is separate from, and unrelated to, the
// user's OpenRouter/Anthropic/OpenAI/Ollama key used for the loop's AI.

export function speechSupported() {
  return typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Wires a mic toggle button to dictate into `textarea`, with live status
// text in `statusEl` (optional). Dictated speech APPENDS to whatever is
// already in the textarea rather than overwriting it. Returns a cleanup
// function — call it to force-stop listening (e.g. when the view that
// hosts this textarea is about to be torn down); safe to call even if
// never started.
export function attachDictation(textarea, micButton, statusEl) {
  const Ctor = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  const setStatus = (text) => { if (statusEl) statusEl.textContent = text; };

  if (!Ctor) {
    micButton.disabled = true;
    micButton.title = 'Voice dictation needs Chrome or Edge.';
    setStatus('');
    return () => {};
  }

  let recognition = null;
  let listening = false;
  let baseValue = '';

  function start() {
    baseValue = textarea.value && !textarea.value.endsWith('\n')
      ? textarea.value + ' '
      : textarea.value;
    recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += `${transcript} `;
        else interim += transcript;
      }
      if (finalChunk) baseValue += finalChunk;
      textarea.value = baseValue + interim;
      // Programmatic .value writes don't fire native 'input' events —
      // dispatch one so anything listening for typed input (e.g. an
      // "enable this button once there's text" check) still reacts.
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatus('Mic blocked — allow microphone access for LOOP, then try again.');
      } else if (event.error === 'no-speech') {
        setStatus("Didn't catch anything — tap the mic and try again.");
      } else if (event.error === 'aborted') {
        setStatus('');
      } else {
        setStatus(`Dictation error (${event.error}). You can still type normally.`);
      }
      reset();
    };

    recognition.onend = () => {
      // Fires on manual stop() too, but by then `listening` is already
      // false and reset() below is a harmless no-op re-run.
      if (listening) reset();
    };

    recognition.start();
    listening = true;
    micButton.classList.add('listening');
    micButton.textContent = '⏹';
    micButton.title = 'Stop dictating';
    setStatus('Listening…');
  }

  function reset() {
    listening = false;
    micButton.classList.remove('listening');
    micButton.textContent = '🎙';
    micButton.title = 'Click to dictate';
    if (statusEl && statusEl.textContent === 'Listening…') setStatus('');
  }

  function stop() {
    if (!listening) return;
    reset();
    if (recognition) {
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.stop();
    }
  }

  micButton.addEventListener('click', () => (listening ? stop() : start()));

  return stop;
}
