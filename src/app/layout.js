import { cookies } from 'next/headers';

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { PREFERENCES, PREFERENCE_KEYS, coercePreference } from '@/lib/preferences';

import './globals.css';

export const metadata = {
  title: 'Phoneme Activity Builder — wɜːdəl',
  description:
    'Build phoneme-based Wordle and Word Search activities for Speech Pathology students, and export them as a single offline HTML file.',
};

export const viewport = {
  themeColor: '#7a2e56',
};

/**
 * The layout is a server component so the saved theme is already on <html>
 * in the first byte of HTML. No flash, no client-side hydration guessing.
 */
export default async function RootLayout({ children }) {
  const cookieStore = await cookies();

  const attributes = {};
  for (const key of PREFERENCE_KEYS) {
    const spec = PREFERENCES[key];
    attributes[spec.attribute] = coercePreference(
      key,
      cookieStore.get(spec.cookie)?.value,
    );
  }

  return (
    <html lang="en-AU" {...attributes}>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="shell page">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
