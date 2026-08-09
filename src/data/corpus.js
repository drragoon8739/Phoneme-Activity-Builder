/**
 * HCE phoneme word list, transcribed from the subject's
 * "HCE Wordle Phoneme Corpus" document. Broad HCE transcription,
 * one phoneme per cell.
 *
 * Assessment 1 uses this as a fixed, in-memory list. Assessment 2 replaces
 * it with a database-backed word list; every consumer of this module reads
 * through the helper functions below so that swap stays cheap.
 */

export const CORPUS = [
  // --- 3 phonemes ---------------------------------------------------------
  { word: 'bed', phonemes: ['b', 'e', 'd'] },
  { word: 'bid', phonemes: ['b', 'ɪ', 'd'] },
  { word: 'bad', phonemes: ['b', 'æ', 'd'] },
  { word: 'bud', phonemes: ['b', 'ɐ', 'd'] },
  { word: 'bird', phonemes: ['b', 'ɜː', 'd'] },
  { word: 'bark', phonemes: ['b', 'ɐː', 'k'] },
  { word: 'book', phonemes: ['b', 'ʊ', 'k'] },
  { word: 'boot', phonemes: ['b', 'ʉː', 't'] },
  { word: 'boat', phonemes: ['b', 'əʉ', 't'] },
  { word: 'bike', phonemes: ['b', 'ɑe', 'k'] },
  { word: 'bait', phonemes: ['b', 'æɪ', 't'] },
  { word: 'boil', phonemes: ['b', 'oɪ', 'l'] },
  { word: 'beard', phonemes: ['b', 'ɪə', 'd'] },
  { word: 'choice', phonemes: ['tʃ', 'oɪ', 's'] },
  { word: 'thin', phonemes: ['θ', 'ɪ', 'n'] },
  { word: 'then', phonemes: ['ð', 'e', 'n'] },
  { word: 'ship', phonemes: ['ʃ', 'ɪ', 'p'] },
  { word: 'chin', phonemes: ['tʃ', 'ɪ', 'n'] },
  { word: 'jam', phonemes: ['dʒ', 'æ', 'm'] },
  { word: 'yes', phonemes: ['j', 'e', 's'] },
  { word: 'win', phonemes: ['w', 'ɪ', 'n'] },
  { word: 'ring', phonemes: ['ɹ', 'ɪ', 'ŋ'] },
  { word: 'log', phonemes: ['l', 'ɔ', 'ɡ'] },
  { word: 'fan', phonemes: ['f', 'æ', 'n'] },
  { word: 'van', phonemes: ['v', 'æ', 'n'] },
  { word: 'sun', phonemes: ['s', 'ɐ', 'n'] },
  { word: 'zip', phonemes: ['z', 'ɪ', 'p'] },
  { word: 'gum', phonemes: ['ɡ', 'ɐ', 'm'] },
  { word: 'hat', phonemes: ['h', 'æ', 't'] },
  { word: 'fork', phonemes: ['f', 'oː', 'k'] },

  // --- 4 phonemes ---------------------------------------------------------
  { word: 'stop', phonemes: ['s', 't', 'ɔ', 'p'] },
  { word: 'frog', phonemes: ['f', 'ɹ', 'ɔ', 'ɡ'] },
  { word: 'clap', phonemes: ['k', 'l', 'æ', 'p'] },
  { word: 'slip', phonemes: ['s', 'l', 'ɪ', 'p'] },
  { word: 'drum', phonemes: ['d', 'ɹ', 'ɐ', 'm'] },
  { word: 'grin', phonemes: ['ɡ', 'ɹ', 'ɪ', 'n'] },
  { word: 'train', phonemes: ['t', 'ɹ', 'æɪ', 'n'] },
  { word: 'cloud', phonemes: ['k', 'l', 'æɔ', 'd'] },
  { word: 'snake', phonemes: ['s', 'n', 'æɪ', 'k'] },
  { word: 'smile', phonemes: ['s', 'm', 'ɑe', 'l'] },
  { word: 'milk', phonemes: ['m', 'ɪ', 'l', 'k'] },
  { word: 'hand', phonemes: ['h', 'æ', 'n', 'd'] },
  { word: 'tent', phonemes: ['t', 'e', 'n', 't'] },
  { word: 'jump', phonemes: ['dʒ', 'ɐ', 'm', 'p'] },
  { word: 'lamp', phonemes: ['l', 'æ', 'm', 'p'] },
  { word: 'bank', phonemes: ['b', 'æ', 'ŋ', 'k'] },
  { word: 'frame', phonemes: ['f', 'ɹ', 'æɪ', 'm'] },
  { word: 'cold', phonemes: ['k', 'əʉ', 'l', 'd'] },
  { word: 'wind', phonemes: ['w', 'ɪ', 'n', 'd'] },
  { word: 'soft', phonemes: ['s', 'ɔ', 'f', 't'] },
  { word: 'gift', phonemes: ['ɡ', 'ɪ', 'f', 't'] },
  { word: 'desk', phonemes: ['d', 'e', 's', 'k'] },
  { word: 'left', phonemes: ['l', 'e', 'f', 't'] },
  { word: 'pond', phonemes: ['p', 'ɔ', 'n', 'd'] },
  { word: 'golf', phonemes: ['ɡ', 'ɔ', 'l', 'f'] },
  { word: 'silk', phonemes: ['s', 'ɪ', 'l', 'k'] },
  { word: 'great', phonemes: ['ɡ', 'ɹ', 'æɪ', 't'] },
  { word: 'crab', phonemes: ['k', 'ɹ', 'æ', 'b'] },
  { word: 'plug', phonemes: ['p', 'l', 'ɐ', 'ɡ'] },
  { word: 'quiz', phonemes: ['k', 'w', 'ɪ', 'z'] },

  // --- 5 phonemes ---------------------------------------------------------
  { word: 'stamp', phonemes: ['s', 't', 'æ', 'm', 'p'] },
  { word: 'plant', phonemes: ['p', 'l', 'æ', 'n', 't'] },
  { word: 'blank', phonemes: ['b', 'l', 'æ', 'ŋ', 'k'] },
  { word: 'grand', phonemes: ['ɡ', 'ɹ', 'æ', 'n', 'd'] },
  { word: 'clamp', phonemes: ['k', 'l', 'æ', 'm', 'p'] },
  { word: 'twist', phonemes: ['t', 'w', 'ɪ', 's', 't'] },
  { word: 'trust', phonemes: ['t', 'ɹ', 'ɐ', 's', 't'] },
  { word: 'drink', phonemes: ['d', 'ɹ', 'ɪ', 'ŋ', 'k'] },
  { word: 'brisk', phonemes: ['b', 'ɹ', 'ɪ', 's', 'k'] },
  { word: 'shrimp', phonemes: ['ʃ', 'ɹ', 'ɪ', 'm', 'p'] },
  { word: 'scrap', phonemes: ['s', 'k', 'ɹ', 'æ', 'p'] },
  { word: 'scribe', phonemes: ['s', 'k', 'ɹ', 'ɑe', 'b'] },
  { word: 'scream', phonemes: ['s', 'k', 'ɹ', 'iː', 'm'] },
  { word: 'splash', phonemes: ['s', 'p', 'l', 'æ', 'ʃ'] },
  { word: 'spring', phonemes: ['s', 'p', 'ɹ', 'ɪ', 'ŋ'] },
  { word: 'strap', phonemes: ['s', 't', 'ɹ', 'æ', 'p'] },
  { word: 'street', phonemes: ['s', 't', 'ɹ', 'iː', 't'] },
  { word: 'scrub', phonemes: ['s', 'k', 'ɹ', 'ɐ', 'b'] },
  { word: 'flask', phonemes: ['f', 'l', 'ɐː', 's', 'k'] },
  { word: 'clasp', phonemes: ['k', 'l', 'ɐː', 's', 'p'] },
  { word: 'cleft', phonemes: ['k', 'l', 'e', 'f', 't'] },
  { word: 'glint', phonemes: ['ɡ', 'l', 'ɪ', 'n', 't'] },
  { word: 'blend', phonemes: ['b', 'l', 'e', 'n', 'd'] },
  { word: 'strain', phonemes: ['s', 't', 'ɹ', 'æɪ', 'n'] },
  { word: 'thrust', phonemes: ['θ', 'ɹ', 'ɐ', 's', 't'] },
  { word: 'sprawl', phonemes: ['s', 'p', 'ɹ', 'oː', 'l'] },
  { word: 'scrawl', phonemes: ['s', 'k', 'ɹ', 'oː', 'l'] },
  { word: 'sprig', phonemes: ['s', 'p', 'ɹ', 'ɪ', 'ɡ'] },
  { word: 'sprout', phonemes: ['s', 'p', 'ɹ', 'æɔ', 't'] },
  { word: 'smoked', phonemes: ['s', 'm', 'əʉ', 'k', 't'] },
];

/** Words of a given phoneme length. */
export function wordsOfLength(length) {
  return CORPUS.filter((entry) => entry.phonemes.length === length);
}

/** Every phoneme length present in the corpus, ascending. */
export const AVAILABLE_LENGTHS = [
  ...new Set(CORPUS.map((entry) => entry.phonemes.length)),
].sort((a, b) => a - b);

/** Look up a single corpus entry by its English spelling. */
export function findWord(word) {
  return CORPUS.find((entry) => entry.word === word) ?? null;
}

/**
 * A sensible starting word list for the Word Search builder: five short
 * words that share a manageable phoneme pool.
 */
export const DEFAULT_WORD_SEARCH_WORDS = [
  'chin',
  'bait',
  'jam',
  'ring',
  'fan',
];
