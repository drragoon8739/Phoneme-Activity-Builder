import { z } from 'zod';

/**
 * Input validation for every write endpoint.
 *
 * Validation happens at the API boundary rather than in the UI, because the UI
 * is not the only possible caller — the endpoints are reachable from curl,
 * Postman, or a future mobile client. The frontend still validates for fast
 * feedback, but the database is only ever protected by this layer.
 *
 * SQLite through Prisma has no native enum type, so the constrained fields are
 * stored as strings and their allowed values are enforced here.
 */

export const ACTIVITY_TYPES = ['WORDLE', 'WORD_SEARCH'];
export const DIFFICULTIES = ['supported', 'standard', 'challenge'];
export const LIST_MODES = ['english', 'phonemes', 'both'];
export const THEMES = ['light', 'dark'];
export const WORD_SELECTIONS = ['FIXED', 'RANDOM'];

/** Trim, then treat an empty string as "not supplied". */
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

export const idParam = z.coerce
  .number({ message: 'id must be a number' })
  .int('id must be a whole number')
  .positive('id must be positive');

// --- Word lists -------------------------------------------------------------

export const wordListCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the word list a name')
    .max(80, 'Name must be 80 characters or fewer'),
  description: optionalText(300),
});

export const wordListUpdateSchema = wordListCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Provide at least one field to update' },
);

// --- Words ------------------------------------------------------------------

/**
 * The phoneme sequence is an array of IPA strings, never a single string.
 *
 * Accepting "tʃɪn" would be ambiguous: it could be /tʃ/ /ɪ/ /n/ or /t/ /ʃ/ /ɪ/
 * /n/, and nothing in the string says which. Requiring an array makes the
 * teacher's intent explicit and is why the API cannot silently mis-segment a
 * word. Each symbol is checked against the seeded inventory in the route
 * handler, which is the only place that knows what has actually been seeded.
 */
export const phonemeSequenceSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, 'A phoneme cannot be blank')
      .max(8, 'That is too long to be a single phoneme'),
  )
  .min(2, 'A word needs at least 2 phonemes')
  .max(12, 'A word can hold at most 12 phonemes');

export const wordCreateSchema = z.object({
  english: z
    .string()
    .trim()
    .min(1, 'Enter the English spelling')
    .max(40, 'Spelling must be 40 characters or fewer')
    .regex(/^[a-zA-Z'’-]+$/, 'Use letters, apostrophes and hyphens only'),
  phonemes: phonemeSequenceSchema,
  hint: optionalText(200),
  notes: optionalText(500),
  wordListId: idParam,
});

export const wordUpdateSchema = wordCreateSchema
  .partial()
  .omit({ wordListId: true })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

// --- Activities -------------------------------------------------------------

const activityBase = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the activity a name')
    .max(80, 'Name must be 80 characters or fewer'),
  type: z.enum(ACTIVITY_TYPES, { message: 'type must be WORDLE or WORD_SEARCH' }),
  difficulty: z.enum(DIFFICULTIES, {
    message: 'difficulty must be supported, standard or challenge',
  }),
  title: z.string().trim().min(1, 'Give the activity a title').max(120),
  instructions: optionalText(300),
  theme: z.enum(THEMES).default('light'),
  wordListId: idParam,

  // Wordle
  attempts: z.coerce.number().int().min(1).max(12).optional().nullable(),
  showHints: z.coerce.boolean().default(true),
  wordSelection: z.enum(WORD_SELECTIONS).default('RANDOM'),
  targetWordId: idParam.optional().nullable(),

  // Word search
  gridRows: z.coerce.number().int().min(5).max(20).optional().nullable(),
  gridCols: z.coerce.number().int().min(5).max(20).optional().nullable(),
  allowDiagonals: z.coerce.boolean().default(true),
  allowReverse: z.coerce.boolean().default(false),
  listMode: z.enum(LIST_MODES).default('english'),
  maxWords: z.coerce.number().int().min(1).max(20).optional().nullable(),
});

/**
 * Cross-field rules. A Wordle set to FIXED without a target word would fail at
 * generation time with a confusing error, so it is rejected at save time
 * instead — the teacher finds out while they are still looking at the form.
 */
export const activityCreateSchema = activityBase.superRefine((value, ctx) => {
  if (value.type === 'WORDLE' && value.wordSelection === 'FIXED' && !value.targetWordId) {
    ctx.addIssue({
      code: 'custom',
      path: ['targetWordId'],
      message: 'Choose a target word, or switch to random selection',
    });
  }
  if (value.type === 'WORD_SEARCH') {
    if (!value.gridRows || !value.gridCols) {
      ctx.addIssue({
        code: 'custom',
        path: ['gridRows'],
        message: 'A word search needs a grid size',
      });
    }
  }
});

export const activityUpdateSchema = activityBase.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Provide at least one field to update' },
);

/**
 * Flatten Zod's error tree into { field: message } for the API envelope, so the
 * frontend can attach each message to the input it belongs to.
 */
export function fieldErrors(error) {
  const result = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
