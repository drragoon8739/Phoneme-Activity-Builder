import { cookies } from 'next/headers';

import SettingsForm from '@/components/SettingsForm';
import { readPreferences } from '@/lib/preferences';

export const metadata = {
  title: 'Settings — Phoneme Activity Builder',
  description:
    'Theme and layout preferences, stored in cookies so they persist between visits.',
};

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const initial = readPreferences(
    Object.fromEntries(cookieStore.getAll().map((cookie) => [cookie.name, cookie.value])),
  );

  return (
    <>
      <header>
        <p className="eyebrow">Settings</p>
        <h1>Display preferences</h1>
        <p className="lede">
          These settings change how the builder looks on this device. They are
          stored in cookies, so they survive a reload and are read on the server
          before the page renders. The theme you choose here is also the theme
          applied to any activity you export.
        </p>
      </header>

      <SettingsForm initial={initial} />
    </>
  );
}
