import WordSearchBuilder from '@/components/WordSearchBuilder';

export const metadata = {
  title: 'Word Search builder — Phoneme Activity Builder',
  description:
    'Configure a phoneme-based word search and export it as a single offline HTML file.',
};

export default function WordSearchPage() {
  return (
    <>
      <header>
        <p className="eyebrow">Word Search</p>
        <h1>Build a phoneme word search</h1>
        <p className="lede">
          Choose a small set of words from one of your saved lists. Each cell
          holds one phoneme, so students segment sounds rather than scan for
          letters. The grid you approve here is the grid that gets exported.
        </p>
      </header>

      <WordSearchBuilder />
    </>
  );
}
