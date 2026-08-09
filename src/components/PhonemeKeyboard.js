'use client';

import { KEYBOARD_ROWS, KEYBOARD_ROW_LABELS } from '@/data/phonemes';
import PhonemeTile from './PhonemeTile';
import styles from './PhonemeKeyboard.module.css';

/**
 * The phoneme keyboard, laid out row by row exactly as specified in the
 * subject's keyboard document. Teachers compose words by clicking symbols
 * rather than typing, because IPA characters are not on a QWERTY keyboard.
 *
 * The same component serves both builders, so the layout only has to be
 * maintained in one place when the inventory changes in Assessment 2.
 */
export default function PhonemeKeyboard({
  onSelect,
  statuses = {},
  disabled = false,
  legend = 'Phoneme keyboard',
  description,
}) {
  return (
    <div className={styles.keyboard}>
      <div className={styles.head}>
        <p className="field-label">{legend}</p>
        {description ? <p className="field-help">{description}</p> : null}
      </div>

      <div className={styles.rows} role="group" aria-label={legend}>
        {KEYBOARD_ROWS.map((row, index) => {
          const groupName = KEYBOARD_ROW_LABELS[index] ?? '';
          return (
            <div key={index} className={styles.row}>
              <span className={styles.rowLabel} aria-hidden="true">
                {groupName}
              </span>
              <div className={styles.keys}>
                {row.map((symbol) => (
                  <PhonemeTile
                    key={symbol}
                    as="button"
                    size="sm"
                    symbol={symbol}
                    state={statuses[symbol]}
                    disabled={disabled}
                    onClick={() => onSelect?.(symbol)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
