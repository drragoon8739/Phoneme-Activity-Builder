# Submission notes

Working notes for the Assessment 1 submission. Not part of the application.

## Checklist

- [ ] `src/data/student.js` filled in: name, student number, video URL, repo URL
- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes with no errors
- [ ] Both activities generated and opened from the file system to confirm they
      run without a server
- [ ] GitHub repository pushed, with a readable commit history
- [ ] Video recorded (6–8 min), showing student ID, face and voice
- [ ] AI acknowledgement completed and attached
- [ ] Zip built without `node_modules` and `.next`
- [ ] Minimum five references, APA 7th, shown in the video

## Video plan (6–8 minutes)

**0:00 — Who and what (30s).** Student ID to camera, name and number, one
sentence on what the tool does: a builder that turns a phoneme word list into
classroom activities that run offline.

**0:30 — GitHub (45s).** Repository homepage, then the commit list. Talk about
how the work was staged: data layer first, then the design system, then
components, then the two builders, then exports.

**1:15 — Live walkthrough (2 min).** Home → Wordle. Choose a word, set
difficulty, play the preview. Hover a key to show the `/θ/ — TH (as in thin)`
hint. Solve it and show the English reveal. Then Word Search: pick words, resize
the grid, shuffle, show answers. Press Generate on each and open the downloaded
files from the file system — stress that the address bar shows `file://`, no
server, no internet.

**3:15 — Component structure and scalability (1 min).** Open `src/components`.
Point out that `PhonemeTile` is used by the keyboard, the board, the strip and
both builders, so a change to the hint behaviour happens once. Point out that
`corpus.js` is the single seam where Assessment 2 swaps a fixed array for a
database query, and nothing else has to change.

**4:15 — Usability (1 min).** Three numbered steps in a fixed order.
Configure/Preview/Generate labelled on screen. Destructive-free preview: nothing
downloads until Generate. Warnings that appear before failure — grid too small,
word does not fit — rather than after.

**5:15 — Accessibility (1 min).** Tab through the header to show focus outlines
and the skip link. Show a hint appearing on focus, not just hover. Mention 44px
targets, the colour legend so feedback is never colour-alone, live-region status
messages, and the large-print and compact options in Settings.

**6:15 — Trade-offs (45s).** No web fonts, because the exports have to work
offline and IPA glyph coverage matters more than a fashionable typeface. The
in-app word search preview is not draggable, because the export is where the
interaction lives and rebuilding it twice was not worth it at this stage.
Backwards words off by default, for phonological reasons rather than technical
ones.

**7:00 — References (30s).** On screen, APA 7th.

## Reference starting points

You need at least five academic or industry sources, in APA 7th. Look for:

- React documentation on component composition and hooks
- Next.js App Router documentation on server components
- W3C WCAG 2.2 success criteria — target size, focus visible, use of colour
- Nielsen Norman Group on visibility of system status and error prevention
- A speech pathology or phonics source on phoneme segmentation and grapheme–
  phoneme correspondence
- An Australian English phonetics source supporting the HCE vowel transcriptions

Check each one yourself before citing it — do not cite anything you have not
read.
