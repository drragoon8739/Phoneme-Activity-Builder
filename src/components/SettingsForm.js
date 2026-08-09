'use client';

import { useState } from 'react';

import {
  PREFERENCES,
  PREFERENCE_KEYS,
  applyPreference,
  writePreferenceCookie,
} from '@/lib/preferences';
import styles from './SettingsForm.module.css';

/**
 * Initial values come from the server, which has already read the cookies to
 * render the page — so the form is correct on first paint with no effect, no
 * flash, and no second copy of the truth. Changing an option updates the
 * attribute on <html> immediately and writes the cookie, so the change
 * survives a reload and applies to every other page without a refresh.
 */
export default function SettingsForm({ initial }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(false);

  function change(key, value) {
    setValues((previous) => ({ ...previous, [key]: value }));
    applyPreference(key, value);
    writePreferenceCookie(key, value);
    setSaved(true);
  }

  function reset() {
    for (const key of PREFERENCE_KEYS) change(key, PREFERENCES[key].fallback);
  }

  return (
    <div className={styles.groups}>
      {PREFERENCE_KEYS.map((key) => {
        const spec = PREFERENCES[key];
        return (
          <fieldset key={key} className={`panel ${styles.group}`}>
            <legend className={styles.legend}>{labelFor(key)}</legend>
            <p className="field-help">{descriptionFor(key)}</p>

            <div className={styles.options}>
              {spec.options.map((option) => (
                <label
                  key={option.value}
                  className={`${styles.option} ${
                    values[key] === option.value ? styles.optionOn : ''
                  }`}
                >
                  <input
                    type="radio"
                    name={key}
                    value={option.value}
                    checked={values[key] === option.value}
                    onChange={() => change(key, option.value)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <span className="field-help">{option.help}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

      <div className={styles.footer}>
        <button type="button" className="btn btn--secondary" onClick={reset}>
          Reset to defaults
        </button>
        <p className="field-help" role="status">
          {saved
            ? 'Saved. These preferences are stored in a cookie on this device and apply to every page.'
            : 'Changes save as you make them.'}
        </p>
      </div>
    </div>
  );
}

function labelFor(key) {
  return { theme: 'Theme', density: 'Layout density', text: 'Text size' }[key] ?? key;
}

function descriptionFor(key) {
  return (
    {
      theme:
        'Applied before the page renders, so switching never flashes the wrong colours.',
      density: 'Controls spacing and the size of phoneme tiles across the builder.',
      text: 'Scales every type size and tile in the interface together.',
    }[key] ?? ''
  );
}
