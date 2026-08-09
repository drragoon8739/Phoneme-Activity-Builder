# Phoneme Activity Builder

A frontend builder that lets teachers of Speech Pathology students create
**phoneme-based Wordle and Word Search activities** and export each one as a
single, self-contained `.html` file that runs offline in any browser.

Built for Assessment 1 (Frontend Design and Usability). This stage is frontend
only — there is no database, no accounts, and no server-side storage.

---

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
```

Requires Node 18.18 or newer. Created with `npx create-next-app`.

---

## Before you submit

Open `src/data/student.js` and fill in:

| Field           | Used by                                          |
| --------------- | ------------------------------------------------ |
| `name`          | Footer, About page, footer of every exported file |
| `studentNumber` | Same as above                                     |
| `videoUrl`      | Embedded player on the About page                 |
| `repoUrl`       | Link on the About page                            |

Nothing else in the codebase hard-codes these details.

---

## Pages

| Route          | Purpose                                                                                |
| -------------- | -------------------------------------------------------------------------------------- |
| `/`            | Landing page: what the tool does, the three-step workflow, links to both builders       |
| `/about`       | Project scope, student details, walkthrough video, description of both activities        |
| `/wordle`      | Wordle builder — configure, preview by playing, export                                   |
| `/word-search` | Word Search builder — pick words, size the grid, preview, export                         |
| `/settings`    | Theme, layout density and text size, stored in cookies                                   |

Navigation is a tab bar for the three task pages plus a kebab menu for About and
Settings. Below 760px both collapse into a single hamburger menu.

---

## Project structure

```
src/
├── app/
│   ├── layout.js              root layout; reads preference cookies server-side
│   ├── globals.css            design tokens, themes, base styles
│   ├── page.js                Home
│   ├── about/                 About
│   ├── settings/              Settings
│   ├── wordle/                Wordle builder route
│   └── word-search/           Word Search builder route
├── components/
│   ├── SiteHeader.js          header, tab bar, kebab + hamburger menus
│   ├── SiteFooter.js          name and student number
│   ├── PhonemeTile.js         the one repeated UI object
│   ├── PhonemeKeyboard.js     keyboard in the subject's specified row layout
│   ├── PhonemeStrip.js        a word rendered as tiles
│   ├── WordleBuilder.js       Wordle configuration + playable preview + export
│   ├── WordSearchBuilder.js   Word Search configuration + preview + export
│   └── SettingsForm.js        preference controls
├── data/
│   ├── phonemes.js            phoneme inventory, labels, examples, keyboard layout
│   ├── corpus.js              90-word HCE corpus from the subject materials
│   └── student.js             ← your name and student number go here
└── lib/
    ├── preferences.js         cookie-backed display preferences
    ├── wordle.js              scoring and difficulty presets
    ├── wordSearch.js          seeded, pure grid generator
    ├── download.js            Blob-based file save
    └── export/
        ├── shared.js          styles and document shell for exports
        ├── wordleTemplate.js  standalone Wordle HTML
        └── wordSearchTemplate.js  standalone Word Search HTML
```

---

## Design decisions

**One repeated object.** The whole interface is built from a single phoneme
tile: IPA glyph, English label beneath, and a hint on hover *and* on focus
(`/θ/ — TH (as in thin)`). It appears in the keyboard, the Wordle board, the
word list and the exports, so a student who learns to read it once can read the
whole product.

**Colour means one thing.** Green, amber and grey are reserved for Wordle
feedback and never used decoratively. The plum brand colour marks anything the
teacher can act on. Feedback is never colour-only: the legend, the status
message and the tile's accessible name all carry the same information.

**No web fonts.** Exported activities must open on a locked-down school machine
with no internet connection, so the app commits to installed font stacks. The
IPA stack lists Charis SIL, Doulos SIL and Gentium Plus first, because generic
system fonts have patchy coverage of symbols like `ɐː`, `ʉː` and `əʉ`.

**Cookies, not localStorage, for theme.** The root layout is a server component,
so the saved theme is on `<html>` in the first byte of HTML. A localStorage
switcher would paint the wrong theme first and correct it after hydration.

**The preview is the export.** The word search generator is pure and seeded, and
the export embeds the finished grid rather than regenerating it. What the
teacher approves is exactly what the class receives.

**Trade-offs.** The in-app word search preview is not draggable — dragging is
implemented in the exported file. Rebuilding that interaction twice would have
cost more than it returned at this stage, and the grid itself is what the
teacher needs to check. Backwards words are off by default because reading a
sequence in reverse works against sound-order practice, though the option is
there for teachers who want it.

---

## Accessibility

- Skip link to main content
- Every interactive target at least 44×44 px
- Visible focus outlines on every control
- Hints available on keyboard focus, not hover alone
- Semantic `fieldset`/`legend` grouping, real `label` elements, `aria-current`
  on the active nav item, `aria-expanded` on menu triggers
- Status changes announced through `role="status"` live regions
- `prefers-reduced-motion` respected
- Large-print and compact-density options in Settings

---

## Data

The corpus holds 90 words in broad HCE (Australian English) transcription,
transcribed from the subject's *HCE Wordle Phoneme Corpus* document, across 43
phonemes arranged in the supplied keyboard layout. The corpus mixes U+0261 (`ɡ`)
with ASCII `g`; `normalisePhoneme` in `src/data/phonemes.js` folds the aliases so
a stray character cannot silently break a puzzle.

---

## Not in this stage

Database, stored word lists, rotating word selection, teacher accounts, and
audio playback. Assessment 2 introduces the word list and database.
