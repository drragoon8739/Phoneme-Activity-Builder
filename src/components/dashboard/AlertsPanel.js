import Link from 'next/link';

import styles from './AlertsPanel.module.css';

/**
 * Conditions that need a teacher's attention.
 *
 * Each alert is derived from the current state of the database, not from a log
 * of past events, so fixing the underlying problem clears the alert — there is
 * nothing to dismiss and nothing that can linger after it stops being true.
 *
 * Severity is carried by a word and an icon as well as a colour, so the panel
 * is readable in greyscale and to a screen reader.
 */

const LEVELS = {
  error: { label: 'Problem', icon: '✕' },
  warning: { label: 'Warning', icon: '!' },
  info: { label: 'Note', icon: 'i' },
};

export default function AlertsPanel({ alerts }) {
  if (!alerts.length) {
    return (
      <section className={`${styles.panel} ${styles.clear}`} aria-labelledby="alerts-heading">
        <h2 className={styles.heading} id="alerts-heading">
          Alerts
        </h2>
        <p className={styles.allClear}>
          <span className={styles.clearIcon} aria-hidden="true">
            ✓
          </span>
          Nothing needs attention. No empty word lists, no broken activity
          settings, and no failed generations in the last 24 hours.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="alerts-heading">
      <h2 className={styles.heading} id="alerts-heading">
        Alerts <span className={styles.count}>{alerts.length}</span>
      </h2>

      <ul className={styles.list}>
        {alerts.map((alert, index) => {
          const level = LEVELS[alert.level] ?? LEVELS.info;
          return (
            <li key={`${alert.code}-${index}`} className={`${styles.item} ${styles[alert.level]}`}>
              <span className={styles.badge}>
                <span className={styles.badgeIcon} aria-hidden="true">
                  {level.icon}
                </span>
                {level.label}
              </span>

              <div className={styles.body}>
                <p className={styles.title}>{alert.title}</p>
                <p className={styles.detail}>{alert.detail}</p>
              </div>

              {alert.href ? (
                <Link href={alert.href} className={styles.action}>
                  {alert.action} <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
