---
description: Run the 4-agent feature pipeline (planner → coder → tester → reviewer) and leave the branch for human review.
argument-hint: <feature request>
---

Run the full feature pipeline for: **$ARGUMENTS**

You are the orchestrator. Execute the stages below **in order**. Do not skip ahead, and do not do the agents' work yourself — delegate each stage to its subagent. After each stage, confirm the handoff file exists before starting the next.

## Stage 0 — Prep

- Confirm we are **not** on `main` (run `git branch --show-current`). If we are on `main`, stop and tell me to create a feature branch first (`feature/<scope>-<name>` per CONTRIBUTING.md) — the pipeline never works on `main`.
- Clear stale handoff files so no agent reads last run's output: remove `.pipeline/spec.md`, `.pipeline/changes.md`, `.pipeline/test-results.md`, and `.pipeline/review.md` if they exist. (Leave `.pipeline/README.md`.)

## Stage 1 — Plan

- Delegate to the **planner** subagent with the feature request above.
- Wait for `.pipeline/spec.md`.
- If the spec has **OPEN QUESTIONS**, **stop** and show them to me. Do not proceed until I answer.

## Stage 2 — Code

- Delegate to the **coder** subagent.
- Wait for `.pipeline/changes.md`.
- If the Coder stopped on open questions, surface them and stop.

## Stage 3 — Test / verify

- Delegate to the **tester** subagent.
- Wait for `.pipeline/test-results.md`.
- If verification **failed** (typecheck, lint, build, a failing test, or an unhandled spec edge case), **stop** and show me the failures. Do not continue to review.

## Stage 4 — Review

- Delegate to the **reviewer** subagent.
- Show me `.pipeline/review.md`.

## Report

- Print the final **VERDICT** (SHIP / NEEDS WORK / BLOCK) and a one-paragraph summary of what each stage produced.
- **Do not merge anything and do not push.** Leave the branch as-is for my review. I am the final human gate.
