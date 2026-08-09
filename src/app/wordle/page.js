import WordleBuilder from '@/components/WordleBuilder';

export const metadata = {
  title: 'Wordle builder — Phoneme Activity Builder',
  description:
    'Configure a phoneme-based Wordle activity and export it as a single offline HTML file.',
};

export default function WordlePage() {
  return (
    <>
      <header>
        <p className="eyebrow">Wordle</p>
        <h1>Build a phoneme Wordle</h1>
        <p className="lede">
          Students guess a hidden word by choosing phonemes, not letters. Green
          means the right phoneme in the right place; amber means it belongs to
          the word but sits elsewhere. The English spelling appears only once the
          word is solved.
        </p>
      </header>

      <WordleBuilder />
    </>
  );
}
