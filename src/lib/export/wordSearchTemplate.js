import { documentShell, escapeHtml, toJson, phonemeReference } from './shared';

const STYLES = `
  .ws-layout { display: grid; gap: 20px; grid-template-columns: 1fr; }
  @media (min-width: 820px) { .ws-layout { grid-template-columns: 1fr 20rem; align-items: start; } }

  .ws-grid {
    display: grid;
    gap: 3px;
    justify-content: center;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .ws-cell {
    display: flex; align-items: center; justify-content: center;
    aspect-ratio: 1;
    min-width: 2.1rem;
    font-family: var(--font-ipa);
    font-size: clamp(0.85rem, 2.2vw, 1.1rem);
    font-weight: 600;
    background: var(--sunk);
    border: 1px solid var(--line);
    border-radius: 6px;
    cursor: pointer;
  }

  .ws-cell.selected { background: var(--present-soft); border-color: var(--present); }
  .ws-cell.found { background: var(--correct-soft); border-color: var(--correct); color: var(--correct); }
  .ws-cell.solution { outline: 2px dashed var(--brand); outline-offset: -2px; }

  .word-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }

  .word-item {
    display: flex; flex-direction: column; gap: 2px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--sunk);
  }

  .word-item.found { border-color: var(--correct); background: var(--correct-soft); }
  .word-item .english { font-weight: 700; }
  .word-item.found .english { color: var(--correct); }
  .word-item .strip { font-family: var(--font-ipa); color: var(--muted); letter-spacing: 0.04em; }
  .word-item .strip[hidden] { display: none; }

  .progress { font-family: var(--font-display); font-size: 0.8125rem; color: var(--muted); margin-bottom: 12px; }
`;

const SCRIPT = `
(function () {
  var CONFIG = window.__ACTIVITY__;
  var REF = {};
  CONFIG.phonemes.forEach(function (p) { REF[p.ipa] = p; });

  var gridEl = document.getElementById('grid');
  var listEl = document.getElementById('words');
  var statusEl = document.getElementById('status');
  var progressEl = document.getElementById('progress');

  var found = {};
  var selecting = false;
  var startCell = null;
  var showingAnswers = false;

  function describe(ipa) {
    var p = REF[ipa];
    if (!p) return ipa;
    return '/' + ipa + '/ — ' + p.label + ' (as in ' + p.example + ')';
  }

  function renderGrid() {
    gridEl.style.gridTemplateColumns = 'repeat(' + CONFIG.cols + ', minmax(2.1rem, 1fr))';
    var html = '';
    for (var r = 0; r < CONFIG.rows; r++) {
      for (var c = 0; c < CONFIG.cols; c++) {
        var ipa = CONFIG.grid[r][c];
        html += '<div class="ws-cell" data-r="' + r + '" data-c="' + c + '" title="' +
          describe(ipa) + '">' + ipa + '</div>';
      }
    }
    gridEl.innerHTML = html;
  }

  function renderList() {
    var html = '';
    CONFIG.words.forEach(function (word) {
      var isFound = !!found[word.key];
      var showEnglish = CONFIG.listMode !== 'phonemes' || isFound;
      var showStrip = CONFIG.listMode !== 'english' || isFound;
      html += '<li class="word-item ' + (isFound ? 'found' : '') + '">' +
        (showEnglish ? '<span class="english">' + word.english + (isFound ? ' ✓' : '') + '</span>' : '<span class="english">' + (isFound ? word.english : '?') + '</span>') +
        (showStrip ? '<span class="strip">' + word.phonemes.map(function (p) { return '/' + p + '/'; }).join(' ') + '</span>' : '') +
        '</li>';
    });
    listEl.innerHTML = html;

    var total = CONFIG.words.length;
    var count = Object.keys(found).length;
    progressEl.textContent = count + ' of ' + total + ' found';
    if (count === total) {
      statusEl.className = 'status win';
      statusEl.textContent = 'All words found. Well done.';
    }
  }

  function cellAt(r, c) {
    return gridEl.querySelector('[data-r="' + r + '"][data-c="' + c + '"]');
  }

  function clearSelection() {
    var cells = gridEl.querySelectorAll('.ws-cell.selected');
    for (var i = 0; i < cells.length; i++) cells[i].classList.remove('selected');
  }

  function pathBetween(a, b) {
    var r1 = +a.getAttribute('data-r'), c1 = +a.getAttribute('data-c');
    var r2 = +b.getAttribute('data-r'), c2 = +b.getAttribute('data-c');
    var dr = r2 - r1, dc = c2 - c1;
    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
    var steps = Math.max(Math.abs(dr), Math.abs(dc));
    var stepR = steps === 0 ? 0 : dr / steps;
    var stepC = steps === 0 ? 0 : dc / steps;
    var path = [];
    for (var i = 0; i <= steps; i++) path.push({ r: r1 + stepR * i, c: c1 + stepC * i });
    return path;
  }

  function samePath(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i].r !== b[i].r || a[i].c !== b[i].c) return false;
    }
    return true;
  }

  function checkPath(path) {
    var reversed = path.slice().reverse();
    for (var i = 0; i < CONFIG.words.length; i++) {
      var word = CONFIG.words[i];
      if (found[word.key]) continue;
      if (samePath(path, word.coords) || samePath(reversed, word.coords)) {
        found[word.key] = true;
        word.coords.forEach(function (co) {
          var cell = cellAt(co.r, co.c);
          if (cell) cell.classList.add('found');
        });
        statusEl.className = 'status';
        statusEl.textContent = 'Found ' + word.english + ' — ' +
          word.phonemes.map(function (p) { return '/' + p + '/'; }).join(' ');
        renderList();
        return true;
      }
    }
    return false;
  }

  function beginAt(target) {
    if (!target || !target.classList.contains('ws-cell')) return;
    selecting = true;
    startCell = target;
    clearSelection();
    target.classList.add('selected');
  }

  function extendTo(target) {
    if (!selecting || !target || !target.classList.contains('ws-cell')) return;
    var path = pathBetween(startCell, target);
    if (!path) return;
    clearSelection();
    path.forEach(function (co) {
      var cell = cellAt(co.r, co.c);
      if (cell) cell.classList.add('selected');
    });
  }

  function finish(target) {
    if (!selecting) return;
    selecting = false;
    var end = target && target.classList && target.classList.contains('ws-cell') ? target : startCell;
    var path = pathBetween(startCell, end);
    clearSelection();
    if (path) checkPath(path);
  }

  gridEl.addEventListener('mousedown', function (e) { beginAt(e.target); e.preventDefault(); });
  gridEl.addEventListener('mouseover', function (e) { extendTo(e.target); });
  window.addEventListener('mouseup', function (e) { finish(e.target); });

  gridEl.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    beginAt(document.elementFromPoint(t.clientX, t.clientY));
    e.preventDefault();
  }, { passive: false });

  gridEl.addEventListener('touchmove', function (e) {
    var t = e.touches[0];
    extendTo(document.elementFromPoint(t.clientX, t.clientY));
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('touchend', function () { finish(null); });

  document.getElementById('answers').addEventListener('click', function () {
    showingAnswers = !showingAnswers;
    this.textContent = showingAnswers ? 'Hide answers' : 'Show answers';
    CONFIG.words.forEach(function (word) {
      word.coords.forEach(function (co) {
        var cell = cellAt(co.r, co.c);
        if (cell) cell.classList.toggle('solution', showingAnswers);
      });
    });
  });

  document.getElementById('restart').addEventListener('click', function () {
    found = {};
    showingAnswers = false;
    document.getElementById('answers').textContent = 'Show answers';
    statusEl.className = 'status';
    statusEl.textContent = CONFIG.instructions;
    renderGrid();
    renderList();
  });

  statusEl.textContent = CONFIG.instructions;
  renderGrid();
  renderList();
})();
`;

/**
 * @param {{
 *   grid: string[][], rows: number, cols: number,
 *   placements: Array<{word: string, phonemes: string[], key: string, coords: Array<{r:number,c:number}>}>,
 *   title: string, instructions: string, listMode: 'english'|'phonemes'|'both', theme: string
 * }} settings
 */
export function buildWordSearchHtml(settings) {
  const {
    grid,
    rows,
    cols,
    placements,
    title = 'Phoneme Word Search',
    instructions = 'Drag across the grid to trace each word in phonemes.',
    listMode = 'english',
    theme = 'light',
  } = settings;

  const config = {
    grid,
    rows,
    cols,
    listMode,
    instructions,
    words: placements.map((placement) => ({
      key: placement.key,
      english: placement.word,
      phonemes: placement.phonemes,
      coords: placement.coords,
    })),
    phonemes: phonemeReference(),
  };

  const body = `
<header class="page-head">
  <p class="eyebrow">Phoneme activity</p>
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">${escapeHtml(instructions)}</p>
</header>

<div class="card">
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="ws-layout">
    <div id="grid" class="ws-grid" role="grid" aria-label="Word search grid"></div>
    <div>
      <p id="progress" class="progress"></p>
      <ul id="words" class="word-list"></ul>
      <div class="btn-row" style="margin-top:16px">
        <button type="button" id="answers" class="btn secondary">Show answers</button>
        <button type="button" id="restart" class="btn secondary">Start again</button>
      </div>
    </div>
  </div>
</div>
`;

  const script = `window.__ACTIVITY__ = ${toJson(config)};\n${SCRIPT}`;

  return documentShell({ title, styles: STYLES, body, script, theme });
}
