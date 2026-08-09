/**
 * Display preferences, persisted in cookies.
 *
 * Cookies (rather than localStorage) are used deliberately: the root layout is
 * a server component, so it can read the cookie during rendering and put the
 * correct theme on <html> in the first HTML response. That removes the
 * flash of the wrong theme that localStorage-based switchers suffer from —
 * which matters for a tool used by people who are sensitive to bright screens.
 */

export const PREFERENCES = {
  theme: {
    cookie: 'pab_theme',
    attribute: 'data-theme',
    fallback: 'light',
    options: [
      { value: 'light', label: 'Light', help: 'Dark text on a pale background.' },
      { value: 'dark', label: 'Dark', help: 'Lower glare for dim rooms.' },
    ],
  },
  density: {
    cookie: 'pab_density',
    attribute: 'data-density',
    fallback: 'comfortable',
    options: [
      {
        value: 'comfortable',
        label: 'Comfortable',
        help: 'Generous spacing. Best for touchscreens.',
      },
      {
        value: 'compact',
        label: 'Compact',
        help: 'More on screen at once. Best for laptops and projectors.',
      },
    ],
  },
  text: {
    cookie: 'pab_text',
    attribute: 'data-text',
    fallback: 'standard',
    options: [
      { value: 'standard', label: 'Standard', help: 'Default type size.' },
      {
        value: 'large',
        label: 'Large print',
        help: 'Larger type and larger phoneme tiles.',
      },
    ],
  },
};

export const PREFERENCE_KEYS = Object.keys(PREFERENCES);

/** One year, in seconds. */
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Guard against a hand-edited or stale cookie value. */
export function coercePreference(key, value) {
  const spec = PREFERENCES[key];
  if (!spec) return null;
  const allowed = spec.options.some((option) => option.value === value);
  return allowed ? value : spec.fallback;
}

/** Read every preference out of a plain { name: value } cookie object. */
export function readPreferences(cookieValues = {}) {
  return Object.fromEntries(
    PREFERENCE_KEYS.map((key) => [
      key,
      coercePreference(key, cookieValues[PREFERENCES[key].cookie]),
    ]),
  );
}

/** Browser-side write. Called from the Settings page. */
export function writePreferenceCookie(key, value) {
  if (typeof document === 'undefined') return;
  const spec = PREFERENCES[key];
  if (!spec) return;
  document.cookie = `${spec.cookie}=${encodeURIComponent(
    value,
  )}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Apply a preference to <html> immediately, without a reload. */
export function applyPreference(key, value) {
  if (typeof document === 'undefined') return;
  const spec = PREFERENCES[key];
  if (!spec) return;
  document.documentElement.setAttribute(spec.attribute, value);
}
