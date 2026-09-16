import Link from 'next/link';

import PhonemeStrip from '@/components/PhonemeStrip';
import styles from './home.module.css';

const STEPS = [
  {
    title: 'Build a word list',
    body: 'Add words to the database phoneme by phoneme on the keyboard. Each symbol is stored as its own unit, so /tʃ/ is one phoneme rather than two characters.',
  },
  {
    title: 'Save an activity',
    body: 'Point a Wordle or Word Search at a word list and save the settings. Several activities can share one list, so the same content serves different classes.',
  },
  {
    title: 'Generate',
    body: 'The server builds a single .html file from the stored list. It opens in any browser with no internet connection and no install — email it, print it, or drop it in an LMS.',
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
        <p className="eyebrow">How your content is stored</p>
        <p>
          Word lists and activity settings are stored in a database. Teachers
          manage their own content under{' '}
          <Link href="/manage">Manage</Link>, save reusable configurations under{' '}
          <Link href="/activities">Activities</Link>, and generate a fresh
          downloadable file whenever they need one — an activity set to random
          selection produces a different word every time. See{' '}
          <Link href="/about">About</Link> for the full scope statement and the
          walkthrough video, or <Link href="/settings">Settings</Link> to change
          the theme and layout.
        </p>
      </section>
    </>
  );
}
