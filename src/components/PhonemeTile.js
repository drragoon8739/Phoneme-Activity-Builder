'use client';

import { getPhoneme, normalisePhoneme, describePhoneme } from '@/data/phonemes';
import styles from './PhonemeTile.module.css';

/**
 * The one repeated object the whole product is built from.
 *
 * A tile always carries the IPA symbol as its primary label and the plain
 * English equivalence underneath. On hover *and* on keyboard focus it reveals
 * the full hint, e.g. "/θ/ — TH (as in thin)". Focus is included because a
 * hover-only hint is invisible to anyone using a keyboard or a switch device.
 *
 * `state` drives Wordle feedback colouring: 'correct' | 'present' | 'absent'.
 */
export default function PhonemeTile({
  symbol,
  as = 'div',
  state,
  size = 'md',
  showGloss = true,
  showHint = true,
  onClick,
  disabled,
  selected,
  className = '',
  ...rest
}) {
  const ipa = normalisePhoneme(symbol);
  const phoneme = getPhoneme(ipa);
  const empty = !ipa;

  const Element = as === 'button' ? 'button' : as;
  const classes = [
    styles.tile,
    styles[size],
    state ? styles[state] : '',
    selected ? styles.selected : '',
    as === 'button' ? styles.interactive : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const hint = phoneme ? `${phoneme.label} (as in ${phoneme.example})` : null;

  return (
    <Element
      className={classes}
      onClick={onClick}
      disabled={as === 'button' ? disabled : undefined}
      type={as === 'button' ? 'button' : undefined}
      aria-label={phoneme ? describePhoneme(ipa) : undefined}
      title={phoneme ? describePhoneme(ipa) : undefined}
      {...rest}
    >
      <span className={styles.glyph} aria-hidden={phoneme ? 'true' : undefined}>
        {empty ? '' : ipa}
      </span>
      {showGloss && phoneme ? (
        <span className={styles.gloss} aria-hidden="true">
          {phoneme.label}
        </span>
      ) : null}
      {showHint && hint ? (
        <span className={styles.hint} role="tooltip" aria-hidden="true">
          <span className={styles.hintIpa}>/{ipa}/</span>
          {hint}
        </span>
      ) : null}
    </Element>
  );
}
