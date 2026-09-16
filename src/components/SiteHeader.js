'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { STUDENT } from '@/data/student';

import styles from './SiteHeader.module.css';

const PRIMARY_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/manage', label: 'Manage' },
  { href: '/activities', label: 'Activities' },
];

const SECONDARY_LINKS = [
  { href: '/wordle', label: 'Wordle builder' },
  { href: '/word-search', label: 'Word Search builder' },
  { href: '/about', label: 'About' },
  { href: '/settings', label: 'Settings' },
];

const ALL_LINKS = [...PRIMARY_LINKS, ...SECONDARY_LINKS];

function isCurrent(pathname, href) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/**
 * A disclosure menu used twice: as a kebab on wide screens (secondary pages
 * only) and as a hamburger on narrow screens (every page). Both instances
 * close on Escape, on an outside click, and on navigation.
 */
function NavMenu({ id, label, icon, items, className }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function onPointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className={`${styles.menu} ${className}`} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.menuTrigger}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true" className={styles.menuIcon}>
          {icon}
        </span>
        <span className="sr-only">{label}</span>
      </button>

      <ul id={id} className={styles.menuList} hidden={!open}>
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={styles.menuLink}
              aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={`shell ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandGlyph} aria-hidden="true">
            wɜːdəl
          </span>
          <span className={styles.brandText}>
            <strong>Phoneme Activity Builder</strong>
            <span className={styles.brandSub}>
              {STUDENT.assessment} · {STUDENT.subject}
            </span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <ul className={styles.tabs}>
            {PRIMARY_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={styles.tab}
                  aria-current={isCurrent(pathname, link.href) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <NavMenu
            id="nav-more"
            label="More options"
            icon="⋮"
            items={SECONDARY_LINKS}
            className={styles.kebab}
          />

          <NavMenu
            id="nav-all"
            label="Menu"
            icon="☰"
            items={ALL_LINKS}
            className={styles.burger}
          />
        </nav>
      </div>
    </header>
  );
}
