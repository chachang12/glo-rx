# Prompt — paste into Claude Code

Fill in the bracketed sections, then paste this entire file as your message in
a Claude Code session opened in this exam folder.

---

Generate exam questions for **[EXAM LABEL — e.g. DAT Biology]**.

Read these files first:
- `../shared/generation-rules.md` — style + format rules (always apply)
- `../shared/output-schema.md` — JSON output contract (must match exactly)
- `./reference.md` — subject material to anchor the questions to

## Run parameters

- **Count:** [N — e.g. 25]
- **Topics:** [comma-separated list of topic strings from reference.md, or "any"]
- **Type mix:** [e.g. "all MCQ" or "60% mcq, 30% sata, 10% fib" or "respect the cognitive distribution in the rules"]
- **Difficulty:** [easy | medium | hard | mixed]
- **Constraints (optional):** [anything specific to this batch — e.g. "no calculation questions; focus on mechanism over recall"]

## Deliverable

Write the output to `./output/[FILENAME].json` (e.g. `./output/2026-06-bio-batch-01.json`).

Top-level shape must be `{ "questions": [ ... ] }` per `output-schema.md`. Do
not write prose output — the JSON file is the deliverable.

## Self-check before finishing

After writing the file, re-read it and verify:

1. The `questions` array length equals the requested count exactly.
2. For each non-`ordered`, non-`fib` question, every `answer` entry exists as
   a key in `options`.
3. Every `sata` question has 2–4 answers and 5–6 options.
4. Every `topics` entry matches a topic string from `reference.md`.
5. Every `difficulty` is `easy`, `medium`, or `hard`.

If any check fails, fix the JSON in place and re-verify before reporting done.

Report the output path and a one-line summary (count + topic breakdown + any
items you weren't fully confident on so I can spot-check those first).
