import prisma from './db';

/**
 * The seam between the database and everything else.
 *
 * Assessment 1 built the whole frontend against plain objects of the shape
 * `{ word, phonemes: [...] }`. Keeping that shape here means the generators,
 * the tile components and the export templates all still work unchanged, and
 * the database swap stays invisible to them. Every conversion between database
 * rows and that shape happens in this file and nowhere else.
 */

/** Include clause that pulls a word's phonemes in the correct order. */
const withPhonemes = {
  phonemes: {
    orderBy: { position: 'asc' },
    include: { phoneme: true },
  },
};

/**
 * Database row → the shape the rest of the app already speaks.
 * The `phonemes` array holds IPA strings; `details` keeps the full records for
 * anything that needs labels and examples.
 */
export function toWordEntry(row) {
  return {
    id: row.id,
    word: row.english,
    english: row.english,
    hint: row.hint ?? null,
    notes: row.notes ?? null,
    wordListId: row.wordListId,
    phonemes: row.phonemes.map((link) => link.phoneme.ipa),
    details: row.phonemes.map((link) => ({
      ipa: link.phoneme.ipa,
      label: link.phoneme.label,
      example: link.phoneme.example,
    })),
  };
}

// --- Phonemes ---------------------------------------------------------------

export async function listPhonemes() {
  return prisma.phoneme.findMany({ orderBy: { sortOrder: 'asc' } });
}

/**
 * Resolve IPA strings to phoneme rows, preserving the caller's order.
 *
 * Returns `{ resolved, unknown }` rather than throwing, so the route can report
 * every bad symbol at once instead of failing on the first. A teacher pasting a
 * transcription with two typos should see both.
 */
export async function resolvePhonemes(symbols) {
  const unique = [...new Set(symbols)];
  const rows = await prisma.phoneme.findMany({ where: { ipa: { in: unique } } });
  const byIpa = new Map(rows.map((row) => [row.ipa, row]));

  const unknown = unique.filter((symbol) => !byIpa.has(symbol));
  const resolved = unknown.length ? [] : symbols.map((symbol) => byIpa.get(symbol));

  return { resolved, unknown };
}

// --- Word lists -------------------------------------------------------------

export async function listWordLists() {
  const rows = await prisma.wordList.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { words: true, activities: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    wordCount: row._count.words,
    activityCount: row._count.activities,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function getWordList(id) {
  const row = await prisma.wordList.findUnique({
    where: { id },
    include: { words: { include: withPhonemes, orderBy: { english: 'asc' } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    words: row.words.map(toWordEntry),
  };
}

// --- Words ------------------------------------------------------------------

export async function listWords({ wordListId, length, contains } = {}) {
  const where = {};
  if (wordListId) where.wordListId = wordListId;

  // "Words containing this phoneme" is a relational query, not a text search.
  // A substring search would match /t/ inside /tʃ/ and quietly return wrong
  // results; joining on the phoneme row cannot.
  if (contains) {
    where.phonemes = { some: { phoneme: { ipa: contains } } };
  }

  const rows = await prisma.word.findMany({
    where,
    include: withPhonemes,
    orderBy: { english: 'asc' },
  });

  const entries = rows.map(toWordEntry);
  // Phoneme count is a property of the joined rows, so it is filtered after
  // loading rather than in SQL. The corpus is small enough that this is fine.
  return length ? entries.filter((entry) => entry.phonemes.length === length) : entries;
}

export async function getWord(id) {
  const row = await prisma.word.findUnique({ where: { id }, include: withPhonemes });
  return row ? toWordEntry(row) : null;
}

/**
 * Create a word and its ordered phoneme rows in one transaction.
 *
 * Without the transaction a crash between the two writes would leave a word
 * with no phonemes — a record that looks fine in a list and breaks every
 * activity that touches it.
 */
export async function createWord({ english, phonemes, hint, notes, wordListId }) {
  return prisma.word.create({
    data: {
      english,
      hint: hint ?? null,
      notes: notes ?? null,
      wordListId,
      phonemes: {
        create: phonemes.map((phoneme, position) => ({
          position,
          phonemeId: phoneme.id,
        })),
      },
    },
    include: withPhonemes,
  });
}

/**
 * Update a word. When the phoneme sequence changes it is replaced wholesale
 * rather than diffed: positions would have to be renumbered anyway, and a
 * delete-then-insert inside one transaction is easier to reason about — and to
 * verify — than an in-place reshuffle.
 */
export async function updateWord(id, { english, phonemes, hint, notes }) {
  return prisma.$transaction(async (tx) => {
    if (phonemes) {
      await tx.wordPhoneme.deleteMany({ where: { wordId: id } });
    }

    return tx.word.update({
      where: { id },
      data: {
        ...(english !== undefined ? { english } : {}),
        ...(hint !== undefined ? { hint } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(phonemes
          ? {
              phonemes: {
                create: phonemes.map((phoneme, position) => ({
                  position,
                  phonemeId: phoneme.id,
                })),
              },
            }
          : {}),
      },
      include: withPhonemes,
    });
  });
}

export async function deleteWord(id) {
  return prisma.word.delete({ where: { id } });
}

// --- Activities -------------------------------------------------------------

export async function listActivities() {
  const rows = await prisma.activity.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      wordList: { select: { id: true, name: true, _count: { select: { words: true } } } },
      targetWord: { select: { id: true, english: true } },
      _count: { select: { generations: true } },
    },
  });

  return rows.map((row) => ({
    ...row,
    wordList: {
      id: row.wordList.id,
      name: row.wordList.name,
      wordCount: row.wordList._count.words,
    },
    generationCount: row._count.generations,
    _count: undefined,
  }));
}

export async function getActivity(id) {
  return prisma.activity.findUnique({
    where: { id },
    include: {
      wordList: { select: { id: true, name: true } },
      targetWord: { include: withPhonemes },
      generations: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
}

/** Words available to an activity, in the shape the generators expect. */
export async function wordsForActivity(activity) {
  const rows = await prisma.word.findMany({
    where: { wordListId: activity.wordListId },
    include: withPhonemes,
    orderBy: { english: 'asc' },
  });
  return rows.map(toWordEntry);
}

export async function recordGeneration({ activityId, filename, wordCount, selectedWord }) {
  return prisma.generation.create({
    data: { activityId, filename, wordCount, selectedWord: selectedWord ?? null },
  });
}
