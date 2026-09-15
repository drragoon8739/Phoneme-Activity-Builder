import WordListManager from '@/components/WordListManager';

export const metadata = {
  title: 'Manage word lists — Phoneme Activity Builder',
  description:
    'Create, edit and delete phoneme-based word lists stored in the database.',
};

export default function ManagePage() {
  return (
    <>
      <header>
        <p className="eyebrow">Manage</p>
        <h1>Word lists</h1>
        <p className="lede">
          Everything here is stored in the database. Words are built on the
          phoneme keyboard rather than typed, so each symbol is saved as its own
          unit — /tʃ/ is one phoneme, not the two characters t and ʃ.
        </p>
      </header>

      <WordListManager />
    </>
  );
}
