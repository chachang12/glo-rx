# Question generation (Claude Code workflow)

Generate exam questions in a local Claude Code session instead of paying the
Anthropic API directly through the app's BYOK generator.

The trade is straightforward: the in-app generator uses `ANTHROPIC_API_KEY` and
runs server-side (counted against per-user usage limits). This workflow uses
whatever Claude plan you're already on for Claude Code, runs offline against
markdown files, and writes a JSON batch you upload through the admin Question
Bank UI.

## Layout

```
tools/question-gen/
├── README.md               you are here
├── shared/
│   ├── generation-rules.md exam-agnostic style + format rules (mirrors the
│   │                       server's DEFAULT_GENERATION_REFERENCE)
│   └── output-schema.md    the bulk-upload JSON contract
└── _template/              copy to <exam-code>/ when scaffolding a new exam
    ├── reference.md        subject material (same content you'd upload as the
    │                       admin AI Reference File)
    ├── prompt.md           per-run parameters — edit then paste into Claude
    └── output/             generated batches land here (gitignored)
```

## Per-exam setup (once)

```bash
cp -R tools/question-gen/_template tools/question-gen/<exam-code>
```

Then fill `reference.md` with the exam's subject matter. This is the same
content you would upload via Admin → Exam → AI Reference File. Keep it focused
— a style guide, topic outline, and any specifics you want anchored (drug
names, exact values, named formulas). The whole file goes into context every
run, so don't dump 200 pages.

## Per-batch run

1. Open `prompt.md` in the exam folder. Fill in the run parameters (topic,
   count, types, difficulty, output filename).
2. Paste the prompt into a Claude Code session opened in the exam folder.
3. Claude reads `../shared/generation-rules.md`, `../shared/output-schema.md`,
   `./reference.md`, and produces `./output/<filename>.json`.
4. Spot-check a handful of questions in the JSON file.
5. Upload via Admin → Exam → Question Bank → Upload questions JSON.

The upload endpoint runs `validateBulkQuestions` server-side. If a question is
malformed (missing answer key, wrong option shape, unknown difficulty) the
whole batch is rejected with the offending index. Fix the JSON and re-upload.

## Why not RAG / vector DB

The original NCLEX pipeline in `reference/nclex/` used a vector store because
the source corpus was bigger than any single context window. For most exam
subjects the style guide + topic outline fits in a single message, so
retrieval is overhead with no payoff. Skip the vector store unless the source
material outgrows the context window.

## Why not match the server's tool-call shape

The server's `record_questions` tool guarantees structured output through the
Anthropic API. Claude Code writes files directly — same goal, simpler
mechanism. `shared/output-schema.md` documents the JSON shape that
`validateBulkQuestions` accepts.
