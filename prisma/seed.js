/**
 * Seeds the database from the Assessment 1 data files.
 *
 * The corpus and inventory stay in src/data as the canonical source and are
 * loaded from there, so there is only ever one copy of the linguistic data.
 * After Assessment 2 the application reads from the database instead; the
 * source files are the seed, not a parallel runtime path.
 *
 * Safe to re-run: phonemes are upserted, and the seed word list is only filled
 * if it is empty, so a teacher's own edits are never overwritten.
 */

const { PrismaClient } = require('@prisma/client');
const path = require('node:path');
const fs = require('node:fs');

const prisma = new PrismaClient();

const SEED_LIST_NAME = 'HCE Core Corpus';

/**
 * The data files are ES modules and this script runs under CommonJS, so they
 * are parsed rather than imported. Reading them directly keeps a single source
 * of truth; duplicating 90 words into this file would guarantee they drift.
 */
function loadDataFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', 'src', 'data', relativePath), 'utf8');
}

function parsePhonemes() {
  const source = loadDataFile('phonemes.js');
  const pattern =
    /\{ ipa: '([^']+)', label: '([^']+)', example: '([^']+)', group: '([^']+)', type: '([^']+)' \}/g;

  const phonemes = [];
  let match;
  let order = 0;
  while ((match = pattern.exec(source)) !== null) {
    phonemes.push({
      ipa: match[1],
      label: match[2],
      example: match[3],
      group: match[4],
      type: match[5],
      sortOrder: order++,
    });
  }
  return phonemes;
}

function parseCorpus() {
  const source = loadDataFile('corpus.js');
  const pattern = /\{ word: '([^']+)', phonemes: \[([^\]]+)\] \}/g;

  const words = [];
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const symbols = [...match[2].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    words.push({ english: match[1], phonemes: symbols });
  }
  return words;
}

/** The corpus mixes U+0261 with ASCII g, and r with ɹ. Fold them on the way in. */
const ALIASES = { g: 'ɡ', r: 'ɹ' };
const normalise = (symbol) => ALIASES[symbol] ?? symbol;

async function main() {
  const phonemes = parsePhonemes();
  const corpus = parseCorpus();

  if (phonemes.length === 0 || corpus.length === 0) {
    throw new Error(
      `Seed parsed ${phonemes.length} phonemes and ${corpus.length} words. ` +
        'Check that src/data/phonemes.js and src/data/corpus.js still match the expected format.',
    );
  }

  console.log(`Seeding ${phonemes.length} phonemes and ${corpus.length} words...`);

  for (const phoneme of phonemes) {
    await prisma.phoneme.upsert({
      where: { ipa: phoneme.ipa },
      update: phoneme,
      create: phoneme,
    });
  }

  const inventory = await prisma.phoneme.findMany();
  const byIpa = new Map(inventory.map((row) => [row.ipa, row.id]));

  const wordList = await prisma.wordList.upsert({
    where: { name: SEED_LIST_NAME },
    update: {},
    create: {
      name: SEED_LIST_NAME,
      description:
        'Broad HCE (Australian English) transcriptions supplied with the subject materials.',
    },
  });

  const existing = await prisma.word.count({ where: { wordListId: wordList.id } });
  if (existing > 0) {
    console.log(`"${SEED_LIST_NAME}" already holds ${existing} words — leaving it alone.`);
  } else {
    for (const entry of corpus) {
      const symbols = entry.phonemes.map(normalise);
      const unknown = symbols.filter((symbol) => !byIpa.has(symbol));
      if (unknown.length) {
        console.warn(`Skipping "${entry.english}" — unknown phonemes: ${unknown.join(', ')}`);
        continue;
      }

      await prisma.word.create({
        data: {
          english: entry.english,
          wordListId: wordList.id,
          phonemes: {
            create: symbols.map((symbol, position) => ({
              position,
              phonemeId: byIpa.get(symbol),
            })),
          },
        },
      });
    }
  }

  // A couple of ready-made configurations, so the app is demonstrable the
  // moment it starts rather than requiring setup before anything can be shown.
  const firstWord = await prisma.word.findFirst({
    where: { wordListId: wordList.id },
    orderBy: { english: 'asc' },
  });

  await prisma.activity.upsert({
    where: { name: 'Daily Wordle — mixed' },
    update: {},
    create: {
      name: 'Daily Wordle — mixed',
      type: 'WORDLE',
      difficulty: 'standard',
      title: 'Phoneme Wordle',
      instructions: 'Build the hidden word using the phoneme keyboard.',
      wordListId: wordList.id,
      attempts: 6,
      showHints: true,
      wordSelection: 'RANDOM',
      theme: 'light',
    },
  });

  await prisma.activity.upsert({
    where: { name: 'Week 1 Word Search' },
    update: {},
    create: {
      name: 'Week 1 Word Search',
      type: 'WORD_SEARCH',
      difficulty: 'supported',
      title: 'Phoneme Word Search',
      instructions: 'Drag across the grid to trace each word in phonemes.',
      wordListId: wordList.id,
      gridRows: 10,
      gridCols: 10,
      allowDiagonals: true,
      allowReverse: false,
      listMode: 'english',
      maxWords: 5,
      theme: 'light',
      ...(firstWord ? {} : {}),
    },
  });

  const counts = {
    phonemes: await prisma.phoneme.count(),
    wordLists: await prisma.wordList.count(),
    words: await prisma.word.count(),
    phonemeLinks: await prisma.wordPhoneme.count(),
    activities: await prisma.activity.count(),
  };
  console.log('Seed complete:', counts);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
