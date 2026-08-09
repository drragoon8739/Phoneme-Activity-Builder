'use client';

import PhonemeTile from './PhonemeTile';
import styles from './PhonemeStrip.module.css';

/**
 * A word shown as phonemes. `english` is only rendered when `revealEnglish`
 * is true, which is how the brief's "show the English equivalence when the
 * answer is correct" rule is enforced in one place instead of three.
 */
export default function PhonemeStrip({
  phonemes = [],
  english,
  revealEnglish = false,
  size = 'md',
  states = [],
  label,
}) {
  return (
    <div className={styles.strip}>
      {label ? <p className="field-label">{label}</p> : null}

      <div className={styles.tiles}>
        {phonemes.length === 0 ? (
          <p className={styles.empty}>No phonemes chosen yet.</p>
        ) : (
          phonemes.map((symbol, index) => (
            <PhonemeTile
              key={`${symbol}-${index}`}
              symbol={symbol}
              size={size}
              state={states[index]}
            />
          ))
        )}
      </div>

      {english ? (
        <p className={styles.english}>
          {revealEnglish ? (
            <>
              <span className={styles.equals} aria-hidden="true">
                =
              </span>
              <strong>{english}</strong>
            </>
          ) : (
            <span className={styles.hidden}>English word hidden until solved</span>
          )}
        </p>
      ) : null}
    </div>
  );
}
