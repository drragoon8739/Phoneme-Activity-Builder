import Link from 'next/link';

import PhonemeStrip from '@/components/PhonemeStrip';
import styles from './home.module.css';

const STEPS = [
  {
    title: 'Configure',
    body: 'Pick a target word from the HCE corpus, or build one phoneme by phoneme on the keyboard. Set difficulty, grid size and how much English support to show.',
  },
  {
    title: 'Preview',
    body: 'Play the activity in the builder exactly as a student will see it, including hover hints and feedback colours. Nothing is exported until it looks right.',
  },
  {
    title: 'Generate',
    body: 'Download a single .html file. It opens in any browser with no internet connection, no plugins and no install — email it, print the link, or drop it in an LMS.',
  },
];

const TOOLS = [
  {
    href: '/wordle',
    name: 'Wordle',
    tagline: 'Guess a hidden word in phonemes',
    body: 'One target word, an on-screen phoneme keyboard, and colour feedback on every attempt. The English spelling stays hidden until the student solves it.',
  },
  {
    href: '/word-search',
    name: 'Word Search',
    tagline: 'Trace phoneme sequences in a grid',
    body: 'About five words laid into a grid the teacher sizes. Students drag across the phonemes rather than letters, which makes segmenting the sound the task.',
  },
];

export default function HomePage() {
  return (
    <>
      <section className={styles.hero}>
        <div>
          <p className="eyebrow">Speech Pathology classroom tools</p>
          <h1 className={styles.title}>
            Activities built from sounds,
            <br />
            not spelling.
          </h1>
          <p className="lede">
            A builder for teachers. Configure a phoneme-based Wordle or Word Search,
            preview it, and export it as one HTML file that runs offline on any
            classroom machine.
          </p>
          <div className="btn-row" style={{ marginTop: 'var(--space-5)' }}>
            <Link href="/wordle" className="btn">
              Build a Wordle
            </Link>
            <Link href="/word-search" className="btn btn--secondary">
              Build a Word Search
            </Link>
          </div>
        </div>

        <div className={styles.heroPanel}>
          <p className="eyebrow">The name itself</p>
          <PhonemeStrip
            phonemes={['w', 'ɜː', 'd', 'ə', 'l']}
            english="wordle"
            revealEnglish
            size="lg"
          />
          <p className={styles.heroNote}>
            Five phonemes, six letters. Hover any tile to see the English
            equivalence — the same hint students get inside every activity.
          </p>
        </div>
      </section>

      <section>
        <p className="eyebrow">How it works</p>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <p className="eyebrow">Two activities</p>
        <div className={styles.tools}>
          {TOOLS.map((tool) => (
            <article key={tool.href} className={`panel ${styles.tool}`}>
              <h3>{tool.name}</h3>
              <p className={styles.tagline}>{tool.tagline}</p>
              <p>{tool.body}</p>
              <Link href={tool.href} className={styles.toolLink}>
                Open the {tool.name} builder <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Scope</p>
        <p>
          This is Assessment 1, which covers frontend design and usability only.
          The word list is a fixed in-memory corpus and there is no database or
          account system. Assessment 2 introduces stored word lists and rotating
          word selection. See{' '}
          <Link href="/about">About</Link> for the full scope statement and the
          walkthrough video, or <Link href="/settings">Settings</Link> to change
          the theme and layout.
        </p>
      </section>
    </>
  );
}
