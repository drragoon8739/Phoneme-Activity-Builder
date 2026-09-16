'use client';

import { useCallback, useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/apiClient';

/**
 * Loads word lists and the words inside the selected one.
 *
 * Both builders need the same thing — a list to choose from and its words — so
 * the fetching, loading and error states live here rather than being written
 * twice. In Assessment 1 both components imported the corpus directly from a
 * JavaScript module; this hook is what replaced that import, and it is the only
 * change either builder needed to become database-driven.
 */
export function useWordLists() {
  const [lists, setLists] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await api.get('/api/word-lists');
        if (cancelled) return;

        setLists(data.wordLists);
        // Default to the first list that actually has words in it, so the
        // builder opens on something usable rather than an empty selector.
        const usable = data.wordLists.find((list) => list.wordCount > 0) ?? data.wordLists[0];
        setSelectedId(usable?.id ?? null);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : 'Could not load word lists');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!selectedId) {
        if (!cancelled) setWords([]);
        return;
      }
      try {
        const data = await api.get(`/api/words?wordListId=${selectedId}`);
        if (!cancelled) setWords(data.words);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : 'Could not load words');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const refresh = useCallback(async () => {
    if (!selectedId) return;
    const data = await api.get(`/api/words?wordListId=${selectedId}`);
    setWords(data.words);
  }, [selectedId]);

  /** Phoneme lengths present in the loaded list, ascending. */
  const availableLengths = [...new Set(words.map((word) => word.phonemes.length))].sort(
    (a, b) => a - b,
  );

  return {
    lists,
    selectedId,
    setSelectedId,
    words,
    availableLengths,
    loading,
    error,
    refresh,
  };
}
