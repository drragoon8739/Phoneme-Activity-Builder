'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Measures how long each page is actually read, and reports it once.
 *
 * Mounted in the root layout, so it covers every route without each page
 * having to opt in.
 *
 * What it measures is *visible* time, not wall-clock time. A tab left open in
 * the background for an hour is not an hour of a teacher reading the
 * dashboard, and counting it would make the average meaningless — the
 * statistic exists to show engagement, so time the page was not on screen is
 * excluded.
 *
 * Privacy: the session id is random, generated in the browser, kept in
 * sessionStorage (so it dies with the tab) and never linked to a person. It
 * exists only to tell one visitor's several page views apart from several
 * visitors' one.
 */

const SESSION_KEY = 'pab_session_id';

/**
 * Views shorter than this are discarded. Two reasons, and the second is the
 * load-bearing one: React's StrictMode mounts, unmounts and remounts every
 * component in development, which would otherwise record a phantom
 * near-zero-length view on every page load and drag the average towards zero.
 */
const MIN_DURATION_MS = 1000;

function getSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    // Private browsing can refuse sessionStorage entirely. A per-load id still
    // groups the views from this page load, which is better than dropping the
    // measurement, and nothing downstream requires it to persist.
    return `ephemeral-${Math.random().toString(36).slice(2)}`;
  }
}

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return undefined;

    const startedAt = new Date();
    let visibleMs = 0;
    let lastResumeAt = document.visibilityState === 'visible' ? Date.now() : null;
    let sent = false;

    const accumulate = () => {
      if (lastResumeAt !== null) {
        visibleMs += Date.now() - lastResumeAt;
        lastResumeAt = null;
      }
    };

    const send = () => {
      if (sent) return;
      accumulate();
      if (visibleMs < MIN_DURATION_MS) return;
      sent = true;

      const payload = JSON.stringify({
        path: pathname,
        sessionId: getSessionId(),
        durationMs: visibleMs,
        startedAt: startedAt.toISOString(),
      });

      try {
        // sendBeacon is the only transport the browser guarantees to finish
        // after the page starts unloading; a normal fetch is cancelled.
        const blob = new Blob([payload], { type: 'application/json' });
        if (!navigator.sendBeacon?.('/api/metrics/page-view', blob)) {
          throw new Error('beacon refused');
        }
      } catch {
        // keepalive lets this outlive the page too, and covers browsers where
        // sendBeacon is unavailable or has refused the payload.
        fetch('/api/metrics/page-view', {
          method: 'POST',
          body: payload,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => {});
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        accumulate();
      } else if (lastResumeAt === null) {
        lastResumeAt = Date.now();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    // pagehide rather than beforeunload: it fires on mobile Safari's
    // back-forward cache, where beforeunload does not.
    window.addEventListener('pagehide', send);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', send);
      // Navigating to another route unmounts this effect, which is the end of
      // the visit as far as the reader is concerned.
      send();
    };
  }, [pathname]);

  return null;
}
