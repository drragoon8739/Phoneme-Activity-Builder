import styles from './StatTile.module.css';

/**
 * One headline figure.
 *
 * A single number is better served by a tile than a chart: there is no
 * comparison to make, so a chart would be decoration. The optional `breakdown`
 * is for the one comparison that does belong next to the number — Wordle
 * against Word Search, say — rendered as text rather than a second chart.
 *
 * `tone` colours the value for status figures only. Everything else stays in
 * ink, so that colour on this page always means the same thing.
 */
export default function StatTile({
  label,
  value,
  unit,
  hint,
  tone = 'neutral',
  breakdown,
  icon,
}) {
  // A stable hook for the end-to-end tests. Matching on the visible label
  // would couple the tests to wording that is expected to change; this does
  // not, and it costs one attribute.
  const testId = `stat-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className={`${styles.tile} ${styles[tone]}`} data-testid={testId}>
      <p className={styles.label}>
        {icon ? (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {label}
      </p>

      <p className={styles.value}>
        {value}
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </p>

      {breakdown?.length ? (
        <ul className={styles.breakdown}>
          {breakdown.map((item) => (
            <li key={item.label}>
              <span className={styles.breakdownLabel}>{item.label}</span>
              <span className={styles.breakdownValue}>{item.value}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
