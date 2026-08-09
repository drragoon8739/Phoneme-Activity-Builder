import {
  documentShell,
  escapeHtml,
  toJson,
  phonemeReference,
  KEYBOARD_ROWS,
  KEYBOARD_ROW_LABELS,
} from './shared';

const STYLES = `
  .board { display: grid; gap: 8px; justify-content: start; margin-bottom: 20px; }
  .board-row { display: flex; gap: 8px; }
  .board .tile { min-width: 3.5rem; min-height: 3.5rem; }
  .board .tile.filled { border-color: var(--brand); }

  .kb { display: flex; flex-direction: column; gap: 8px; }
  .kb-row { display: grid; grid-template-columns: 6.5rem 1fr; align-items: center; gap: 12px; }
  .kb-label {
    font-family: var(--font-display); font-size: 0.6875rem; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--muted); text-align: right;
    border-right: 1px solid var(--line); padding-right: 12px; min-height: 1.2em;
  }
  .kb-keys { display: flex; flex-wrap: wrap; gap: 6px; }
  .kb-keys .tile { min-width: 2.6rem; min-height: 2.6rem; }
  .kb-keys .tile .glyph { font-size: 1.05rem; }

  .answer-reveal {
    font-family: var(--font-display); font-size: 1.25rem; margin-top: 8px;
  }
  .answer-reveal .english { color: var(--correct); font-weight: 700; }

  .legend { display: flex; flex-wrap: wrap; gap: 16px; font-size: 0.8125rem; color: var(--muted); margin-top: 12px; }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .swatch { width: 14px; height: 14px; border-radius: 4px; display: inline-block; }

  @media (max-width: 620px) {
    .kb-row { grid-template-columns: 1fr; gap: 2px; }
    .kb-label { text-align: left; border-right: 0; border-left: 2px solid var(--brand); padding-right: 0; padding-left: 8px; }
    .kb-label:empty { display: none; }
  }
`;

const SCRIPT = `
(function () {
  var CONFIG = window.__ACTIVITY__;
  var REF = {};
  CONFIG.phonemes.forEach(function (p) { REF[p.ipa] = p; });

  var answer = CONFIG.answer;
  var attempts = CONFIG.attempts;
  var guesses = [];
  var current = [];
  var finished = false;

  var boardEl = document.getElementById('board');
  var kbEl = document.getElementById('keyboard');
  var statusEl = document.getElementById('status');
  var revealEl = document.getElementById('reveal');

  function hintHtml(ipa) {
    var p = REF[ipa];
    if (!p || !CONFIG.showHints) return '';
    return '<span class="hint"><b>/' + ipa + '/</b>' + p.label + ' (as in ' + p.example + ')</span>';
  }

  function describe(ipa) {
    var p = REF[ipa];
    if (!p) return ipa;
    return '/' + ipa + '/ — ' + p.label + ' (as in ' + p.example + ')';
  }

  function tileHtml(ipa, state, extraClass) {
    var p = REF[ipa];
    var classes = ['tile'];
    if (state) classes.push(state);
    if (extraClass) classes.push(extraClass);
    if (ipa) classes.push('filled');
    var label = ipa ? ' aria-label="' + describe(ipa) + '" title="' + describe(ipa) + '"' : ' aria-label="Empty"';
    return '<div class="' + classes.join(' ') + '"' + label + '>' +
      '<span class="glyph">' + (ipa || '') + '</span>' +
      '<span class="gloss">' + (p && CONFIG.showHints ? p.label : '') + '</span>' +
      hintHtml(ipa) +
      '</div>';
  }

  function score(guess) {
    var result = [];
    var remaining = {};
    var i;
    for (i = 0; i < answer.length; i++) result.push('absent');
    for (i = 0; i < answer.length; i++) {
      if (guess[i] === answer[i]) {
        result[i] = 'correct';
      } else {
        remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
      }
    }
    for (i = 0; i < guess.length; i++) {
      if (result[i] === 'correct') continue;
      if (remaining[guess[i]] > 0) {
        result[i] = 'present';
        remaining[guess[i]] -= 1;
      }
    }
    return result;
  }

  function renderBoard() {
    var html = '';
    var r, c;
    for (r = 0; r < attempts; r++) {
      html += '<div class="board-row">';
      var guess = guesses[r];
      var marks = guess ? score(guess) : null;
      for (c = 0; c < answer.length; c++) {
        if (guess) {
          html += tileHtml(guess[c], marks[c]);
        } else if (r === guesses.length) {
          html += tileHtml(current[c] || '', null);
        } else {
          html += tileHtml('', null);
        }
      }
      html += '</div>';
    }
    boardEl.innerHTML = html;
  }

  function bestStatuses() {
    var rank = { absent: 0, present: 1, correct: 2 };
    var statuses = {};
    guesses.forEach(function (guess) {
      var marks = score(guess);
      guess.forEach(function (ipa, i) {
        var next = marks[i];
        if (!statuses[ipa] || rank[next] > rank[statuses[ipa]]) statuses[ipa] = next;
      });
    });
    return statuses;
  }

  function renderKeyboard() {
    var statuses = bestStatuses();
    var html = '';
    CONFIG.keyboard.forEach(function (row, index) {
      var label = CONFIG.keyboardLabels[index] || '';
      html += '<div class="kb-row"><span class="kb-label" aria-hidden="true">' +
        label + '</span><div class="kb-keys">';
      row.forEach(function (ipa) {
        var p = REF[ipa];
        html += '<button type="button" class="tile ' + (statuses[ipa] || '') + '" data-ipa="' + ipa +
          '" aria-label="' + describe(ipa) + '" title="' + describe(ipa) + '"' +
          (finished ? ' disabled' : '') + '>' +
          '<span class="glyph">' + ipa + '</span>' +
          '<span class="gloss">' + (p ? p.label : '') + '</span>' +
          hintHtml(ipa) +
          '</button>';
      });
      html += '</div></div>';
    });
    kbEl.innerHTML = html;
  }

  function say(message, tone) {
    statusEl.className = 'status' + (tone ? ' ' + tone : '');
    statusEl.textContent = message;
  }

  function reveal(won) {
    var strip = answer.map(function (ipa) { return '/' + ipa + '/'; }).join(' ');
    revealEl.innerHTML = '<p class="answer-reveal">' + strip +
      ' = <span class="english">' + CONFIG.english + '</span></p>';
    revealEl.hidden = false;
    if (won) {
      say('Solved in ' + guesses.length + (guesses.length === 1 ? ' guess.' : ' guesses.'), 'win');
    } else {
      say('Out of attempts. The word was ' + CONFIG.english + '.', 'lose');
    }
  }

  function submit() {
    if (finished) return;
    if (current.length !== answer.length) {
      say('Choose ' + answer.length + ' phonemes before checking.');
      return;
    }
    guesses.push(current.slice());
    var solved = current.join(' ') === answer.join(' ');
    current = [];
    renderBoard();
    renderKeyboard();
    if (solved) {
      finished = true;
      reveal(true);
    } else if (guesses.length >= attempts) {
      finished = true;
      reveal(false);
    } else {
      say('Attempt ' + (guesses.length + 1) + ' of ' + attempts + '. Green is in the right place, amber is in the word but elsewhere.');
      renderKeyboard();
    }
  }

  function reset() {
    guesses = [];
    current = [];
    finished = false;
    revealEl.hidden = true;
    revealEl.innerHTML = '';
    say('Attempt 1 of ' + attempts + '. Build a word from the phoneme keyboard, then choose Check word.');
    renderBoard();
    renderKeyboard();
  }

  kbEl.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-ipa]');
    if (!button || finished) return;
    if (current.length >= answer.length) {
      say('That is ' + answer.length + ' phonemes. Check the word, or use Delete.');
      return;
    }
    current.push(button.getAttribute('data-ipa'));
    renderBoard();
  });

  document.getElementById('check').addEventListener('click', submit);
  document.getElementById('undo').addEventListener('click', function () {
    if (finished || current.length === 0) return;
    current.pop();
    renderBoard();
  });
  document.getElementById('restart').addEventListener('click', reset);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') submit();
    if (event.key === 'Backspace' && document.activeElement === document.body) {
      if (!finished && current.length) { current.pop(); renderBoard(); }
    }
  });

  reset();
})();
`;

/**
 * @param {{
 *   answer: string[], english: string, attempts: number, showHints: boolean,
 *   title: string, instructions: string, theme: string
 * }} settings
 */
export function buildWordleHtml(settings) {
  const {
    answer,
    english,
    attempts,
    showHints,
    title = 'Phoneme Wordle',
    instructions = '',
    theme = 'light',
  } = settings;

  const config = {
    answer,
    english,
    attempts,
    showHints,
    keyboard: KEYBOARD_ROWS,
    keyboardLabels: KEYBOARD_ROW_LABELS,
    phonemes: phonemeReference(),
  };

  const body = `
<header class="page-head">
  <p class="eyebrow">Phoneme activity</p>
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">${escapeHtml(
    instructions ||
      `Build the hidden ${answer.length}-phoneme word using the keyboard below.`,
  )}</p>
</header>

<div class="card">
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div id="board" class="board" role="group" aria-label="Guesses"></div>
  <div id="reveal" hidden></div>
  <div class="btn-row">
    <button type="button" id="check" class="btn">Check word</button>
    <button type="button" id="undo" class="btn secondary">Delete</button>
    <button type="button" id="restart" class="btn secondary">Start again</button>
  </div>
  <div class="legend">
    <span><i class="swatch" style="background: var(--correct)"></i> Right phoneme, right place</span>
    <span><i class="swatch" style="background: var(--present)"></i> In the word, wrong place</span>
    <span><i class="swatch" style="background: var(--absent)"></i> Not in the word</span>
  </div>
</div>

<div class="card">
  <h2 class="eyebrow">Phoneme keyboard</h2>
  <p class="sub">Hover or focus a key to see its English equivalent.</p>
  <div id="keyboard" class="kb"></div>
</div>
`;

  const script = `window.__ACTIVITY__ = ${toJson(config)};\n${SCRIPT}`;

  return documentShell({ title, styles: STYLES, body, script, theme });
}

