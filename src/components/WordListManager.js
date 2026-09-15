'use client';

import { useCallback, useEffect, useState } from 'react';

import PhonemeKeyboard from './PhonemeKeyboard';
import PhonemeTile from './PhonemeTile';
import { api, ApiError } from '@/lib/apiClient';
import styles from './WordListManager.module.css';

const EMPTY_WORD = { english: '', phonemes: [], hint: '' };

/**
 * Create, read, update and delete word lists and the words inside them.
 *
 * Words are composed on the phoneme keyboard rather than typed, which is not
 * only an input convenience: it means the client sends an array of symbols,
 * so the server never has to guess whether "tʃɪn" was meant as three phonemes
 * or four. The ambiguity is removed at the point of entry.
 */
export default function WordListManager() {
  const [lists, setLists] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  // List form
  const [newList, setNewList] = useState({ name: '', description: '' });

  // Word form — doubles as the edit form when editingId is set
  const [wordForm, setWordForm] = useState(EMPTY_WORD);
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const say = (message, tone = 'info') => setStatus({ message, tone });

  const report = (error) => {
    if (error instanceof ApiError) {
      setFieldErrors(error.fields ?? {});
      say(error.message, 'error');
    } else {
      say('Something went wrong', 'error');
    }
  };

  const loadLists = useCallback(async () => {
    const data = await api.get('/api/word-lists');
    setLists(data.wordLists);
    return data.wordLists;
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setDetail(null);
      return;
    }
    const data = await api.get(`/api/word-lists/${id}`);
    setDetail(data.wordList);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadLists();
        if (loaded.length) {
          setActiveId(loaded[0].id);
          await loadDetail(loaded[0].id);
        }
      } catch (error) {
        report(error);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectList(id) {
    setActiveId(id);
    setEditingId(null);
    setWordForm(EMPTY_WORD);
    setFieldErrors({});
    try {
      await loadDetail(id);
    } catch (error) {
      report(error);
    }
  }

  // --- Word list CRUD ------------------------------------------------------

  async function createList() {
    setFieldErrors({});
    try {
      const data = await api.post('/api/word-lists', newList);
      setNewList({ name: '', description: '' });
      await loadLists();
      await selectList(data.wordList.id);
      say(`Created "${data.wordList.name}"`, 'ok');
    } catch (error) {
      report(error);
    }
  }

  async function renameList() {
    const name = window.prompt('New name for this list', detail.name);
    if (!name || name === detail.name) return;
    try {
      await api.patch(`/api/word-lists/${detail.id}`, { name });
      await loadLists();
      await loadDetail(detail.id);
      say('List renamed', 'ok');
    } catch (error) {
      report(error);
    }
  }

  async function deleteList() {
    const count = detail.words.length;
    const confirmed = window.confirm(
      count
        ? `Delete "${detail.name}" and its ${count} word(s)? Activities built on it are deleted too.`
        : `Delete "${detail.name}"?`,
    );
    if (!confirmed) return;

    try {
      // The API refuses a non-empty list unless force=true, so the confirmation
      // above is what unlocks the destructive path.
      await api.delete(`/api/word-lists/${detail.id}?force=true`);
      const remaining = await loadLists();
      const next = remaining[0]?.id ?? null;
      setActiveId(next);
      await loadDetail(next);
      say('List deleted', 'ok');
    } catch (error) {
      report(error);
    }
  }

  // --- Word CRUD -----------------------------------------------------------

  function startEdit(word) {
    setEditingId(word.id);
    setWordForm({
      english: word.english,
      phonemes: [...word.phonemes],
      hint: word.hint ?? '',
    });
    setFieldErrors({});
    say(`Editing "${word.english}"`);
  }

  function cancelEdit() {
    setEditingId(null);
    setWordForm(EMPTY_WORD);
    setFieldErrors({});
  }

  async function saveWord() {
    setFieldErrors({});
    const payload = {
      english: wordForm.english,
      phonemes: wordForm.phonemes,
      hint: wordForm.hint || null,
    };

    try {
      if (editingId) {
        await api.patch(`/api/words/${editingId}`, payload);
        say(`Updated "${payload.english}"`, 'ok');
      } else {
        await api.post('/api/words', { ...payload, wordListId: activeId });
        say(`Added "${payload.english}"`, 'ok');
      }
      cancelEdit();
      await loadDetail(activeId);
      await loadLists();
    } catch (error) {
      report(error);
    }
  }

  async function removeWord(word) {
    if (!window.confirm(`Delete "${word.english}"?`)) return;
    try {
      await api.delete(`/api/words/${word.id}`);
      await loadDetail(activeId);
      await loadLists();
      say(`Deleted "${word.english}"`, 'ok');
    } catch (error) {
      report(error);
    }
  }

  if (loading) {
    return <p className="notice">Loading word lists…</p>;
  }

  return (
    <div className="builder-grid">
      {/* --- Lists ---------------------------------------------------- */}
      <section className="panel" aria-labelledby="lists-heading">
        <header>
          <p className="eyebrow">Word lists</p>
          <h2 id="lists-heading" className={styles.panelTitle}>
            Your lists
          </h2>
        </header>

        <ul className={styles.listNav}>
          {lists.map((list) => (
            <li key={list.id}>
              <button
                type="button"
                className={`${styles.listButton} ${
                  list.id === activeId ? styles.listButtonOn : ''
                }`}
                onClick={() => selectList(list.id)}
                aria-current={list.id === activeId ? 'true' : undefined}
              >
                <span className={styles.listName}>{list.name}</span>
                <span className={styles.listMeta}>
                  {list.wordCount} words · {list.activityCount} activities
                </span>
              </button>
            </li>
          ))}
          {lists.length === 0 ? (
            <li className="field-help">No lists yet. Create one below.</li>
          ) : null}
        </ul>

        <hr className={styles.rule} />

        <div className="field">
          <label htmlFor="list-name">New list name</label>
          <input
            id="list-name"
            type="text"
            value={newList.name}
            onChange={(event) => setNewList({ ...newList, name: event.target.value })}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name ? (
            <p className={styles.fieldError}>{fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="list-description">Description (optional)</label>
          <input
            id="list-description"
            type="text"
            value={newList.description}
            onChange={(event) =>
              setNewList({ ...newList, description: event.target.value })
            }
          />
        </div>

        <button
          type="button"
          className="btn btn--block"
          onClick={createList}
          disabled={!newList.name.trim()}
        >
          Create word list
        </button>
      </section>

      {/* --- Words ---------------------------------------------------- */}
      <section className="panel" aria-labelledby="words-heading">
        <header className={styles.detailHead}>
          <div>
            <p className="eyebrow">Words</p>
            <h2 id="words-heading" className={styles.panelTitle}>
              {detail ? detail.name : 'No list selected'}
            </h2>
            {detail?.description ? (
              <p className="field-help">{detail.description}</p>
            ) : null}
          </div>
          {detail ? (
            <div className="btn-row">
              <button type="button" className="btn btn--secondary" onClick={renameList}>
                Rename
              </button>
              <button type="button" className="btn btn--secondary" onClick={deleteList}>
                Delete list
              </button>
            </div>
          ) : null}
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

        {detail ? (
          <>
            <table className={styles.table}>
              <caption className="sr-only">
                Words in {detail.name}, with their phoneme sequences
              </caption>
              <thead>
                <tr>
                  <th scope="col">English</th>
                  <th scope="col">Phonemes</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.words.map((word) => (
                  <tr key={word.id} className={editingId === word.id ? styles.editing : ''}>
                    <td>
                      <strong>{word.english}</strong>
                      {word.hint ? (
                        <span className={styles.hintText}>{word.hint}</span>
                      ) : null}
                    </td>
                    <td>
                      <span className={styles.tileRow}>
                        {word.phonemes.map((symbol, index) => (
                          <PhonemeTile
                            key={`${symbol}-${index}`}
                            symbol={symbol}
                            size="sm"
                            showGloss={false}
                          />
                        ))}
                      </span>
                    </td>
                    <td className={styles.actions}>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => startEdit(word)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => removeWord(word)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {detail.words.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="field-help">
                      No words in this list yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            <hr className={styles.rule} />

            <h3 className={styles.formTitle}>
              {editingId ? 'Edit word' : 'Add a word'}
            </h3>

            <div className="field">
              <label htmlFor="word-english">English spelling</label>
              <input
                id="word-english"
                type="text"
                value={wordForm.english}
                onChange={(event) =>
                  setWordForm({ ...wordForm, english: event.target.value })
                }
                aria-invalid={Boolean(fieldErrors.english)}
              />
              {fieldErrors.english ? (
                <p className={styles.fieldError}>{fieldErrors.english}</p>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor="word-hint">Hint for students (optional)</label>
              <input
                id="word-hint"
                type="text"
                value={wordForm.hint}
                onChange={(event) => setWordForm({ ...wordForm, hint: event.target.value })}
              />
            </div>

            <div className="field">
              <span className="field-label">Phoneme sequence</span>
              <div className={styles.composer}>
                {wordForm.phonemes.length === 0 ? (
                  <p className="field-help">
                    Build the word by pressing keys below — one press, one phoneme.
                  </p>
                ) : (
                  <span className={styles.tileRow}>
                    {wordForm.phonemes.map((symbol, index) => (
                      <PhonemeTile key={`${symbol}-${index}`} symbol={symbol} size="sm" />
                    ))}
                  </span>
                )}
              </div>
              {fieldErrors.phonemes ? (
                <p className={styles.fieldError}>{fieldErrors.phonemes}</p>
              ) : null}
            </div>

            <div className="btn-row" style={{ marginBottom: 'var(--space-4)' }}>
              <button
                type="button"
                className="btn"
                onClick={saveWord}
                disabled={!wordForm.english.trim() || wordForm.phonemes.length < 2}
              >
                {editingId ? 'Save changes' : 'Add word'}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() =>
                  setWordForm({ ...wordForm, phonemes: wordForm.phonemes.slice(0, -1) })
                }
                disabled={wordForm.phonemes.length === 0}
              >
                Delete phoneme
              </button>
              {editingId ? (
                <button type="button" className="btn btn--secondary" onClick={cancelEdit}>
                  Cancel
                </button>
              ) : null}
            </div>

            <PhonemeKeyboard
              legend="Phoneme keyboard"
              description="Each key adds one phoneme, however many characters it uses."
              onSelect={(symbol) =>
                setWordForm((current) => ({
                  ...current,
                  phonemes: [...current.phonemes, symbol],
                }))
              }
            />
          </>
        ) : (
          <p className="notice">Create a word list to start adding words.</p>
        )}
      </section>
    </div>
  );
}
