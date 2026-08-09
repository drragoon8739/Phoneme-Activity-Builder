/**
 * Wordle scoring, at the level of phonemes rather than letters.
 *
 * Two passes, so repeated phonemes are marked honestly: exact positions are
 * claimed first, then the remaining guesses are matched against what is left.
 * Without this, a guess containing /s/ twice against an answer containing it
 * once would light up both tiles and teach the student the wrong thing.
 */
export function scoreGuess(guess, answer) {
  const result = new Array(guess.length).fill('absent');
  const remaining = new Map();

  answer.forEach((symbol, index) => {
    if (guess[index] === symbol) {
      result[index] = 'correct';
    } else {
      remaining.set(symbol, (remaining.get(symbol) ?? 0) + 1);
    }
  });

  guess.forEach((symbol, index) => {
    if (result[index] === 'correct') return;
    const left = remaining.get(symbol) ?? 0;
    if (left > 0) {
      result[index] = 'present';
      remaining.set(symbol, left - 1);
    }
  });

  return result;
}

const RANK = { absent: 0, present: 1, correct: 2 };

/** Best-known status for each phoneme, for colouring the on-screen keyboard. */
export function keyboardStatuses(guesses, answer) {
  const statuses = {};
  for (const guess of guesses) {
    const marks = scoreGuess(guess, answer);
    guess.forEach((symbol, index) => {
      const next = marks[index];
      const current = statuses[symbol];
      if (!current || RANK[next] > RANK[current]) statuses[symbol] = next;
    });
  }
  return statuses;
}

export const DIFFICULTY_PRESETS = {
  supported: {
    label: 'Supported',
    attempts: 8,
    hints: true,
    revealLength: true,
    help: 'Eight attempts, English hints always visible. For early learners.',
  },
  standard: {
    label: 'Standard',
    attempts: 6,
    hints: true,
    revealLength: true,
    help: 'Six attempts, English hints on hover. The usual classroom setting.',
  },
  challenge: {
    label: 'Challenge',
    attempts: 4,
    hints: false,
    revealLength: true,
    help: 'Four attempts, no English hints until the word is solved.',
  },
};
