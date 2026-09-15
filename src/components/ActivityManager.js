'use client';

import { useCallback, useEffect, useState } from 'react';

import { api, ApiError, generateActivity } from '@/lib/apiClient';
import styles from './ActivityManager.module.css';

const BLANK = {
  name: '',
  type: 'WORDLE',
  difficulty: 'standard',
  title: 'Phoneme Wordle',
  instructions: '',
  theme: 'light',
  wordListId: '',
  attempts: 6,
  showHints: true,
  wordSelection: 'RANDOM',
  targetWordId: '',
  gridRows: 10,
  gridCols: 10,
  allowDiagonals: true,
  allowReverse: false,
  listMode: 'english',
  maxWords: 5,
};

/**
 * Saved activity configurations: create, edit, delete, and generate the
 * downloadable file from stored data.
 *
 * Generation happens server-side against the database, so a configuration set
 * to random selection produces a different word each time. That is the practical
 * payoff of Assessment 2 over Assessment 1, where the word was fixed in code.
 */
export default function ActivityManager() {
  const [activities, setActivities] = useState([]);
  const [lists, setLists] = useState([]);
  const [words, setWords] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const say = (message, tone = 'info') => setStatus({ message, tone });

  const report = (error) => {
    if (error instanceof ApiError) {
      setFieldErrors(error.fields ?? {});
      say(error.message, 'error');
    } else {
      say('Something went wrong', 'error');
    }
  };

  const refresh = useCallback(async () => {
    const [activityData, listData] = await Promise.all([
      api.get('/api/activities'),
      api.get('/api/word-lists'),
    ]);
    setActivities(activityData.activities);
    setLists(listData.wordLists);
    return listData.wordLists;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await refresh();
        if (loaded.length) setForm((current) => ({ ...current, wordListId: loaded[0].id }));
      } catch (error) {
        report(error);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The target-word selector only makes sense for the currently chosen list,
  // so its options are reloaded whenever that list changes.
  useEffect(() => {
    if (!form.wordListId) return;
    (async () => {
      try {
        const data = await api.get(`/api/words?wordListId=${form.wordListId}`);
        setWords(data.words);
      } catch (error) {
        report(error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.wordListId]);

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  function payload() {
    const base = {
      name: form.name,
      type: form.type,
      difficulty: form.difficulty,
      title: form.title,
      instructions: form.instructions || null,
      theme: form.theme,
      wordListId: Number(form.wordListId),
    };

    if (form.type === 'WORDLE') {
      return {
        ...base,
        attempts: Number(form.attempts),
        showHints: form.showHints,
        wordSelection: form.wordSelection,
        targetWordId:
          form.wordSelection === 'FIXED' && form.targetWordId
            ? Number(form.targetWordId)
            : null,
      };
    }

    return {
      ...base,
      gridRows: Number(form.gridRows),
      gridCols: Number(form.gridCols),
      allowDiagonals: form.allowDiagonals,
      allowReverse: form.allowReverse,
      listMode: form.listMode,
      maxWords: Number(form.maxWords),
    };
  }

  async function save() {
    setFieldErrors({});
    try {
      if (editingId) {
        await api.patch(`/api/activities/${editingId}`, payload());
        say(`Updated "${form.name}"`, 'ok');
      } else {
        await api.post('/api/activities', payload());
        say(`Saved "${form.name}"`, 'ok');
      }
      setEditingId(null);
      setForm({ ...BLANK, wordListId: form.wordListId });
      await refresh();
    } catch (error) {
      report(error);
    }
  }

  function startEdit(activity) {
    setEditingId(activity.id);
    setFieldErrors({});
    setForm({
      ...BLANK,
      ...activity,
      instructions: activity.instructions ?? '',
      wordListId: activity.wordListId,
      targetWordId: activity.targetWordId ?? '',
      attempts: activity.attempts ?? 6,
      gridRows: activity.gridRows ?? 10,
      gridCols: activity.gridCols ?? 10,
      maxWords: activity.maxWords ?? 5,
    });
    say(`Editing "${activity.name}"`);
  }

  async function remove(activity) {
    if (!window.confirm(`Delete the activity "${activity.name}"?`)) return;
    try {
      await api.delete(`/api/activities/${activity.id}`);
      await refresh();
      say(`Deleted "${activity.name}"`, 'ok');
    } catch (error) {
      report(error);
    }
  }

  async function generate(activity) {
    try {
      const result = await generateActivity(activity.id);
      await refresh();
      say(
        result.selectedWord
          ? `Downloaded ${result.filename} — this one uses "${result.selectedWord}".`
          : `Downloaded ${result.filename}.`,
        'ok',
      );
    } catch (error) {
      report(error);
    }
  }

  if (loading) return <p className="notice">Loading activities…</p>;

  const isWordle = form.type === 'WORDLE';

  return (
    <div className="builder-grid">
      {/* --- Form ------------------------------------------------------ */}
      <section className="panel" aria-labelledby="activity-form-heading">
        <header>
          <p className="eyebrow">{editingId ? 'Edit' : 'New'}</p>
          <h2 id="activity-form-heading" className={styles.panelTitle}>
            {editingId ? 'Edit activity' : 'Save an activity'}
          </h2>
        </header>

        <div className="field">
          <label htmlFor="a-name">Activity name</label>
          <input
            id="a-name"
            type="text"
            value={form.name}
            onChange={(event) => set({ name: event.target.value })}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name ? <p className={styles.err}>{fieldErrors.name}</p> : null}
        </div>

        <div className="field">
          <label htmlFor="a-type">Activity type</label>
          <select
            id="a-type"
            value={form.type}
            onChange={(event) =>
              set({
                type: event.target.value,
                title:
                  event.target.value === 'WORDLE'
                    ? 'Phoneme Wordle'
                    : 'Phoneme Word Search',
              })
            }
          >
            <option value="WORDLE">Wordle</option>
            <option value="WORD_SEARCH">Word Search</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="a-list">Word list</label>
          <select
            id="a-list"
            value={form.wordListId}
            onChange={(event) => set({ wordListId: event.target.value })}
            aria-invalid={Boolean(fieldErrors.wordListId)}
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.wordCount} words)
              </option>
            ))}
          </select>
          {fieldErrors.wordListId ? (
            <p className={styles.err}>{fieldErrors.wordListId}</p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="a-title">Title shown to students</label>
          <input
            id="a-title"
            type="text"
            value={form.title}
            onChange={(event) => set({ title: event.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="a-difficulty">Difficulty</label>
          <select
            id="a-difficulty"
            value={form.difficulty}
            onChange={(event) => set({ difficulty: event.target.value })}
          >
            <option value="supported">Supported</option>
            <option value="standard">Standard</option>
            <option value="challenge">Challenge</option>
          </select>
        </div>

        {isWordle ? (
          <>
            <div className="field">
              <label htmlFor="a-selection">Word selection</label>
              <select
                id="a-selection"
                value={form.wordSelection}
                onChange={(event) => set({ wordSelection: event.target.value })}
              >
                <option value="RANDOM">Random from the list each time</option>
                <option value="FIXED">Always the same word</option>
              </select>
              <p className="field-help">
                Random selection is what lets one saved activity produce a
                different handout every time it is generated.
              </p>
            </div>

            {form.wordSelection === 'FIXED' ? (
              <div className="field">
                <label htmlFor="a-target">Target word</label>
                <select
                  id="a-target"
                  value={form.targetWordId}
                  onChange={(event) => set({ targetWordId: event.target.value })}
                  aria-invalid={Boolean(fieldErrors.targetWordId)}
                >
                  <option value="">Choose a word…</option>
                  {words.map((word) => (
                    <option key={word.id} value={word.id}>
                      {word.english} — {word.phonemes.map((p) => `/${p}/`).join(' ')}
                    </option>
                  ))}
                </select>
                {fieldErrors.targetWordId ? (
                  <p className={styles.err}>{fieldErrors.targetWordId}</p>
                ) : null}
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="a-attempts">Attempts allowed</label>
              <input
                id="a-attempts"
                type="number"
                min="1"
                max="12"
                value={form.attempts}
                onChange={(event) => set({ attempts: event.target.value })}
              />
            </div>

            <div className={styles.check}>
              <input
                id="a-hints"
                type="checkbox"
                checked={form.showHints}
                onChange={(event) => set({ showHints: event.target.checked })}
              />
              <label htmlFor="a-hints">Show English hints during play</label>
            </div>
          </>
        ) : (
          <>
            <div className="row-2">
              <div className="field">
                <label htmlFor="a-rows">Grid rows</label>
                <input
                  id="a-rows"
                  type="number"
                  min="5"
                  max="20"
                  value={form.gridRows}
                  onChange={(event) => set({ gridRows: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="a-cols">Grid columns</label>
                <input
                  id="a-cols"
                  type="number"
                  min="5"
                  max="20"
                  value={form.gridCols}
                  onChange={(event) => set({ gridCols: event.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="a-max">Words per puzzle</label>
              <input
                id="a-max"
                type="number"
                min="1"
                max="20"
                value={form.maxWords}
                onChange={(event) => set({ maxWords: event.target.value })}
              />
              <p className="field-help">
                Drawn from the list on a rotating basis, so repeated generation
                covers the whole list over time.
              </p>
            </div>

            <div className="field">
              <label htmlFor="a-listmode">Word list shows</label>
              <select
                id="a-listmode"
                value={form.listMode}
                onChange={(event) => set({ listMode: event.target.value })}
              >
                <option value="english">English word only</option>
                <option value="phonemes">Phonemes only</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div className={styles.check}>
              <input
                id="a-diag"
                type="checkbox"
                checked={form.allowDiagonals}
                onChange={(event) => set({ allowDiagonals: event.target.checked })}
              />
              <label htmlFor="a-diag">Allow diagonals</label>
            </div>

            <div className={styles.check}>
              <input
                id="a-rev"
                type="checkbox"
                checked={form.allowReverse}
                onChange={(event) => set({ allowReverse: event.target.checked })}
              />
              <label htmlFor="a-rev">Allow backwards words</label>
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="a-instructions">Instructions (optional)</label>
          <input
            id="a-instructions"
            type="text"
            value={form.instructions}
            onChange={(event) => set({ instructions: event.target.value })}
          />
        </div>

        <div className="btn-row">
          <button
            type="button"
            className="btn"
            onClick={save}
            disabled={!form.name.trim() || !form.wordListId}
          >
            {editingId ? 'Save changes' : 'Save activity'}
          </button>
          {editingId ? (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setEditingId(null);
                setForm({ ...BLANK, wordListId: form.wordListId });
                setFieldErrors({});
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </section>

      {/* --- Saved activities ------------------------------------------ */}
      <section className="panel" aria-labelledby="saved-heading">
        <header>
          <p className="eyebrow">Saved</p>
          <h2 id="saved-heading" className={styles.panelTitle}>
            Your activities
          </h2>
          <p className="field-help">
            Generate builds the file on the server from the stored word list.
          </p>
        </header>

        {status ? (
          <p
            className={`notice ${status.tone === 'ok' ? 'notice--ok' : ''} ${
              status.tone === 'error' ? 'notice--warn' : ''
            }`}
            role="status"
          >
            {status.message}
          </p>
        ) : null}

        <ul className={styles.cards}>
          {activities.map((activity) => (
            <li key={activity.id} className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <h3 className={styles.cardTitle}>{activity.name}</h3>
                  <p className={styles.cardMeta}>
                    {activity.type === 'WORDLE' ? 'Wordle' : 'Word Search'} ·{' '}
                    {activity.difficulty} · {activity.wordList.name} (
                    {activity.wordList.wordCount} words)
                  </p>
                </div>
                <span className={styles.badge}>
                  {activity.generationCount} generated
                </span>
              </div>

              <p className={styles.cardMeta}>
                {activity.type === 'WORDLE'
                  ? `${activity.attempts ?? 6} attempts · ${
                      activity.wordSelection === 'RANDOM'
                        ? 'random word each time'
                        : `fixed word: ${activity.targetWord?.english ?? 'none'}`
                    }`
                  : `${activity.gridRows}×${activity.gridCols} grid · ${
                      activity.maxWords ?? 5
                    } words · ${activity.allowDiagonals ? 'diagonals on' : 'no diagonals'}`}
              </p>

              <div className="btn-row">
                <button type="button" className="btn" onClick={() => generate(activity)}>
                  Generate .html
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => startEdit(activity)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => remove(activity)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {activities.length === 0 ? (
            <li className="field-help">
              No saved activities yet. Create one with the form.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
