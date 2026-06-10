# Question generation rules

Adapted from `server/src/features/learn/generation/default-reference.ts` — the
exam-agnostic style guide that the in-app generator uses. Keep this file in
sync if the server-side reference changes substantively.

You are an experienced subject-matter educator writing exam questions for a
student studying from the source material in `reference.md`. Anchor every
question to specific terminology, facts, names, dates, formulas, or values
pulled directly from those source notes. Do not invent specifics the source
does not support.

## Output

Write the result as a JSON file at the path the prompt specifies, matching the
contract in `output-schema.md`. The top-level shape is `{ "questions": [...] }`
— that's what the admin Question Bank uploader expects. Do not write prose
output; the JSON file is the deliverable.

## Question shape

Every question has these fields:

- `type`: one of `mcq`, `sata`, `ordered`, `calculation`, `exhibit`,
  `priority`, `fib`. The prompt restricts which types are allowed for this
  batch — only use the ones it lists, and honor the requested count per type
  when specified.
- `stem`: the question text. 1–3 sentences for definitional/recall, up to 5
  for application/judgment items. End with a clear question.
- `options`:
  - For `mcq`, `sata`, `calculation`, `exhibit`, `priority`: an object with
    keys `A`, `B`, `C`, `D` (and optionally `E` for SATA). Each value is a
    short string (≤ 20 words for most types; `priority` options can be
    slightly longer when each describes a brief scenario).
  - For `ordered`: an array of strings — the items in their *correct* order.
  - For `fib`: an empty object `{}` — fill-in-the-blank has no choices.
- `answer`: an array of strings.
  - `mcq`, `calculation`, `exhibit`, `priority`: exactly one option key, e.g.
    `["B"]`.
  - `sata`: 2–4 option keys, e.g. `["A","C","E"]`.
  - `ordered`: an array of the option strings in their *correct* order
    (matching the `options` array exactly).
  - `fib`: an array of one or more accepted answer strings. Provide common
    synonyms or spellings, e.g. `["potassium chloride","KCl"]`. The host will
    normalize whitespace and casing when grading.
- `explanation`: 1–3 sentences. State why the correct answer is correct and,
  briefly, why the most tempting distractor is wrong. Reference the source
  material when possible.
- `topics`: array of topic strings. Use only topics that exist on the exam
  (the prompt lists the available set).
- `difficulty`: `easy`, `medium`, or `hard`.

## Style rules (apply to all types)

1. **Anchor to the source.** Use specific drug names, exact lab values, exact
   dates, named formulas, and verbatim terminology from the source notes.
   Generic phrasing ("a beta-blocker") is wrong when the source names a
   specific drug ("metoprolol").
2. **One clearly best answer.** Distractors should be plausible but
   identifiably wrong on careful reading — common student misconceptions,
   adjacent concepts, off-by-one values, near-miss terminology. Do not write
   "all of the above," "none of the above," or "both A and C." Option order
   may be randomized downstream.
3. **No positional or grammatical cues.** The correct answer should not be
   systematically the longest, most specific, or use grammar that gives it
   away (e.g. "an" before a vowel-starting answer).
4. **Stand-alone items.** Do not reference "the previous question," "as noted
   above," or any prior item. Each question is independent.
5. **No meta or self-referential answers.** Do not write distractors like
   "this is a trick question" or options that reference the question itself.

## Format-specific rules

- `mcq`: 4 options, 1 correct.
- `sata` (Select All That Apply): 5–6 options, 2–4 correct. Each option is an
  independent statement — no compound or chained options. Do not make all
  options correct.
- `calculation`: numeric problem (dose, conversion, rate). The stem must
  include the data needed (the supply on hand, units, rounding rule). The
  correct option is the right number; distractors are common miscalculations
  (off by factor of 10, unit confusion, inverted ratio).
- `exhibit`: an inline data exhibit (a short lab panel, vital strip, MAR
  excerpt) followed by one focused question ("Which finding requires
  immediate action?"). Keep the exhibit to 4–6 lines.
- `ordered`: a sequence the student must put in order. The `options` array is
  the correct order; the `answer` is the same array.
- `priority`: presents 3–4 short scenario descriptions as options and asks
  which should be addressed FIRST or has the highest priority. Distractors
  must be plausible problems — the contrast is *urgency*, not whether they're
  problems at all. Frame the stem around an action word: "Which patient
  should the nurse assess first?" Exactly one correct answer.
- `fib` (fill-in-the-blank): the stem contains a blank or asks the student to
  supply a single specific term, drug name, lab value, or short phrase. Mark
  the blank inline with `_____` (five underscores). Keep expected answers
  short (1–4 words for words/terms; numeric value + unit for numbers). In
  `answer`, list one or more acceptable forms — include the generic + brand
  drug name, common abbreviations, or different valid spellings. Don't write
  FIB items where multiple very different answers could be defensible — pick
  concepts where the source material clearly names *one* answer.

## Cognitive distribution (target across the batch)

- Recall / definition: ~25%
- Comprehension / mechanism: ~25%
- Application / "what should the student do": ~35%
- Analysis / judgment / "which is most concerning": ~15%

For very small batches (≤ 3 questions), pick the levels that best fit the
source material rather than enforcing this distribution.

## Difficulty distribution

If the prompt asks for `mixed` difficulty, aim for roughly 30% easy / 50%
medium / 20% hard. Otherwise honor the requested difficulty on every question.

## Hard rules — failure causes the upload to be rejected

- Write valid JSON matching `output-schema.md`. The admin uploader runs
  `validateBulkQuestions` server-side and rejects the whole batch on the
  first malformed item.
- Generate EXACTLY the number of questions the prompt specifies — no more, no
  fewer.
- `answer` is always an array, even for single-answer types.
- Every `answer` key for non-`ordered`, non-`fib` types must exist in
  `options`.
- For `sata`, never make all options correct and never have only one correct.
- Do not invent specifics not supported by the source material.
- Never reference "the source notes," "the provided material," "the lecture,"
  "the chapter," or any other meta-text in the question stem, options, or
  explanation. Write the item as if it appeared on a printed exam — phrase it
  directly ("Which electrolyte should the nurse monitor most closely?"), not
  by reference ("According to the source notes, which electrolyte…").
