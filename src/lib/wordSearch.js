/**
 * Word search generation.
 *
 * The generator is pure and seeded. That matters for this product: the teacher
 * approves a puzzle in the preview and then presses Generate, and the file
 * they hand to a class has to be the puzzle they just looked at. A seeded
 * generator means the same inputs always produce the same grid, and the export
 * embeds the finished grid rather than regenerating it in the browser.
 */

const DIRECTIONS = [
  { dr: 0, dc: 1, name: 'right' },
  { dr: 0, dc: -1, name: 'left' },
  { dr: 1, dc: 0, name: 'down' },
  { dr: -1, dc: 0, name: 'up' },
  { dr: 1, dc: 1, name: 'down-right' },
  { dr: 1, dc: -1, name: 'down-left' },
  { dr: -1, dc: 1, name: 'up-right' },
  { dr: -1, dc: -1, name: 'up-left' },
];

/** Small deterministic PRNG (mulberry32). */
function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function canPlace(grid, units, row, col, direction, rows, cols) {
  const endRow = row + direction.dr * (units.length - 1);
  const endCol = col + direction.dc * (units.length - 1);
  if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) return false;

  for (let i = 0; i < units.length; i += 1) {
    const r = row + direction.dr * i;
    const c = col + direction.dc * i;
    const occupant = grid[r][c];
    if (occupant !== null && occupant !== units[i]) return false;
  }
  return true;
}

/**
 * @param {Array<{word: string, phonemes: string[]}>} entries
 * @param {{rows: number, cols: number, seed: number, allowDiagonals: boolean, allowReverse: boolean}} options
 */
export function generateWordSearch(entries, options = {}) {
  const {
    rows = 10,
    cols = 10,
    seed = 1,
    allowDiagonals = true,
    allowReverse = true,
  } = options;

  const random = createRandom(seed);

  const directions = DIRECTIONS.filter((direction) => {
    const diagonal = direction.dr !== 0 && direction.dc !== 0;
    const reverse = direction.dr < 0 || direction.dc < 0;
    if (diagonal && !allowDiagonals) return false;
    if (reverse && !allowReverse) return false;
    return true;
  });

  const grid = Array.from({ length: rows }, () => new Array(cols).fill(null));
  const placements = [];
  const unplaced = [];

  // Longest first: long words are the hardest to fit, and placing them early
  // leaves the short ones plenty of room.
  const ordered = [...entries].sort((a, b) => b.phonemes.length - a.phonemes.length);

  for (const entry of ordered) {
    const units = entry.phonemes;
    let placed = false;

    // Try every cell in a shuffled order rather than firing random guesses;
    // it is exhaustive, so a word is only reported as unplaceable when it
    // genuinely does not fit.
    const cells = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) cells.push([r, c]);
    }

    for (const [r, c] of shuffled(cells, random)) {
      for (const direction of shuffled(directions, random)) {
        if (!canPlace(grid, units, r, c, direction, rows, cols)) continue;

        const coords = [];
        for (let i = 0; i < units.length; i += 1) {
          const cr = r + direction.dr * i;
          const cc = c + direction.dc * i;
          grid[cr][cc] = units[i];
          coords.push({ r: cr, c: cc });
        }
        placements.push({
          word: entry.word,
          phonemes: units,
          key: units.join(''),
          direction: direction.name,
          coords,
        });
        placed = true;
        break;
      }
      if (placed) break;
    }

    if (!placed) unplaced.push(entry);
  }

  // Fill the remaining cells from the phonemes actually in play, so that
  // distractors are plausible sounds rather than random noise.
  const pool = [...new Set(entries.flatMap((entry) => entry.phonemes))];
  const fallback = pool.length ? pool : ['æ', 'b', 'd', 'ɪ', 'p', 's', 't'];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (grid[r][c] === null) {
        grid[r][c] = fallback[Math.floor(random() * fallback.length)];
      }
    }
  }

  return { grid, placements, unplaced, rows, cols, seed };
}

/**
 * Smallest square grid that comfortably holds the longest word, used to warn
 * the teacher before they generate an impossible puzzle.
 */
export function minimumGridSize(entries) {
  const longest = entries.reduce((max, entry) => Math.max(max, entry.phonemes.length), 0);
  return Math.max(longest, 5);
}
