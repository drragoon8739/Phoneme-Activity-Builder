'use client';

import { useMemo, useState } from 'react';

import PhonemeKeyboard from './PhonemeKeyboard';
import PhonemeStrip from './PhonemeStrip';
import PhonemeTile from './PhonemeTile';
import { useWordLists } from '@/lib/useWordLists';
import { DIFFICULTY_PRESETS, scoreGuess, keyboardStatuses } from '@/lib/wordle';
import { buildWordleHtml } from '@/lib/export/wordleTemplate';
import { downloadHtmlFile, toFilename } from '@/lib/download';
import styles from './WordleBuilder.module.css';

export default function WordleBuilder() {
  // Words come from the database rather than a bundled JavaScript module, so
  // anything a teacher adds under Manage is immediately available here.
  const { lists, selectedId, setSelectedId, words, availableLengths, loading, error } =
    useWordLists();

  // --- Activity settings ---------------------------------------------------
  const [length, setLength] = useState(3);
  const [wordKey, setWordKey] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [custom, setCustom] = useState([]);
  const [difficulty, setDifficulty] = useState('standard');
  const [title, setTitle] = useState('Phoneme Wordle');
  const [instructions, setInstructions] = useState('');
  const [exported, setExported] = useState(null);

  // --- Preview state -------------------------------------------------------
  const [guesses, setGuesses] = useState([]);
  const [draft, setDraft] = useState([]);

  const preset = DIFFICULTY_PRESETS[difficulty];

  // Both of these are derived during render rather than corrected afterwards in
  // an effect. Switching word list can leave the chosen length or word absent
  // from the new data; falling back here means the component never renders an
  // invalid selection, and never triggers a second render to fix one.
  const effectiveLength =
    availableLengths.length && !availableLengths.includes(length)
      ? availableLengths[0]
      : length;

  const options = useMemo(
    () => words.filter((entry) => entry.phonemes.length === effectiveLength),
    [words, effectiveLength],
  );

  const target = useMemo(() => {
    if (useCustom) {
      return { word: '(custom)', phonemes: custom };
    }
    return (
      options.find((entry) => entry.word === wordKey) ??
      options[0] ?? { word: '', phonemes: [] }
    );
  }, [useCustom, custom, wordKey, options]);

  const answer = target.phonemes;
  const ready = answer.length >= 2;

  const solved =
    guesses.length > 0 &&
    guesses[guesses.length - 1].join(' ') === answer.join(' ');
  const outOfAttempts = guesses.length >= preset.attempts && !solved;
  const finished = solved || outOfAttempts;

  const statuses = useMemo(
    () => (ready ? keyboardStatuses(guesses, answer) : {}),
    [guesses, answer, ready],
  );

  function resetPreview() {
    setGuesses([]);
    setDraft([]);
  }

  function chooseLength(next) {
    setLength(next);
    const first = words.find((entry) => entry.phonemes.length === next);
    if (first) setWordKey(first.word);
    resetPreview();
  }

  function chooseWord(next) {
    setWordKey(next);
    resetPreview();
  }

  function pushCustom(symbol) {
    if (custom.length >= 6) return;
    setCustom((value) => [...value, symbol]);
    resetPreview();
  }

  function pressPreviewKey(symbol) {
    if (finished || !ready) return;
    if (draft.length >= answer.length) return;
    setDraft((value) => [...value, symbol]);
  }

  function submitGuess() {
    if (finished || draft.length !== answer.length) return;
    setGuesses((value) => [...value, draft]);
    setDraft([]);
  }

  function generate() {
    const theme = document.documentElement.getAttribute('data-theme') ?? 'light';
    const html = buildWordleHtml({
      answer,
      english: useCustom ? 'your word' : target.word,
      attempts: preset.attempts,
      showHints: preset.hints,
      title,
      instructions,
      theme,
    });
    const filename = toFilename('phoneme wordle', useCustom ? 'custom' : target.word);
    downloadHtmlFile(filename, html);
    setExported(filename);
  }

  return (
    <div className="builder-grid">
      {/* ----------------------------------------------------------------- */}
      <section className="panel" aria-labelledby="settings-heading">
        <header>
          <p className="eyebrow">Step 1</p>
          <h2 id="settings-heading" className={styles.panelTitle}>
            Configure the activity
          </h2>
        </header>

        {error ? <p className="notice notice--warn">{error}</p> : null}

        <div className="field">
          <label htmlFor="wordle-list">Word list</label>
          <select
            id="wordle-list"
            value={selectedId ?? ''}
            onChange={(event) => {
              setSelectedId(Number(event.target.value));
              resetPreview();
            }}
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
          <label htmlFor="wordle-title">Activity title</label>
          <input
            id="wordle-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <fieldset className={styles.fieldset}>
          <legend className="field-label">Word length</legend>
          <div className={styles.segmented} role="group" aria-label="Word length in phonemes">
            {availableLengths.map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.segment} ${
                  effectiveLength === value ? styles.segmentOn : ''
                }`}
                aria-pressed={effectiveLength === value}
                onClick={() => chooseLength(value)}
                disabled={useCustom}
              >
                {value} phonemes
              </button>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="wordle-word">Target word</label>
          <select
            id="wordle-word"
            value={target.word}
            onChange={(event) => chooseWord(event.target.value)}
            disabled={useCustom}
          >
            {options.map((entry) => (
              <option key={entry.word} value={entry.word}>
                {entry.word} — {entry.phonemes.map((p) => `/${p}/`).join(' ')}
              </option>
            ))}
          </select>
          <p className="field-help">
            {options.length} of {words.length} words in this list have{' '}
            {effectiveLength} phonemes.
          </p>
        </div>

        <div className={styles.checkboxRow}>
          <input
            id="wordle-custom"
            type="checkbox"
            checked={useCustom}
            onChange={(event) => {
              setUseCustom(event.target.checked);
              resetPreview();
            }}
          />
          <label htmlFor="wordle-custom">Compose a word on the keyboard instead</label>
        </div>

        {useCustom ? (
          <div className={styles.composer}>
            <PhonemeStrip phonemes={custom} label="Your word" size="sm" />
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setCustom((value) => value.slice(0, -1));
                  resetPreview();
                }}
                disabled={custom.length === 0}
              >
                Delete
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setCustom([]);
                  resetPreview();
                }}
                disabled={custom.length === 0}
              >
                Clear
              </button>
            </div>
            <PhonemeKeyboard
              onSelect={pushCustom}
              legend="Add a phoneme"
              description="Up to six phonemes."
            />
          </div>
        ) : null}

        <fieldset className={styles.fieldset}>
          <legend className="field-label">Difficulty</legend>
          {Object.entries(DIFFICULTY_PRESETS).map(([key, value]) => (
            <div key={key} className={styles.radioRow}>
              <input
                id={`difficulty-${key}`}
                type="radio"
                name="difficulty"
                value={key}
                checked={difficulty === key}
                onChange={() => {
                  setDifficulty(key);
                  resetPreview();
                }}
              />
              <label htmlFor={`difficulty-${key}`}>
                <strong>{value.label}</strong>
                <span className="field-help">{value.help}</span>
              </label>
            </div>
          ))}
        </fieldset>

        <div className="field">
          <label htmlFor="wordle-instructions">Instructions for students</label>
          <input
            id="wordle-instructions"
            type="text"
            value={instructions}
            placeholder={`Build the hidden ${answer.length || effectiveLength}-phoneme word.`}
            onChange={(event) => setInstructions(event.target.value)}
          />
        </div>

        <hr className={styles.rule} />

        <p className="eyebrow">Step 3</p>
        <button
          type="button"
          className="btn btn--block"
          onClick={generate}
          disabled={!ready}
        >
          Generate .html file
        </button>
        {!ready ? (
          <p className="notice notice--warn" style={{ marginTop: 'var(--space-3)' }}>
            Choose at least two phonemes before generating.
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
      <section className="panel" aria-labelledby="preview-heading">
        <header className={styles.previewHead}>
          <div>
            <p className="eyebrow">Step 2</p>
            <h2 id="preview-heading" className={styles.panelTitle}>
              Preview
            </h2>
            <p className="field-help">
              Exactly what a student will see in the exported file.
            </p>
          </div>
          <button type="button" className="btn btn--secondary" onClick={resetPreview}>
            Reset
          </button>
        </header>

        <p
          className={`notice ${solved ? 'notice--ok' : ''} ${
            outOfAttempts ? 'notice--warn' : ''
          }`}
          role="status"
        >
          {!ready
            ? 'Choose a target word to preview the activity.'
            : solved
              ? `Solved in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}.`
              : outOfAttempts
                ? `Out of attempts. The word was ${target.word}.`
                : `Attempt ${guesses.length + 1} of ${preset.attempts}.`}
        </p>

        <div className={styles.board}>
          {Array.from({ length: preset.attempts }).map((_, row) => {
            const guess = guesses[row];
            const marks = guess ? scoreGuess(guess, answer) : [];
            return (
              <div key={row} className={styles.boardRow}>
                {Array.from({ length: Math.max(answer.length, 1) }).map((__, col) => {
                  const symbol = guess
                    ? guess[col]
                    : row === guesses.length
                      ? draft[col]
                      : '';
                  return (
                    <PhonemeTile
                      key={col}
                      symbol={symbol ?? ''}
                      size="lg"
                      state={guess ? marks[col] : undefined}
                      showGloss={preset.hints}
                      showHint={preset.hints}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {finished ? (
          <div className={styles.reveal}>
            <PhonemeStrip
              phonemes={answer}
              english={useCustom ? 'your word' : target.word}
              revealEnglish
              label="The answer"
              size="sm"
            />
          </div>
        ) : null}

        <div className="btn-row" style={{ margin: 'var(--space-4) 0' }}>
          <button
            type="button"
            className="btn"
            onClick={submitGuess}
            disabled={finished || draft.length !== answer.length}
          >
            Check word
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setDraft((value) => value.slice(0, -1))}
            disabled={finished || draft.length === 0}
          >
            Delete
          </button>
        </div>

        <PhonemeKeyboard
          onSelect={pressPreviewKey}
          statuses={statuses}
          disabled={finished || !ready}
          legend="Phoneme keyboard"
          description="Hover or focus a key to see its English equivalence."
        />
      </section>
    </div>
  );
}
