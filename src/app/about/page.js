import Link from 'next/link';

import { STUDENT } from '@/data/student';
import { CORPUS } from '@/data/corpus';
import { PHONEMES } from '@/data/phonemes';
import styles from './about.module.css';

export const metadata = {
  title: 'About — Phoneme Activity Builder',
  description:
    'What this project is, what Assessment 1 covers, and how to use the two builders.',
};

const IN_SCOPE = [
  'A component-based React frontend built with Next.js and the App Router.',
  'A responsive layout that works from a phone up to a projector.',
  'Two builders — Wordle and Word Search — each with a live preview.',
  'A fixed, in-memory phoneme corpus of 90 words.',
  'Export to a single self-contained .html file that runs offline.',
  'Theme and layout preferences stored in cookies.',
];

const OUT_OF_SCOPE = [
  'A database or any server-side storage.',
  'Teacher accounts, sign-in, or saved activities.',
  'Dynamic word-list management or rotating word selection.',
  'Audio playback of phonemes.',
];

export default function AboutPage() {
  return (
    <>
      <header>
        <p className="eyebrow">About</p>
        <h1>Phoneme Activity Builder</h1>
        <p className="lede">
          A tool for teachers of Speech Pathology students. It turns a phoneme
          word list into classroom activities that run in any browser, on any
          machine, without an internet connection.
        </p>
      </header>

      <section className="panel">
        <p className="eyebrow">Submission</p>
        <dl className={styles.details}>
          <div>
            <dt>Name</dt>
            <dd>{STUDENT.name}</dd>
          </div>
          <div>
            <dt>Student number</dt>
            <dd>{STUDENT.studentNumber}</dd>
          </div>
          <div>
            <dt>Subject</dt>
            <dd>{STUDENT.subject}</dd>
          </div>
          <div>
            <dt>Assessment</dt>
            <dd>{STUDENT.assessment} — Frontend only</dd>
          </div>
          {STUDENT.repoUrl ? (
            <div>
              <dt>Repository</dt>
              <dd>
                <a href={STUDENT.repoUrl}>{STUDENT.repoUrl}</a>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="panel">
        <p className="eyebrow">Walkthrough video</p>
        <h2 className={styles.heading}>How to use the website</h2>
        {STUDENT.videoUrl ? (
          <div className={styles.video}>
            <iframe
              src={STUDENT.videoUrl}
              title="Walkthrough video for the Phoneme Activity Builder"
              allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="notice notice--warn">
            No video link set yet. Add the share URL to{' '}
            <code>src/data/student.js</code> as <code>videoUrl</code> and the
            player will appear here.
          </p>
        )}
      </section>

      <section className="panel">
        <p className="eyebrow">The two tools</p>
        <div className={styles.tools}>
          <article>
            <h3>Wordle</h3>
            <p>
              One hidden target word. Students build a guess from the phoneme
              keyboard and get colour feedback on each attempt: green for the
              right phoneme in the right position, amber for a phoneme that
              belongs to the word but sits elsewhere, grey for one that does not
              appear. Every key shows its English equivalence on hover and on
              keyboard focus, and the English spelling of the answer is revealed
              only once the word is solved.
            </p>
            <Link href="/wordle">Open the Wordle builder</Link>
          </article>

          <article>
            <h3>Word Search</h3>
            <p>
              A small word list — around five words — laid into a grid where each
              cell holds one phoneme rather than one letter. Teachers set the grid
              size, decide whether diagonals and backwards words are allowed, and
              choose how much support the word list gives. Students drag across
              the grid to trace a sequence of sounds.
            </p>
            <Link href="/word-search">Open the Word Search builder</Link>
          </article>
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Scope</p>
        <h2 className={styles.heading}>Assessment 1 is frontend only</h2>
        <p>
          This stage is assessed on frontend design, usability and accessibility.
          There is no backend of any kind: the word list is a JavaScript module,
          and generated activities are built in the browser and saved straight to
          disk. Assessment 2 introduces the database and dynamic word-list
          generation.
        </p>

        <div className={styles.scope}>
          <div>
            <h3>In scope now</h3>
            <ul>
              {IN_SCOPE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Deliberately not yet</h3>
            <ul>
              {OUT_OF_SCOPE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Data</p>
        <p>
          The corpus holds {CORPUS.length} words in broad HCE transcription,
          drawn from the subject materials, across{' '}
          {PHONEMES.length} phonemes arranged in the keyboard layout supplied
          with the brief. Transcriptions are Australian English, so the vowel
          symbols differ from the British or American sets you may have seen
          elsewhere.
        </p>
      </section>
    </>
  );
}
