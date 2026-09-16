'use client';

import { useMemo, useState } from 'react';

import PhonemeTile from './PhonemeTile';
import { useWordLists } from '@/lib/useWordLists';
import { generateWordSearch, minimumGridSize } from '@/lib/wordSearch';
import { buildWordSearchHtml } from '@/lib/export/wordSearchTemplate';
import { downloadHtmlFile, toFilename } from '@/lib/download';
import styles from './WordSearchBuilder.module.css';

const LIST_MODES = [
  {
    value: 'english',
    label: 'English word only',
    help: 'Students work out the phonemes themselves. Hardest.',
  },
  {
    value: 'phonemes',
    label: 'Phonemes only',
    help: 'Students match symbols to the grid. Good for early learners.',
  },
  { value: 'both', label: 'Both', help: 'Maximum support.' },
];

export default function WordSearchBuilder() {
  // Words come from the database, so a teacher's own list can drive the puzzle.
  const { lists, selectedId, setSelectedId, words, availableLengths, loading, error } =
    useWordLists();

  // null means "the teacher has not chosen yet", which is different from an
  // empty array meaning "they deliberately cleared the selection". Without that
  // distinction the Clear button would instantly refill with the defaults.
  const [selected, setSelected] = useState(null);
  const [filterLength, setFilterLength] = useState(3);
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);
  const [allowDiagonals, setAllowDiagonals] = useState(true);
  const [allowReverse, setAllowReverse] = useState(false);
  const [listMode, setListMode] = useState('english');
  const [title, setTitle] = useState('Phoneme Word Search');
  const [instructions, setInstructions] = useState(
    'Drag across the grid to trace each word in phonemes.',
  );
  const [seed, setSeed] = useState(1);
  const [showAnswers, setShowAnswers] = useState(false);
  const [exported, setExported] = useState(null);

  // Derived during render rather than corrected in an effect. `selected` holds
  // the teacher's own choice; until they make one, the first five words of the
  // loaded list stand in, so the preview shows a real puzzle immediately.
  const effectiveSelected = useMemo(() => {
    if (selected === null) return words.slice(0, 5).map((entry) => entry.word);
    return selected.filter((name) => words.some((entry) => entry.word === name));
  }, [selected, words]);

  const effectiveLength =
    availableLengths.length && !availableLengths.includes(filterLength)
      ? availableLengths[0]
      : filterLength;

  const entries = useMemo(
    () =>
      effectiveSelected
        .map((name) => words.find((entry) => entry.word === name))
        .filter(Boolean),
    [effectiveSelected, words],
  );

  const wordsOfFilteredLength = useMemo(
    () => words.filter((entry) => entry.phonemes.length === effectiveLength),
    [words, effectiveLength],
  );

  const puzzle = useMemo(
    () =>
      generateWordSearch(entries, {
        rows,
        cols,
        seed,
        allowDiagonals,
        allowReverse,
      }),
    [entries, rows, cols, seed, allowDiagonals, allowReverse],
  );

  const solutionCells = useMemo(() => {
    const set = new Set();
    for (const placement of puzzle.placements) {
      for (const coord of placement.coords) set.add(`${coord.r}:${coord.c}`);
    }
    return set;
  }, [puzzle]);

  const minimum = minimumGridSize(entries);
  const tooSmall = entries.length > 0 && (rows < minimum || cols < minimum);

  function toggleWord(word) {
    // Seeded from the derived set, so the teacher's first click edits the five
    // words they can actually see rather than starting from an empty selection.
    const base = effectiveSelected;
    setSelected(
      base.includes(word) ? base.filter((value) => value !== word) : [...base, word],
    );
  }

  function generate() {
    const theme = document.documentElement.getAttribute('data-theme') ?? 'light';
    const html = buildWordSearchHtml({
      grid: puzzle.grid,
      rows: puzzle.rows,
      cols: puzzle.cols,
      placements: puzzle.placements,
      title,
      instructions,
      listMode,
      theme,
    });
    const filename = toFilename('phoneme word search', String(entries.length), 'words');
    downloadHtmlFile(filename, html);
    setExported(filename);
  }

  return (
    <div className="builder-grid">
      {/* ----------------------------------------------------------------- */}
      <section className="panel" aria-labelledby="ws-settings-heading">
        <header>
          <p className="eyebrow">Step 1</p>
          <h2 id="ws-settings-heading" className={styles.panelTitle}>
            Configure the activity
          </h2>
        </header>

        {error ? <p className="notice notice--warn">{error}</p> : null}

        <div className="field">
          <label htmlFor="ws-list">Word list</label>
          <select
            id="ws-list"
            value={selectedId ?? ''}
            onChange={(event) => setSelectedId(Number(event.target.value))}
            disabled={loading || lists.length === 0}
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.wordCount} words)
              </option>
            ))}
          </select>
          <p className="field-help">
            Loaded from the database. Add or edit words under Manage.
          </p>
        </div>

        <div className="field">
          <label htmlFor="ws-title">Activity title</label>
          <input
            id="ws-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <fieldset className={styles.fieldset}>
          <legend className="field-label">
            Words in the puzzle ({effectiveSelected.length} selected)
          </legend>

          <div className={styles.segmented} role="group" aria-label="Filter by word length">
            {availableLengths.map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.segment} ${
                  effectiveLength === value ? styles.segmentOn : ''
                }`}
                aria-pressed={effectiveLength === value}
                onClick={() => setFilterLength(value)}
              >
                {value} phonemes
              </button>
            ))}
          </div>

          <ul className={styles.wordPicker}>
            {wordsOfFilteredLength.map((entry) => {
              const id = `word-${entry.word}`;
              return (
                <li key={entry.word}>
                  <input
                    id={id}
                    type="checkbox"
                    checked={effectiveSelected.includes(entry.word)}
                    onChange={() => toggleWord(entry.word)}
                  />
                  <label htmlFor={id}>
                    <span>{entry.word}</span>
                    <span className={styles.pickerIpa}>
                      {entry.phonemes.map((p) => `/${p}/`).join(' ')}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="btn-row" style={{ marginTop: 'var(--space-3)' }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setSelected(null)}
              disabled={words.length === 0}
            >
              Reset to first five
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setSelected([])}
              disabled={effectiveSelected.length === 0}
            >
              Clear
            </button>
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className="field-label">Grid</legend>
          <div className="row-2">
            <div>
              <label htmlFor="ws-rows" className="field-label">
                Rows
              </label>
              <input
                id="ws-rows"
                type="number"
                min="5"
                max="20"
                value={rows}
                onChange={(event) => setRows(Number(event.target.value) || 5)}
              />
            </div>
            <div>
              <label htmlFor="ws-cols" className="field-label">
                Columns
              </label>
              <input
                id="ws-cols"
                type="number"
                min="5"
                max="20"
                value={cols}
                onChange={(event) => setCols(Number(event.target.value) || 5)}
              />
            </div>
          </div>
        </fieldset>

        <div className={styles.checkboxRow}>
          <input
            id="ws-diagonals"
            type="checkbox"
            checked={allowDiagonals}
            onChange={(event) => setAllowDiagonals(event.target.checked)}
          />
          <label htmlFor="ws-diagonals">
            <strong>Allow diagonals</strong>
            <span className="field-help">Turn off for younger students.</span>
          </label>
        </div>

        <div className={styles.checkboxRow}>
          <input
            id="ws-reverse"
            type="checkbox"
            checked={allowReverse}
            onChange={(event) => setAllowReverse(event.target.checked)}
          />
          <label htmlFor="ws-reverse">
            <strong>Allow backwards words</strong>
            <span className="field-help">
              Off by default: reading a sequence in reverse works against
              sound-order practice.
            </span>
          </label>
        </div>

        <fieldset className={styles.fieldset}>
          <legend className="field-label">Word list shows</legend>
          {LIST_MODES.map((mode) => (
            <div key={mode.value} className={styles.radioRow}>
              <input
                id={`list-${mode.value}`}
                type="radio"
                name="listMode"
                checked={listMode === mode.value}
                onChange={() => setListMode(mode.value)}
              />
              <label htmlFor={`list-${mode.value}`}>
                <strong>{mode.label}</strong>
                <span className="field-help">{mode.help}</span>
              </label>
            </div>
          ))}
        </fieldset>

        <div className="field">
          <label htmlFor="ws-instructions">Instructions for students</label>
          <input
            id="ws-instructions"
            type="text"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
          />
        </div>

        <hr className={styles.rule} />

        <p className="eyebrow">Step 3</p>
        <button
          type="button"
          className="btn btn--block"
          onClick={generate}
          disabled={entries.length === 0 || puzzle.unplaced.length > 0}
        >
          Generate .html file
        </button>

        {entries.length === 0 ? (
          <p className="notice notice--warn" style={{ marginTop: 'var(--space-3)' }}>
            Choose at least one word.
          </p>
        ) : null}

        {tooSmall ? (
          <p className="notice notice--warn" style={{ marginTop: 'var(--space-3)' }}>
            The longest word needs {minimum} cells. Increase the grid to at least{' '}
            {minimum} × {minimum}.
          </p>
        ) : null}

        {puzzle.unplaced.length > 0 ? (
          <p className="notice notice--warn" style={{ marginTop: 'var(--space-3)' }}>
            No room for {puzzle.unplaced.map((entry) => entry.word).join(', ')}.
            Enlarge the grid, allow diagonals, or remove a word.
          </p>
        ) : null}

        {exported ? (
          <p className="notice notice--ok" style={{ marginTop: 'var(--space-3)' }}>
            Saved {exported}. Open it in any browser — it needs no internet
            connection.
          </p>
        ) : null}
      </section>

      {/* ----------------------------------------------------------------- */}
      <section className="panel" aria-labelledby="ws-preview-heading">
        <header className={styles.previewHead}>
          <div>
            <p className="eyebrow">Step 2</p>
            <h2 id="ws-preview-heading" className={styles.panelTitle}>
              Preview
            </h2>
            <p className="field-help">
              This exact grid is what gets exported. Dragging to select is
              enabled in the downloaded file.
            </p>
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setSeed((value) => value + 1)}
            >
              Shuffle layout
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setShowAnswers((value) => !value)}
              aria-pressed={showAnswers}
            >
              {showAnswers ? 'Hide answers' : 'Show answers'}
            </button>
          </div>
        </header>

        {entries.length === 0 ? (
          <p className="notice">Select words on the left to see the puzzle.</p>
        ) : (
          <>
            <div
              className={styles.grid}
              style={{ '--cols': puzzle.cols }}
              role="img"
              aria-label={`Word search grid, ${puzzle.rows} by ${puzzle.cols}, containing ${puzzle.placements.length} words`}
            >
              {puzzle.grid.map((row, r) =>
                row.map((symbol, c) => (
                  <span
                    key={`${r}-${c}`}
                    className={`${styles.cell} ${
                      showAnswers && solutionCells.has(`${r}:${c}`) ? styles.solution : ''
                    }`}
                  >
                    {symbol}
                  </span>
                )),
              )}
            </div>

            <h3 className={styles.listHeading}>Word list</h3>
            <ul className={styles.wordList}>
              {puzzle.placements.map((placement) => (
                <li key={placement.key} className={styles.wordItem}>
                  <span className={styles.wordEnglish}>
                    {listMode === 'phonemes' ? '?' : placement.word}
                  </span>
                  {listMode !== 'english' ? (
                    <span className={styles.wordTiles}>
                      {placement.phonemes.map((symbol, index) => (
                        <PhonemeTile
                          key={`${symbol}-${index}`}
                          symbol={symbol}
                          size="sm"
                          showGloss={false}
                        />
                      ))}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

