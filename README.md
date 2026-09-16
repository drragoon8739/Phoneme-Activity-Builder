# Phoneme Activity Builder

A web application that lets teachers of Speech Pathology students build
**phoneme-based Wordle and Word Search activities** from word lists they manage
themselves, and export each one as a single self-contained `.html` file that
runs offline in any browser.

- **Assessment 1** built the frontend: the interface, the phoneme keyboard, and
  HTML export driven by a hard-coded word list.
- **Assessment 2** (this stage) adds the backend: a SQLite database accessed
  through Prisma, a REST API with full CRUD and validation, server-side
  activity generation, and Docker.

---

## Quick start

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
npx prisma generate           # build the database client from the schema
npx prisma migrate dev        # create the database and its tables
npm run db:seed               # load 43 phonemes and 90 words
npm run dev                   # http://localhost:3000
```

A successful seed reports:

```
Seed complete: { phonemes: 43, wordLists: 1, words: 90, phonemeLinks: 360, activities: 2 }
```

### With Docker

```bash
docker compose up --build
```

The container applies migrations and seeds on start, so no setup is needed
first. `docker ps` shows `healthy` once the built-in healthcheck has confirmed
the database is reachable.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create or apply a migration |
| `npm run db:seed` | Seed reference data (safe to re-run) |
| `npm run db:studio` | Browse the database in a GUI |
| `npm run db:reset` | Drop, recreate and re-seed |

---

## The central design problem

**A phoneme is not a character.** Symbols such as /tʃ/, /ɐː/ and /əʉ/ occupy two
or three characters each, so a word can never be stored as a string that is
split per character. Everything in the schema follows from that:

- Phonemes live in their own table, keyed by the whole IPA symbol. Character
  length is irrelevant because a symbol is never split.
- A word is an **ordered sequence** of phonemes: rows in the `WordPhoneme` join
  table, each with an explicit `position`. One row is one phoneme.
- Phoneme use becomes queryable. "Every word containing /ʃ/" is a join, not a
  substring search.

That last point is not theoretical. Searching for words containing /t/ by
joining on the phoneme row correctly **excludes** *chin*, because /tʃ/ is a
single row. A naive substring search over a stored string would wrongly match
it, since the characters `t` and `ʃ` sit adjacent inside /tʃ/. The join table
makes that class of error impossible.

The API enforces the same rule: a word is submitted as an **array** of symbols,
never a single string. `"tʃɪn"` is ambiguous — it could be /tʃ/ /ɪ/ /n/ or /t/
/ʃ/ /ɪ/ /n/ — so the interface removes the ambiguity at the point of entry by
having teachers build words on the phoneme keyboard.

---

## Database schema

| Model | Holds |
| --- | --- |
| `Phoneme` | The HCE inventory: IPA symbol, English label, example word, keyboard group. Reference data, seeded once. |
| `WordList` | A named collection of words. |
| `Word` | English spelling, optional hint and teacher notes; belongs to a list. |
| `WordPhoneme` | One phoneme at one position in one word — the ordered join. |
| `Activity` | A saved configuration: type, difficulty, and the settings for a Wordle or a Word Search. |
| `Generation` | Metadata for each generated file, including which word a random Wordle used. |

Key constraints:

- `Word @@unique([wordListId, english])` — the same spelling may appear in
  different lists, but not twice in one.
- `WordPhoneme @@unique([wordId, position])` — a word cannot have two phonemes
  at the same position.
- `Phoneme` deletion is `Restrict`: a phoneme still used by a word cannot be
  removed, so an activity can never reference a sound that no longer exists.
- `Word` deletion cascades to its phoneme rows, but an `Activity` using it as a
  fixed target has that reference set to null — the teacher loses one word, not
  a whole configuration.

SQLite via Prisma has no native enum type, so constrained fields such as
`type` and `difficulty` are stored as strings and validated with Zod at the API
boundary. Allowed values are documented on each field in `schema.prisma`.

---

## API

Every endpoint returns the same envelope: `{ ok: true, data }` on success,
`{ ok: false, error: { message, code, fields? } }` on failure.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Healthcheck — runs a real query; 200 when the database answers, 503 when it does not |
| GET | `/api/phonemes` | The seeded inventory (read-only by design) |
| GET, POST | `/api/word-lists` | List and create word lists |
| GET, PATCH, DELETE | `/api/word-lists/:id` | One list; delete needs `?force=true` when non-empty |
| GET, POST | `/api/words` | Filter by `?wordListId=`, `?length=`, `?contains=` |
| GET, PATCH, DELETE | `/api/words/:id` | One word |
| GET, POST | `/api/activities` | List and create saved configurations |
| GET, PATCH, DELETE | `/api/activities/:id` | One configuration |
| POST | `/api/activities/:id/generate` | Builds the `.html` file from stored data and returns it as a download |

### Validation and error handling

Validation runs at the API boundary rather than only in the UI, because the UI
is not the only possible caller. Every write endpoint parses its body with Zod
before touching the database.

Prisma error codes are translated into messages a teacher can act on: a `P2002`
unique-constraint breach becomes "That word is already in this list" with a 409
status, rather than a generic 500. Unknown phoneme symbols are reported
together and named individually, so a pasted transcription with two typos shows
both at once.

Cross-field rules are checked at save time rather than generation time. A
Wordle set to a fixed word with no target selected is rejected while the
teacher is still looking at the form, instead of failing later with a confusing
error.

---

## Activity generation

Generation runs on the server, because the word list lives in the database.
A configuration set to **random selection** draws a different word from its list
each time it is generated — one saved activity, many handouts. Each call is
logged to the `Generation` table, so a teacher can check afterwards which word a
particular file used.

The exported file itself is unchanged from Assessment 1: one HTML file, no
external requests, no fonts to download, playable offline on a locked-down
school machine.

---

## Docker

A three-stage build: dependencies, build, runtime. The final image carries only
the compiled application, the Prisma client and the migration files — no source,
no dev dependencies, no build toolchain.

- Next.js `output: 'standalone'` traces the exact files the server needs, so the
  runtime stage starts from a small bundle rather than the whole project.
- The full `node_modules` tree is then copied over it. Standalone tracing covers
  what the *server* imports, which does not include the Prisma CLI — and the CLI
  is needed at runtime, because the entrypoint migrates a volume the image knows
  nothing about. Copying selected subfolders instead fails on whichever
  transitive dependency was missed, so the whole tree is taken: a larger image in
  exchange for a migration step that actually works.
- The container runs as a non-root user.
- The SQLite file lives on a named volume at `/app/data`, so data survives
  `docker compose down` and image rebuilds.
- `docker-entrypoint.sh` applies migrations and seeds on every start. Both
  commands are safe to re-run, which handles a fresh volume and an existing one
  with the same code path.
- `HEALTHCHECK` probes `/health` — the same endpoint a human would — so an
  unreachable database marks the container unhealthy rather than leaving it
  "running" while every request fails.

---

## Project structure

```
prisma/
├── schema.prisma          the data model
├── migrations/            generated SQL — required by Docker
└── seed.js                loads the inventory and corpus from src/data
src/
├── app/
│   ├── health/route.js    healthcheck
│   ├── api/               REST endpoints
│   ├── manage/            word list and word CRUD
│   ├── activities/        saved configurations and generation
│   ├── wordle/            Wordle builder
│   └── word-search/       Word Search builder
├── components/            UI, built around one reusable PhonemeTile
├── data/                  seed source: phoneme inventory and HCE corpus
└── lib/
    ├── db.js              Prisma client singleton
    ├── repository.js      the seam between database rows and the app's shapes
    ├── validation.js      Zod schemas
    ├── apiResponse.js     response envelope and error translation
    ├── apiClient.js       browser-side fetch wrapper
    └── export/            standalone HTML templates
```

`src/data/` remains the canonical source of the linguistic data, but it is now
the **seed** rather than a runtime path: the application reads from the database.
The seed parses those files directly so there is only ever one copy of the
corpus.

---

## Accessibility

Carried forward from Assessment 1 and applied to the new pages:

- Skip link; every interactive target at least 44×44 px; visible focus outlines
- Phoneme hints available on keyboard focus, not hover alone
- Semantic `fieldset`/`legend` grouping, real `label` elements, `aria-current`
  on the active nav item, `aria-expanded` on menu triggers
- Status changes announced through `role="status"` live regions, including API
  errors
- `prefers-reduced-motion` respected; large-print and compact-density options

---

## Data

43 phonemes and 90 words in broad HCE (Australian English) transcription, from
the subject's *HCE Wordle Phoneme Corpus*. The corpus mixes U+0261 (`ɡ`) with
ASCII `g`, and `r` with `ɹ`; the seed folds those aliases so a look-alike
character cannot silently create a duplicate phoneme.

---

## References

Meta Platforms. (n.d.). *Passing props to a component*. React. https://react.dev/learn/passing-props-to-a-component

Moore, B. (n.d.). *Introduction to Australian English*. Oxford English Dictionary. https://www.oed.com/discover/introduction-to-australian-english

Nielsen, J. (1994). *10 usability heuristics for user interface design*. Nielsen Norman Group. https://www.nngroup.com/articles/ten-usability-heuristics/

NSW Department of Education. (2026). *Phonics*. https://education.nsw.gov.au/teaching-and-learning/curriculum/literacy-and-numeracy/teaching-and-learning-resources/literacy/effective-reading-in-the-early-years-of-school/phonics

Vercel. (n.d.). *Server and Client Components*. Next.js. https://nextjs.org/docs/app/getting-started/server-and-client-components

World Wide Web Consortium. (2024). *Web content accessibility guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/
