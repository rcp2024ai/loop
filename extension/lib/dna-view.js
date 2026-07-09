// lib/dna-view.js — the shared "Procrastination DNA" visual.
// Turns a dnaBars() view-model into a DOM card: a headline naming the top
// trigger, color-coded bars sized by frequency, and the one recommended
// change highlighted. Built once here so the Settings page and the sidebar's
// weekly review render the exact same thing. Pure DOM (no chrome APIs), so
// importing it never triggers page init — unlike importing settings.js.

export function dnaCard(dna) {
  const box = el('div', 'dna');
  if (!dna.bars.length) return box;

  const top = dna.bars[0];
  box.append(text(el('div', 'dna-headline'),
    `Your top trigger this week: ${shortLabel(top.label)}`));

  for (const b of dna.bars) {
    const row = el('div', 'dna-bar');
    row.append(text(el('span', 'lbl'), shortLabel(b.label)));
    const track = el('div', 'dna-track');
    const fill = el('div', 'dna-fill');
    fill.style.width = `${b.pct}%`;
    fill.style.background = b.color;
    track.append(fill);
    row.append(track, text(el('span', 'dna-count'), `×${b.count}`));
    box.append(row);
  }

  if (dna.proposedChange) {
    const change = el('div', 'dna-change');
    const label = el('b');
    label.textContent = 'One change → ';
    change.append(label, document.createTextNode(dna.proposedChange));
    box.append(change);
  }
  return box;
}

// "Too big — needed decomposition" → "Too big" (the headline/label wants the
// punchy half; the full explanation lives in the tooltip).
function shortLabel(label) {
  return label.split(' — ')[0];
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function text(node, str) {
  node.textContent = str;
  return node;
}
