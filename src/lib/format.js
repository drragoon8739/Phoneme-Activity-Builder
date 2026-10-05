/**
 * Display formatting shared by the dashboard.
 *
 * Every function here distinguishes "no data" from "zero". A dashboard that
 * prints 0 s for a statistic it has never recorded is making a claim it cannot
 * support, and the reader has no way to tell the difference.
 */

export const NO_DATA = '—';

/** Milliseconds as a short human duration: "4.2 s", "1 m 12 s", "830 ms". */
export function formatDuration(ms) {
  if (ms === null || ms === undefined || Number.isNaN(Number(ms))) return NO_DATA;

  const value = Number(ms);
  if (value < 1000) return `${Math.round(value)} ms`;

  const seconds = value / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  if (minutes < 60) return remainder ? `${minutes} m ${remainder} s` : `${minutes} m`;

  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} m`;
}

/** A count, with thousands separators. */
export function formatCount(value) {
  if (value === null || value === undefined) return NO_DATA;
  return new Intl.NumberFormat('en-AU').format(value);
}

/** A percentage that stays null-safe: null renders as "—", not "0%". */
export function formatPercent(value) {
  if (value === null || value === undefined) return NO_DATA;
  return `${value}%`;
}

/** "5 Oct, 2:14 pm" — short, unambiguous, no year unless it differs. */
export function formatDateTime(value) {
  if (!value) return NO_DATA;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NO_DATA;

  const sameYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/** "5 Oct" — for chart axes, where space is tight. */
export function formatDayLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(date);
}

/** "3 minutes ago", "just now" — relative time for the event log. */
export function formatRelative(value) {
  if (!value) return NO_DATA;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NO_DATA;

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return 'just now';

  const units = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
    ['week', 604800],
  ];

  let label = 'week';
  let size = 604800;
  for (const [unit, unitSeconds] of units) {
    if (seconds < unitSeconds * 60 || unit === 'week') {
      label = unit;
      size = unitSeconds;
      break;
    }
  }

  const amount = Math.max(1, Math.round(seconds / size));
  return `${amount} ${label}${amount === 1 ? '' : 's'} ago`;
}
