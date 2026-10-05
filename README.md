# Phoneme Activity Builder

A web application that lets teachers of Speech Pathology students build
**phoneme-based Wordle and Word Search activities** from word lists they manage
themselves, and export each one as a single self-contained `.html` file that
runs offline in any browser.

- **Assessment 1** built the frontend: the interface, the phoneme keyboard, and
  HTML export driven by a hard-coded word list.
- **Assessment 2** added the backend: a SQLite database accessed through
  Prisma, a REST API with full CRUD and validation, server-side activity
  generation, and Docker.
- **Assessment 3** (this stage) makes it data-driven: a reporting dashboard,
  server-side instrumentation, operational statistics, alerts, and end-to-end,
  load and accessibility testing.

---

## Quick start

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
npx prisma generate           # build the database client from the schema
npx prisma migrate dev        # create the database and its tables
npm run db:seed               # load 43 phonemes and 90 words
npm run db:simulate           # write a few weeks of simulated usage history
npm run dev                   # http://localhost:3000
```

A successful seed reports:

```
Seed complete: { phonemes: 43, wordLists: 1, words: 90, phonemeLinks: 360, activities: 2 }
Simulated history written: { days: 21, pageViews: 228, generations: 50, ... }
```

`npm run setup` does the migrate, seed and simulate steps in one go.

> **Upgrading a database created before Assessment 3?** The migration adds two
> required columns to `Generation`, and SQLite cannot add a required column to a
> table that already has rows. Prisma will offer to reset — accept it. The only
> records affected are demo generations from Assessment 2, and `db:seed` plus
> `db:simulate` repopulate everything immediately. `npm run db:reset` does the
> same thing deliberately.


### About the simulated history

A freshly installed copy has no usage history, so every panel on the dashboard
would read "no data yet" and none of the reporting could be seen. `db:simulate`
writes a plausible few weeks of page views and generation attempts — including
failures — so the dashboard is meaningful from the first run.

It is deliberately separate from the real seed, separately runnable, and
reversible with `npm run db:simulate -- --clear`. The records go through the
same tables the live application writes to, with the same shapes, so if an
aggregation is wrong these rows will show it wrong too. Nothing in the
application knows they are simulated.

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
| `Generation` | Every generation attempt — successful or not — with the outcome, failure reason, duration, and which word a random Wordle used. |
| `PageView` | One visit to one page, with how long it was visible. What "average time on page" is computed from. |
| `SystemEvent` | Rejected input and other notable server-side states. |

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
- `Generation.activityId` is nullable and set to null when its activity is
  deleted, with the activity's name and type copied onto the row at generation
  time. An operational history that silently shrinks when someone tidies up is
  worse than no history, because the numbers still look right and are not.
- Statistics are computed from these records on read, never stored as running
  totals. Storing the data the statistics are derived from means a figure can
  be broken down, filtered by date and recalculated if its definition changes —
  none of which a stored average allows.

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
| GET | `/api/metrics` | Every dashboard figure as JSON (`?days=` narrows the window) |
| POST | `/api/metrics/page-view` | Receives a time-on-page beacon from the browser |

`/api/metrics` exists so the dashboard's numbers can be checked independently of
the page that displays them, which is what makes a dashboard figure verifiable
rather than merely plausible. It is also what the load tests hit.

`/api/metrics/page-view` always answers `204`, even to a payload it rejects:
the caller is `sendBeacon` during page unload, which cannot read a response or
retry, so an error status would be shouting into a void while still costing the
browser a round trip it is trying to close out.

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

## The dashboard and what it reports

`/dashboard` is the reporting surface. Every figure on it is computed from
stored records at the moment the page loads — there are no running totals.

A stored counter is one failed increment away from disagreeing with the data it
claims to describe, and a dashboard that is confidently wrong is worse than one
that is slow. At this data volume, recomputing costs a few milliseconds; the
page prints how long it took at the bottom so the claim can be checked.

| Panel | Answers |
| --- | --- |
| Health indicator | Is the app up, and can it reach its database right now? |
| Alerts | What needs a teacher's attention? |
| Headline figures | Activities saved by type, successful and failed generations, average time on page, most-used activity, library size |
| Generation activity | Attempts per day, split by outcome |
| Why generations failed | Failure counts grouped by reason |
| Generated outputs | The most recent attempts, with the file produced or the reason there wasn't one |
| Stored word lists | What the builder draws on, and which lists are empty |
| Time on page | Where readers actually spend time |
| Server event log | Input the API rejected, and other notable states |

### Three figures that are easy to get wrong

**An average over no rows is null, not zero.** "No data yet" and "zero seconds"
are different claims, and a dashboard that prints `0 s` for a statistic it has
never recorded is asserting something it cannot support. Everything null-safe
renders as an em dash instead.

**A success rate is a share of attempts, not of successes.** Assessment 2
recorded only successful generations, which made the failure rate unknowable —
and an unknown failure rate reads as a zero one. Every attempt is now recorded,
successful or not.

**"Most used" can genuinely tie.** When two activity types have the same
number of generations the dashboard says so, rather than picking a winner by
whichever row the database happened to return first.

### Which figures the window applies to

The window picker scopes the *usage* figures — generations, page views, the
trend chart. Activities saved and library size are current totals, because a
library has a size now rather than a size over the last fortnight. The section
says which is which, so no one compares two numbers measuring different periods.

---

## Instrumentation

Three things are recorded, all through tables the application writes to in the
normal course of its work.

**Generation attempts** (`Generation`) — every call to the generate endpoint,
successful or not, with the outcome, the reason for a failure, and how long it
took. Each exit path in the route goes through one of two helpers, so no
outcome can leave without being counted.

**Page views** (`PageView`) — how long each page was *visible*, sent by the
browser with `navigator.sendBeacon` during unload. A tab left open in the
background is not time a teacher spent reading, so hidden time is excluded;
counting it would make the average meaningless. Views shorter than a second are
discarded, which also filters the phantom remounts React's StrictMode produces
in development.

**Rejected input** (`SystemEvent`) — validation failures and constraint
breaches, captured in the shared error handler. Without this, a rejection
leaves no trace once the response is sent. A 404 is deliberately *not* logged:
a request for something that does not exist is ordinary traffic, not a signal,
and logging it would bury the entries that matter.

Recording never breaks the thing it records. Every instrumentation call
swallows its own errors and logs to the console instead of throwing — a teacher
losing a worksheet because a metrics write failed would be a worse outcome than
a missing row on a dashboard.

### Privacy

Page views carry a random session id generated in the browser and held in
`sessionStorage`, so it dies with the tab. It exists only to tell one visitor's
several page views apart from several visitors' one. No names, no accounts, no
IP addresses.

---

## Alerts

Alerts are derived from the current state of the database rather than from a
log of past events, so fixing the underlying problem clears the alert. There is
nothing to dismiss and nothing that can linger after it stops being true.

| Alert | Condition |
| --- | --- |
| Empty word list | A list with no words, which generation will fail on |
| Missing target word | A Wordle fixed to a word that has since been deleted |
| Recent failures | A generation failed in the last 24 hours |
| Rejected input | The API refused a request in the last 24 hours |
| No activities | Nothing saved yet — a first-run prompt, not a problem |

Severity is carried by a word and an icon as well as a colour, so the panel
reads correctly in greyscale and to a screen reader.

---

## Testing

### End-to-end — Playwright

```bash
npx playwright install chromium   # first run only
npm run test:e2e
npm run test:report               # open the HTML report
```

Twelve tests across three files, driving the real application against the real
database. There are no mocks: a mocked API would pass happily while the actual
Prisma query was wrong, which is the exact class of bug these exist to catch.
Each test creates records with a unique name and removes them afterwards, so a
run leaves the database as it found it.

| File | Covers |
| --- | --- |
| `word-list-crud.spec.js` | The builder use case: create, read, update and delete a word list and a word, plus a rejected duplicate |
| `generate-activity.spec.js` | The user use case: generate a file, open it from `file://`, and play it through to a solve |
| `dashboard.spec.js` | Health, reporting panels, figures matching the API, the chart's table view, the window picker, and that generating moves the count |

Two are worth singling out. The generation test opens the downloaded HTML from
disk rather than over http, because the whole promise of the export is that it
works on a classroom machine with no internet — loading it from the server
would test the wrong thing. And `generating is recorded, so the dashboard count
moves` asserts that one generation raises the reported total by exactly one,
which is what proves the instrumentation is wired to reality rather than merely
present.

### Load — JMeter

```bash
./tests/load/run-levels.sh            # 1, 10, 100, 1000
./tests/load/run-levels.sh 1 10 100   # just these
```

Requires JMeter on `PATH` and the app already running. Each level writes raw
samples and an HTML report under `tests/load/results/`, so the levels can be
compared — comparing one level against nothing says nothing about how the
system scales.

The plan has two thread groups. The read workload (health, dashboard, metrics,
word lists) can be hammered freely because the requests leave nothing behind.
The write workload calls the generation endpoint, and every call stores a row,
so it is scaled separately at a tenth of the read load — otherwise a single run
at high concurrency would bury weeks of real usage data under machine-made
noise and leave the dashboard useless.

Both groups use think time between requests. Without it every virtual user
behaves like a tight loop, which measures how fast the server can be flooded
rather than how it behaves under a realistic number of readers.

**On the x10000 level.** That is more concurrency than a laptop can generate
honestly: JMeter needs roughly a megabyte of heap per thread, so ten thousand
threads is about 10 GB before the application under test gets any memory at all,
and the resulting numbers would measure the load generator running out of room.
Run the levels your machine can sustain, and say where the bottleneck moved to
the test harness — that is a better answer than a graph built from a load
generator that was itself the slowest part.

### Accessibility — Lighthouse

```bash
npm run build && npm start        # audit the production build, not dev
npx lighthouse http://localhost:3000/dashboard \
  --only-categories=accessibility --view
```

Audit `/dashboard`, `/manage` and `/activities`. See
[`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) for what was found, what was
changed, and the contrast figures.

---

## Project structure

```
prisma/
├── schema.prisma          the data model
├── migrations/            generated SQL — required by Docker
├── seed.js                loads the inventory and corpus from src/data
└── simulate.js            optional simulated usage history
tests/
├── e2e/                   Playwright specs
└── load/                  JMeter plan and the level runner
src/
├── app/
│   ├── health/route.js    healthcheck
│   ├── dashboard/         reporting and observability
│   ├── api/               REST endpoints, including /api/metrics
│   ├── manage/            word list and word CRUD
│   ├── activities/        saved configurations and generation
│   ├── wordle/            Wordle builder
│   └── word-search/       Word Search builder
├── components/
│   ├── dashboard/         tiles, chart, alerts, reporting panels
│   ├── PageViewTracker.js measures visible time per route
│   └── ...                UI, built around one reusable PhonemeTile
├── data/                  seed source: phoneme inventory and HCE corpus
└── lib/
    ├── db.js              Prisma client singleton
    ├── repository.js      the seam between database rows and the app's shapes
    ├── validation.js      Zod schemas
    ├── apiResponse.js     response envelope and error translation
    ├── apiClient.js       browser-side fetch wrapper
    ├── instrumentation.js recording generations, events and page views
    ├── metrics.js         every dashboard aggregation
    ├── format.js          null-safe display formatting
    └── export/            standalone HTML templates
```

`src/data/` remains the canonical source of the linguistic data, but it is now
the **seed** rather than a runtime path: the application reads from the database.
The seed parses those files directly so there is only ever one copy of the
corpus.

---

## Accessibility

[`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) has the Lighthouse findings,
the contrast measurements, and what changed because of them. In summary:

- The success/failure palette was chosen by measurement, not convention. Green
  and red separate by only 6.6 under simulated deuteranopia, below the usable
  floor of 8; the green and orange-red actually used separate by 9.3.
- Four text pairs measured below 4.5:1 and were corrected, including an alert
  badge that was readable in light mode and not in dark.
- Outcome is never carried by colour alone: status tags, alert severities and
  the health indicator all read in words, with icons.
- The trend chart offers the same numbers as a real table, which is the
  keyboard and screen-reader path to them.

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
