# Axeous Learn — Tier and Licensing Policy

## Purpose
Defines the capabilities available on each subscription tier (Free and Pro) and the
principles behind the split. This is the single source of truth for entitlement
decisions; the server tier-capability configuration (`server/src/config/usage.ts`) must
mirror this document, and the two are changed together.

## Principles
1. Meter consumption, do not lock features. Free users can experience every core
   capability; paid tiers raise the ceiling rather than unlock hidden doors.
2. Meter creation, not practice. Generating new AI content (questions, flashcards,
   tests, topic extraction) consumes credits. Practicing existing or official content
   is always free and unmetered.
3. The roadmap is the engagement engine, not a paywall. It is generated and viewable on
   all tiers; pro upsells surface naturally where it schedules a pro-only activity.
4. Entitlements derive from the user's subscription tier. Administrative grants may
   override tier for individual accounts.

## Credit definition
One AI credit equals one generation request, which returns a batch (typically up to
about ten items). Credits reset daily at midnight UTC. Practicing existing content does
not consume credits.

## Tier matrix
| Capability | Free | Pro |
| --- | --- | --- |
| AI credits per day (1 credit = 1 generation request) | 10 | 50 |
| Question-bank generation | Metered | Metered |
| Flashcard generation | Metered | Metered |
| ABG vignette generation | Metered | Metered |
| AI tutor explanations | Metered | Metered |
| Official and static tests | Unlimited | Unlimited |
| Practicing existing questions | Unlimited | Unlimited |
| AI test generation (fresh assembled test sets) | Not available | Metered |
| Custom study plans (count per account) | 1 | 5 |
| File uploads per custom plan | 5 | 20 |
| File size caps | 10 MB/file, 50 MB/plan | 10 MB/file, 50 MB/plan |
| Roadmap generation and viewing | Available | Available |

## Notes
- Flashcards, ABG vignettes, and custom plans were previously hard-locked behind license
  flags; this policy unlocks them as metered free capabilities.
- AI test generation is a new paid capability. Free users retain full access to official
  and static tests and to re-practicing any previously generated questions.
- The roadmap's later Simulate phase schedules full AI-generated tests; for Free users
  those activities surface as upgrade prompts, but the roadmap itself stays viewable.
- File size caps are identical across tiers; only file count and plan count differ.

## Enforcement (informative)
- Daily credits: the `requireUsage` middleware reads tier from the user's subscription.
- Custom-plan count and per-plan file count: enforced at create and upload time against
  the tier matrix.
- AI test generation and other pro-only capabilities: gated by tier-derived capability
  checks (`requireCapability`).
- Administrative overrides: role `admin` and explicit grants bypass tier limits.

## Change control
Any change to the tier matrix must update both this document and
`server/src/config/usage.ts` in the same change. The client billing and pricing UI reads
tier state from the API and must not hardcode these numbers.
