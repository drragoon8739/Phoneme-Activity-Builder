import Link from 'next/link';

import { STUDENT } from '@/data/student';
import styles from './SiteFooter.module.css';

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`shell ${styles.inner}`}>
        <p className={styles.credit}>
          <strong>{STUDENT.name}</strong>
          <span aria-hidden="true"> · </span>
          <span className="sr-only">Student number </span>
          {STUDENT.studentNumber}
        </p>
        <p className={styles.meta}>
          {STUDENT.assessment} · {STUDENT.subject} · {STUDENT.institution}
        </p>
        <nav className={styles.links} aria-label="Footer">
          <Link href="/about">About</Link>
          <Link href="/settings">Settings</Link>
        </nav>
      </div>
    </footer>
  );
}
