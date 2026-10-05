# Accessibility

What was checked on the Assessment 3 dashboard, what it found, and what changed
as a result.

---

## Running the audit yourself

Audit the production build, not the dev server. `next dev` ships unminified
bundles and development-only warnings, which depress the performance score and
occasionally add console entries that are not in the real build.

```bash
npm run build
npm start

npx lighthouse http://localhost:3000/dashboard \
  --only-categories=accessibility --view
```

Worth auditing all three of the pages that changed:

| Page | Why |
| --- | --- |
| `/dashboard` | New: charts, tables, status colours, live region |
| `/manage` | Forms, the phoneme keyboard, a data table |
| `/activities` | Forms, cards, confirmation dialogs |

Chrome DevTools → Lighthouse gives the same result through a UI if you would
rather not use the CLI.

---

## What was found, and what changed

### 1. Colour contrast below 4.5:1 — fixed

The status tints used behind the "Generated" and "Failed" tags, and the white
count badge on the alerts heading, were below the WCAG AA threshold for text.

Measured before and after, as contrast ratios:

| Pair | Before | After |
| --- | --- | --- |
| Failure text on its tint (light) | 4.30 | **4.64** |
| Success text on its tint (light) | 4.19 | **4.63** |
| Failure text on its tint (dark) | 4.18 | **5.15** |
| Alert count badge (dark) | 3.60 | **5.08** |

The badge fix is the interesting one. It was hard-coded `#fff` on the failure
colour, which is fine against the dark red used in light mode but fails against
the lighter orange used in dark mode. The fix was to make the text colour a
token (`--stat-failure-ink`) that changes with the theme, rather than assuming
white works on both.

Everything else was already above the threshold; the full set of measured pairs
is in the project's commit history.

### 2. Green/red for success and failure — changed before it shipped

The conventional pair for "worked" and "didn't" is green and red, and it is one
of the worst choices available for colourblind readers: red–green deficiency is
by far the most common form.

Measured as colour-difference under simulated deuteranopia, where 8 is the
usable floor:

| Pair | Separation under deuteranopia |
| --- | --- |
| Green `#2e7d53` + red `#b3261e` | 6.6 — below the floor |
| Green `#2e7d53` + orange-red `#c2410c` | **9.3** — clear |

Success keeps the familiar green so the convention still reads. Failure moved
to orange-red, which separates reliably while still looking like a warning. The
dark theme's pair was chosen separately against the dark surface rather than
lightened from the light one, and separates by 11.0.

### 3. Outcome never carried by colour alone

Even with a safe palette, colour is not the only cue anywhere on the dashboard:

- Status tags read **Generated** or **Failed** in words, with a ✓ or ✕ glyph.
- Alert severity reads **Problem**, **Warning** or **Note**, each with an icon.
- The health indicator reads **Healthy**, **Degraded** or **Unreachable**; the
  coloured dot is secondary.
- The trend chart has a legend, a tooltip that names each series, and a **Show
  as table** toggle holding the same numbers.

### 4. The chart is not keyboard-navigable — by choice

Each of the fourteen bands could have been a tab stop. That would put fourteen
stops between a keyboard user and the next control, for information they can
reach in one press of **Show as table** — which holds every number the chart
encodes, as a real `<table>` with proper headers and a caption.

The table is the keyboard and screen-reader path, and the dead `tabIndex={-1}`
and `onFocus` handler that implied otherwise were removed, since a focus
handler on an element that cannot receive focus is misleading to the next
person reading the code.

### 5. Structure checks that passed

- **Heading order**: `h1` → `h2` → `h3`, no levels skipped.
- **Form labels**: every input has a real `<label>`; the window picker is a
  `role="group"` with an `aria-label` and `aria-pressed` on each option.
- **Tables**: every one has a caption (visually hidden) and `<th scope>` on
  both column and row headers.
- **Live regions**: `role="status"` on the health indicator and the dashboard's
  status messages, so a change is announced without stealing focus.
- **Targets**: every interactive control is at least 44×44 px.
- **Motion**: `prefers-reduced-motion` is respected.
- **Landmarks and skip link**: carried over from Assessment 1 and unchanged.

---

## How this influenced the final design

The palette was chosen *last and by measurement*, not first and by taste. The
intended design used green and red for success and failure, which looked right
and would have failed a meaningful fraction of readers; running the numbers
before writing the CSS changed the colour. The same check then caught four text
pairs that looked fine on screen and were not.

The second effect was on the chart. Rather than bolting keyboard navigation
onto an SVG — which would have been a lot of code for a worse experience than
the alternative — the table view was built as a first-class way to read the
same data, and it is now what the end-to-end tests assert against as well.

---

## Known limits

- The audit covers the three pages changed in this assessment. The generated
  `.html` activities are separate standalone files and were last reviewed in
  Assessment 1.
- Lighthouse's automated checks catch roughly a third of WCAG criteria. They
  cannot tell whether the *wording* of an alert is understandable, or whether
  the reading order makes sense — those were reviewed by hand.
