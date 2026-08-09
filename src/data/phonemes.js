/**
 * HCE (Australian English) phoneme inventory.
 *
 * The keyboard layout below is taken directly from the subject's
 * "Keyboard for wɜːdəl" specification. Each phoneme carries:
 *   ipa     - the IPA symbol, exactly as it appears in the corpus
 *   label   - the plain-English button label a teacher/student recognises
 *   example - a key word demonstrating the sound
 *   group   - used for grouping and for the keyboard section headings
 *
 * The label + example pair is what powers the mouse-over hint required by
 * the brief, e.g. /θ/ shows the button label TH (as in thin).
 */

export const PHONEMES = [
  // --- Plosives -----------------------------------------------------------
  { ipa: 'p', label: 'P', example: 'pin', group: 'Plosives', type: 'consonant' },
  { ipa: 't', label: 'T', example: 'tin', group: 'Plosives', type: 'consonant' },
  { ipa: 'k', label: 'K', example: 'kit', group: 'Plosives', type: 'consonant' },
  { ipa: 'b', label: 'B', example: 'bed', group: 'Plosives', type: 'consonant' },
  { ipa: 'd', label: 'D', example: 'desk', group: 'Plosives', type: 'consonant' },
  { ipa: 'ɡ', label: 'G', example: 'gum', group: 'Plosives', type: 'consonant' },

  // --- Nasals -------------------------------------------------------------
  { ipa: 'n', label: 'N', example: 'net', group: 'Nasals', type: 'consonant' },
  { ipa: 'm', label: 'M', example: 'map', group: 'Nasals', type: 'consonant' },
  { ipa: 'ŋ', label: 'NG', example: 'ring', group: 'Nasals', type: 'consonant' },

  // --- Fricatives ---------------------------------------------------------
  { ipa: 'f', label: 'F', example: 'fan', group: 'Fricatives', type: 'consonant' },
  { ipa: 's', label: 'S', example: 'sun', group: 'Fricatives', type: 'consonant' },
  { ipa: 'θ', label: 'TH', example: 'thin', group: 'Fricatives', type: 'consonant' },
  { ipa: 'ʃ', label: 'SH', example: 'ship', group: 'Fricatives', type: 'consonant' },
  { ipa: 'v', label: 'V', example: 'van', group: 'Fricatives', type: 'consonant' },
  { ipa: 'z', label: 'Z', example: 'zip', group: 'Fricatives', type: 'consonant' },
  { ipa: 'ð', label: 'TH', example: 'then', group: 'Fricatives', type: 'consonant' },
  { ipa: 'ʒ', label: 'ZH', example: 'measure', group: 'Fricatives', type: 'consonant' },
  { ipa: 'h', label: 'H', example: 'hat', group: 'Fricatives', type: 'consonant' },

  // --- Approximants -------------------------------------------------------
  { ipa: 'l', label: 'L', example: 'log', group: 'Approximants', type: 'consonant' },
  { ipa: 'ɹ', label: 'R', example: 'ring', group: 'Approximants', type: 'consonant' },
  { ipa: 'w', label: 'W', example: 'win', group: 'Approximants', type: 'consonant' },
  { ipa: 'j', label: 'Y', example: 'yes', group: 'Approximants', type: 'consonant' },

  // --- Affricates ---------------------------------------------------------
  { ipa: 'tʃ', label: 'CH', example: 'chin', group: 'Affricates', type: 'consonant' },
  { ipa: 'dʒ', label: 'J', example: 'jam', group: 'Affricates', type: 'consonant' },

  // --- Short and long vowels ---------------------------------------------
  { ipa: 'iː', label: 'EE', example: 'street', group: 'Vowels', type: 'vowel' },
  { ipa: 'ɪ', label: 'I', example: 'bid', group: 'Vowels', type: 'vowel' },
  { ipa: 'e', label: 'E', example: 'bed', group: 'Vowels', type: 'vowel' },
  { ipa: 'eː', label: 'AIR', example: 'square', group: 'Vowels', type: 'vowel' },
  { ipa: 'æ', label: 'A', example: 'bad', group: 'Vowels', type: 'vowel' },
  { ipa: 'ɐ', label: 'U', example: 'bud', group: 'Vowels', type: 'vowel' },
  { ipa: 'ɐː', label: 'AR', example: 'bark', group: 'Vowels', type: 'vowel' },
  { ipa: 'ɜː', label: 'ER', example: 'bird', group: 'Vowels', type: 'vowel' },
  { ipa: 'ʉː', label: 'OO', example: 'boot', group: 'Vowels', type: 'vowel' },
  { ipa: 'ɔ', label: 'O', example: 'log', group: 'Vowels', type: 'vowel' },
  { ipa: 'oː', label: 'OR', example: 'fork', group: 'Vowels', type: 'vowel' },
  { ipa: 'ʊ', label: 'U', example: 'book', group: 'Vowels', type: 'vowel' },

  // --- Diphthongs and schwa ----------------------------------------------
  { ipa: 'æɪ', label: 'AY', example: 'bait', group: 'Diphthongs', type: 'vowel' },
  { ipa: 'ɑe', label: 'IE', example: 'bike', group: 'Diphthongs', type: 'vowel' },
  { ipa: 'oɪ', label: 'OY', example: 'boil', group: 'Diphthongs', type: 'vowel' },
  { ipa: 'əʉ', label: 'OH', example: 'boat', group: 'Diphthongs', type: 'vowel' },
  { ipa: 'æɔ', label: 'OW', example: 'cloud', group: 'Diphthongs', type: 'vowel' },
  { ipa: 'ɪə', label: 'EAR', example: 'beard', group: 'Diphthongs', type: 'vowel' },
  { ipa: 'ə', label: 'UH', example: 'wɜːdəl', group: 'Diphthongs', type: 'vowel' },
];

/**
 * Keyboard layout, row by row, exactly as given in the subject materials.
 * Kept separate from PHONEMES so the visual arrangement can change without
 * touching the linguistic data.
 */
export const KEYBOARD_ROWS = [
  ['p', 't', 'k'],
  ['b', 'd', 'ɡ'],
  ['n', 'm', 'ŋ'],
  ['f', 's', 'θ', 'ʃ'],
  ['v', 'z', 'ð', 'ʒ'],
  ['l', 'ɹ', 'w', 'j'],
  ['h', 'tʃ', 'dʒ'],
  ['iː', 'ɪ', 'e', 'eː'],
  ['æ', 'ɐ', 'ɐː', 'ɜː'],
  ['ʉː', 'ɔ', 'oː', 'ʊ'],
  ['æɪ', 'ɑe', 'oɪ', 'əʉ'],
  ['æɔ', 'ɪə', 'ə'],
];

/**
 * Row headings for the keyboard. An empty string continues the previous
 * heading, so a two-row group reads as one block. These are kept separate from
 * the `group` field on each phoneme because row 7 (h, tʃ, dʒ) deliberately
 * mixes a fricative with the two affricates, exactly as the subject's layout
 * does.
 */
export const KEYBOARD_ROW_LABELS = [
  'Plosives',
  '',
  'Nasals',
  'Fricatives',
  '',
  'Approximants',
  'Affricates',
  'Vowels',
  '',
  '',
  'Diphthongs',
  '',
];

/** Fast lookup by IPA symbol. */
export const PHONEME_MAP = Object.fromEntries(PHONEMES.map((p) => [p.ipa, p]));

/**
 * The corpus mixes U+0261 (ɡ, script g) with ASCII "g", and some sources use
 * "r" where the corpus uses "ɹ". Normalising on the way in stops a single
 * stray character silently breaking a puzzle.
 */
const ALIASES = { g: 'ɡ', r: 'ɹ', ɡ: 'ɡ' };

export function normalisePhoneme(symbol) {
  const trimmed = String(symbol).trim();
  return ALIASES[trimmed] ?? trimmed;
}

/** Look up a phoneme, tolerating the aliases above. */
export function getPhoneme(symbol) {
  return PHONEME_MAP[normalisePhoneme(symbol)] ?? null;
}

/** The hover hint text required by the brief, e.g. "TH (as in thin)". */
export function hintFor(symbol) {
  const p = getPhoneme(symbol);
  if (!p) return normalisePhoneme(symbol);
  return `${p.label} (as in ${p.example})`;
}

/** Full accessible description, e.g. "/θ/ — TH (as in thin)". */
export function describePhoneme(symbol) {
  return `/${normalisePhoneme(symbol)}/ — ${hintFor(symbol)}`;
}

/** Split a phoneme string such as "b æɪ t" into normalised units. */
export function parsePhonemeString(value) {
  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(normalisePhoneme);
}
