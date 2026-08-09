/**
 * Everything the exported activities share.
 *
 * The export target is one self-contained .html file: no build step, no
 * network requests, no fonts to download. A teacher can email it, put it on a
 * USB stick, or drop it into an LMS, and it will open on a locked-down school
 * machine. That constraint is why the styling below is duplicated here rather
 * than imported from the app's CSS.
 */

import { STUDENT } from '@/data/student';
import { PHONEMES, KEYBOARD_ROWS, KEYBOARD_ROW_LABELS } from '@/data/phonemes';

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Safe to drop inside a <script> tag. */
export function toJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** Phoneme reference data, trimmed to what the exported page actually needs. */
export function phonemeReference() {
  return PHONEMES.map(({ ipa, label, example }) => ({ ipa, label, example }));
}

export { KEYBOARD_ROWS, KEYBOARD_ROW_LABELS };

export function baseStyles(theme = 'light') {
  const dark = theme === 'dark';
  return `
    :root {
      --font-display: ui-monospace, "Cascadia Mono", "Segoe UI Mono", "SF Mono", "Roboto Mono", Menlo, Consolas, monospace;
      --font-body: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --font-ipa: "Charis SIL", "Doulos SIL", "Gentium Plus", "Noto Sans", "Segoe UI", system-ui, sans-serif;
      --paper: ${dark ? '#0d1418' : '#eaeff1'};
      --card: ${dark ? '#16222a' : '#ffffff'};
      --sunk: ${dark ? '#101a21' : '#f3f6f8'};
      --ink: ${dark ? '#e8eff2' : '#14212a'};
      --muted: ${dark ? '#9db1bb' : '#566873'};
      --line: ${dark ? '#2a3a44' : '#c8d5db'};
      --line-strong: ${dark ? '#3d515d' : '#a9bbc4'};
      --brand: ${dark ? '#e79ec0' : '#7a2e56'};
      --brand-ink: ${dark ? '#23101a' : '#ffffff'};
      --brand-soft: ${dark ? '#33202b' : '#f4e5ed'};
      --correct: ${dark ? '#58bb87' : '#2e7d53'};
      --correct-soft: ${dark ? '#1d3a2b' : '#d9eee2'};
      --present: ${dark ? '#d9ab43' : '#9c6b06'};
      --present-soft: ${dark ? '#3a2f15' : '#faecca'};
      --absent: ${dark ? '#7d919b' : '#6d818c'};
      --absent-soft: ${dark ? '#24313a' : '#e2e9ec'};
      --radius: 10px;
      color-scheme: ${dark ? 'dark' : 'light'};
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 24px 16px 48px;
      background: var(--paper);
      color: var(--ink);
      font-family: var(--font-body);
      line-height: 1.6;
      min-height: 100vh;
    }

    .wrap { width: min(960px, 100%); margin: 0 auto; }

    header.page-head { margin-bottom: 24px; }

    .eyebrow {
      font-family: var(--font-display);
      font-size: 0.8125rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 0 0 4px;
    }

    h1 {
      font-family: var(--font-display);
      font-size: clamp(1.6rem, 4vw, 2.25rem);
      letter-spacing: -0.02em;
      margin: 0 0 8px;
    }

    .sub { color: var(--muted); margin: 0; }

    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .btn {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1rem;
      min-height: 44px;
      padding: 10px 20px;
      border-radius: var(--radius);
      border: 1px solid transparent;
      background: var(--brand);
      color: var(--brand-ink);
      cursor: pointer;
    }

    .btn:hover { filter: brightness(1.08); }

    .btn.secondary {
      background: transparent;
      color: var(--ink);
      border-color: var(--line-strong);
    }

    .btn-row { display: flex; flex-wrap: wrap; gap: 12px; }

    :focus-visible { outline: 3px solid var(--brand); outline-offset: 2px; }

    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }

    /* The phoneme tile, carried over from the builder so the activity and the
       tool a teacher previewed it in look like the same product. */
    .tile {
      position: relative;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-width: 3.25rem;
      min-height: 3.25rem;
      padding: 4px 6px;
      background: var(--sunk);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius);
      color: var(--ink);
      line-height: 1;
      font: inherit;
    }

    .tile .glyph { font-family: var(--font-ipa); font-size: 1.3rem; font-weight: 600; }
    .tile .gloss {
      font-family: var(--font-display);
      font-size: 0.625rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    button.tile { cursor: pointer; }
    button.tile:hover { border-color: var(--brand); background: var(--brand-soft); }
    button.tile:disabled { opacity: 0.45; cursor: not-allowed; }

    .tile.correct { background: var(--correct-soft); border-color: var(--correct); box-shadow: inset 0 0 0 2px var(--correct); }
    .tile.present { background: var(--present-soft); border-color: var(--present); box-shadow: inset 0 0 0 2px var(--present); }
    .tile.absent  { background: var(--absent-soft); border-color: var(--absent); color: var(--muted); }

    .hint {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      white-space: nowrap;
      padding: 5px 9px;
      border-radius: 6px;
      background: var(--ink);
      color: var(--paper);
      font-size: 0.8125rem;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 150ms ease;
    }

    .hint b { font-family: var(--font-ipa); color: var(--brand); margin-right: 6px; }

    .hint::after {
      content: '';
      position: absolute; top: 100%; left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: var(--ink);
    }

    .tile:hover > .hint, .tile:focus-visible > .hint { opacity: 1; visibility: visible; }

    .status {
      border-left: 4px solid var(--brand);
      background: var(--brand-soft);
      padding: 12px 16px;
      border-radius: 0 var(--radius) var(--radius) 0;
      margin-bottom: 16px;
    }

    .status.win { border-left-color: var(--correct); background: var(--correct-soft); }
    .status.lose { border-left-color: var(--present); background: var(--present-soft); }

    footer.page-foot {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 0.8125rem;
    }

    @media (prefers-reduced-motion: reduce) {
      * { transition-duration: 0.001ms !important; animation-duration: 0.001ms !important; }
    }
  `;
}

/** Assembles the finished single-file document. */
export function documentShell({ title, styles, body, script, theme = 'light' }) {
  return `<!DOCTYPE html>
<html lang="en-AU" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="generator" content="Phoneme Activity Builder">
<meta name="author" content="${escapeHtml(STUDENT.name)}">
<style>
${baseStyles(theme)}
${styles ?? ''}
</style>
</head>
<body>
<div class="wrap">
${body}
<footer class="page-foot">
  <p>Generated with the Phoneme Activity Builder — ${escapeHtml(STUDENT.name)} · ${escapeHtml(
    STUDENT.studentNumber,
  )}</p>
  <p>Runs offline in any modern browser. No internet connection required.</p>
</footer>
</div>
<script>
${script}
</script>
</body>
</html>
`;
}
