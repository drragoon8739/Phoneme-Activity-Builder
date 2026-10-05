'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import styles from './WindowPicker.module.css';

/**
 * Chooses the reporting window.
 *
 * The selection lives in the URL rather than in component state, so a
 * particular view can be linked to, bookmarked, reloaded, or pasted into a
 * message — which is what someone looking at an anomaly actually wants to do
 * with it.
 *
 * `useTransition` keeps the current figures on screen while the server
 * re-renders, instead of blanking the page between windows.
 */
export default function WindowPicker({ options, current }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function choose(days) {
    const next = new URLSearchParams(searchParams);
    next.set('days', String(days));
    startTransition(() => {
      router.push(`${pathname}?${next}`, { scroll: false });
    });
  }

  return (
    <div className={styles.picker} role="group" aria-label="Reporting window">
      <span className={styles.caption} aria-hidden="true">
        Window
      </span>
      {options.map((days) => (
        <button
          key={days}
          type="button"
          className={`${styles.option} ${days === current ? styles.active : ''}`}
          aria-pressed={days === current}
          onClick={() => choose(days)}
          disabled={pending}
        >
          {days} days
        </button>
      ))}
      <span className="sr-only" role="status">
        {pending ? 'Updating figures' : `Showing the last ${current} days`}
      </span>
    </div>
  );
}
