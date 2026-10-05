'use client';

import { useCallback, useEffect, useState } from 'react';

import styles from './HealthPill.module.css';

/**
 * Live health indicator.
 *
 * Polls the same /health endpoint that Docker's HEALTHCHECK probes, so what a
 * teacher sees on the dashboard and what the container reports are the same
 * judgement rather than two separate opinions.
 *
 * It is deliberately a *live* check rather than a value rendered once with the
 * page: a health indicator that cannot change is decoration. If the database
 * goes away while the dashboard is open, this is what turns red.
 */

const POLL_MS = 15000;

const STATES = {
  checking: { label: 'Checking…', tone: 'pending', detail: 'Contacting the server' },
  ok: { label: 'Healthy', tone: 'ok', detail: 'Database connected' },
  degraded: {
    label: 'Degraded',
    tone: 'bad',
    detail: 'The server answered, but the database did not',
  },
  unreachable: {
    label: 'Unreachable',
    tone: 'bad',
    detail: 'No response from the server',
  },
};

/**
 * Asks the server how it is, and returns the answer.
 *
 * Deliberately separate from the component and free of any state updates: the
 * probe is just a network call, and keeping it that way means the effect below
 * has no synchronous side effects to reason about.
 */
async function probe() {
  try {
    const response = await fetch('/health', { cache: 'no-store' });
    const body = await response.json().catch(() => null);

    if (response.ok && body?.status === 'ok') {
      return {
        state: 'ok',
        detail:
          body.responseMs !== undefined ? `responded in ${body.responseMs} ms` : null,
      };
    }
    return {
      state: 'degraded',
      detail: body?.database ? `database ${body.database}` : null,
    };
  } catch {
    return { state: 'unreachable', detail: null };
  }
}

export default function HealthPill() {
  const [reading, setReading] = useState({ state: 'checking', detail: null, at: null });

  const check = useCallback(async (isCancelled = () => false) => {
    const result = await probe();
    // The component can unmount between the request and its reply; writing
    // state afterwards would be a leak and a React warning.
    if (isCancelled()) return;
    setReading({ ...result, at: new Date() });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    // Both the first reading and every later one are scheduled rather than
    // called inline. A health check is a network result, not part of
    // rendering, so nothing in this effect's body touches state directly.
    const first = setTimeout(() => check(isCancelled), 0);
    const timer = setInterval(() => check(isCancelled), POLL_MS);

    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [check]);

  const { state, detail, at: checkedAt } = reading;
  const meta = STATES[state];

  return (
    <div className={`${styles.pill} ${styles[meta.tone]}`}>
      {/* role="status" announces a change to a screen reader without stealing
          focus — the point is to notice a failure, not to be interrupted. */}
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.body} role="status">
        <span className={styles.label}>{meta.label}</span>
        <span className={styles.detail}>
          {detail ?? meta.detail}
          {checkedAt
            ? ` · checked ${checkedAt.toLocaleTimeString('en-AU', {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
              })}`
            : ''}
        </span>
      </span>
      <button type="button" className={styles.recheck} onClick={() => check()}>
        Re-check
      </button>
    </div>
  );
}
