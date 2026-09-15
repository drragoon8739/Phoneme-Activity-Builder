import ActivityManager from '@/components/ActivityManager';

export const metadata = {
  title: 'Activities — Phoneme Activity Builder',
  description:
    'Saved Wordle and Word Search configurations, generated from stored word lists.',
};

export default function ActivitiesPage() {
  return (
    <>
      <header>
        <p className="eyebrow">Activities</p>
        <h1>Saved activities</h1>
        <p className="lede">
          An activity is a saved configuration pointing at a word list. Several
          activities can share one list, and generating builds the file on the
          server from whatever the list holds right now.
        </p>
      </header>

      <ActivityManager />
    </>
  );
}
