/**
 * Saves a generated activity to the teacher's machine.
 *
 * The Blob/object-URL approach keeps generation entirely client-side: nothing
 * is uploaded, which matters in a school setting where student-facing material
 * shouldn't take a trip through a server it doesn't need to.
 */
export function downloadHtmlFile(filename, html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoked on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "Phoneme Wordle — bait" becomes "phoneme-wordle-bait.html". */
export function toFilename(...parts) {
  const slug = parts
    .join(' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'activity'}.html`;
}
