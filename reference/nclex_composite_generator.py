#!/usr/bin/env python3
"""
NCLEX Composite Test Generator
--------------------------------
Builds a 60-question NCLEX-style practice test from multiple RemNote flashcard
.txt files.

Without --blueprint: topics are sampled proportionally (60 / N docs per doc).

With --blueprint <pdf_or_txt>: a Haiku pre-pass extracts topic weights and focus
bullets from the blueprint. Each matched flashcard file is then sampled and
prompted according to the blueprint's question count and focus areas. Unmatched
blueprint topics are warned and their questions redistributed to matched files.

Usage:
    # Proportional mode (no blueprint)
    python nclex_composite_generator.py --input cardio.txt resp.txt neuro.txt pharm.txt

    # Blueprint-aware mode
    python nclex_composite_generator.py \\
        --blueprint Test_5_Blueprint.pdf \\
        --input Oxygenation_flashcards.txt AcidBase_flashcards.txt Sensory_flashcards.txt

    # With output path and verbose token reporting
    python nclex_composite_generator.py \\
        --blueprint Test_5_Blueprint.pdf \\
        --input *.txt \\
        --output test5_practice.json \\
        --verbose

Setup:
    pip install anthropic pdfplumber python-dotenv
    export ANTHROPIC_API_KEY="your-key-here"

Input format:
    RemNote-style .txt files with :: / ;; / >> / >>> delimiters.
    The same format produced by glo-flashcard-generator.

Output JSON schema: identical to nclex_test_generator.py (compatible with glo-rx).
"""

import argparse
import json
import os
import random
import re
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
if not os.environ.get("ANTHROPIC_API_KEY"):
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv(Path.cwd() / ".env")

try:
    import anthropic
except ImportError:
    print("Error: anthropic package not installed. Run: pip install anthropic")
    sys.exit(1)

# ── Configuration ──────────────────────────────────────────────────────────────

REFERENCE_DOC_PATH  = Path(__file__).parent / "nclex_question_reference.md"
MODEL_MAIN          = "claude-sonnet-4-6"
MODEL_BLUEPRINT     = "claude-haiku-4-5-20251001"
MAX_TOKENS          = 8192
TOTAL_QUESTIONS     = 60
MIN_CLUSTER_CARDS   = 3
QUESTIONS_PER_CHUNK = 6    # Cap per API call so MAX_TOKENS is never the limit.

COMPOSITE_SYSTEM_ADDENDUM = """
COMPOSITE TEST ADDITIONAL INSTRUCTIONS:
- The source material below is a curated subset of topics from a larger document.
- Each topic cluster is separated by a blank line and begins with a term or question.
- Do not reference or imply that the content is incomplete or that topics were omitted.
- Treat the provided clusters as the complete source of truth for this batch.
- Distribute question types naturally across the provided clusters.
- Do not generate more than 3 questions from a single cluster unless it is unusually rich.
"""

BLUEPRINT_SYSTEM_PROMPT = """
You are a structured data extractor. The user will provide a nursing exam blueprint.
Extract every content area and return ONLY a valid JSON array — no preamble, no markdown fences.

Each object must have exactly these fields:
{
  "topic": <string — exact topic name from the blueprint>,
  "count": <integer — number of questions assigned to this topic>,
  "bullets": <array of strings — the focus/review bullet points for this topic>
}

If a topic has a range (e.g. "6-7"), use the higher number.

IMPORTANT — split stacked subcategories:
A single visual row may contain multiple question counts tagged with subcategory markers
such as "(U)" for Urinary, "(B)" for Bowel, "(A)" for Arterial, etc. When you see this,
emit SEPARATE objects — one per subcategory — expanding the marker into the topic name.
Example row: "Elimination (Urinary & Bowel) | 17-20 (U) / 15 (B) | [shared bullets]"
  → { "topic": "Elimination (Urinary)", "count": 20, "bullets": [shared bullets] }
  → { "topic": "Elimination (Bowel)",   "count": 15, "bullets": [shared bullets] }
Both sub-entries inherit the same bullet list from the shared row.

Return nothing outside the JSON array.
"""

# ── PDF Extraction ─────────────────────────────────────────────────────────────

def extract_blueprint_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in (".txt", ".md"):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    elif suffix == ".pdf":
        try:
            import pdfplumber
        except ImportError:
            print("Error: pdfplumber not installed. Run: pip install pdfplumber")
            sys.exit(1)
        pages = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
        return "\n\n".join(pages)
    else:
        print(f"Error: Unsupported blueprint format '{suffix}'. Use .pdf, .txt, or .md")
        sys.exit(1)


# ── Blueprint Pre-Pass (Haiku) ─────────────────────────────────────────────────

def parse_blueprint(blueprint_path: Path, client: anthropic.Anthropic, verbose: bool) -> list[dict]:
    """
    Run a Haiku pre-pass to extract topic weights and focus bullets from the blueprint.
    Returns a list of dicts: {topic, count, bullets}
    """
    print(f"\n── Blueprint pre-pass (Haiku) ──")
    print(f"  Reading: {blueprint_path.name}")
    blueprint_text = extract_blueprint_text(blueprint_path)

    response = client.messages.create(
        model=MODEL_BLUEPRINT,
        max_tokens=2048,
        system=BLUEPRINT_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Extract the blueprint data from this exam blueprint:\n\n{blueprint_text}",
            }
        ],
    )

    if verbose:
        usage = response.usage
        print(f"  Blueprint tokens — input: {usage.input_tokens:,}  output: {usage.output_tokens:,}")

    raw = response.content[0].text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE).strip()

    topics = json.loads(cleaned)
    print(f"  Extracted {len(topics)} blueprint topics:")
    for t in topics:
        print(f"    • {t['topic']} ({t['count']} questions)")

    return topics


# ── Fuzzy Matching ─────────────────────────────────────────────────────────────

def normalize(s: str) -> str:
    """Lowercase, strip punctuation and common filler words for fuzzy comparison."""
    s = s.lower()
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\b(and|the|of|for|a|an|in|on|to|with)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def fuzzy_match(topic: str, paths: list[Path]) -> Path | None:
    """
    Match a blueprint topic name to the best input file via token overlap.
    Returns the Path with the highest overlap score, or None if no tokens match.
    """
    topic_tokens = set(normalize(topic).split())
    best_path = None
    best_score = 0

    for path in paths:
        stem_tokens = set(normalize(path.stem).split())
        overlap = len(topic_tokens & stem_tokens)
        if overlap > best_score:
            best_score = overlap
            best_path = path

    return best_path if best_score > 0 else None


def fuzzy_match_multi(topic: str, paths: list[Path]) -> list[Path]:
    """
    Match a blueprint topic to one or more files by splitting on coordinators
    ('&' or 'and'). Each fragment is independently fuzzy-matched; results are
    deduplicated preserving order. Falls back to a single fuzzy_match when no
    coordinator is present or fragments all map to the same/no file.
    """
    fragments = re.split(r"\s*&\s*|\s+and\s+", topic, flags=re.IGNORECASE)
    fragments = [f.strip() for f in fragments if f.strip()]

    if len(fragments) <= 1:
        single = fuzzy_match(topic, paths)
        return [single] if single else []

    matched: list[Path] = []
    seen: set[Path] = set()
    for frag in fragments:
        p = fuzzy_match(frag, paths)
        if p and p not in seen:
            matched.append(p)
            seen.add(p)

    if not matched:
        single = fuzzy_match(topic, paths)
        return [single] if single else []

    return matched


def split_count(total: int, n: int) -> list[int]:
    """Split `total` across `n` buckets, distributing any remainder to the first buckets."""
    if n <= 0:
        return []
    base = total // n
    remainder = total - base * n
    return [base + (1 if i < remainder else 0) for i in range(n)]


# ── RemNote Parser ─────────────────────────────────────────────────────────────

def parse_clusters(txt: str) -> list[list[str]]:
    """
    Parse a RemNote flashcard txt file into topic clusters.

    Rules:
    - A top-level card is any non-empty line that is NOT indented.
    - Indented lines belong to the current cluster.
    - Blank lines flush the current cluster.
    """
    lines = txt.splitlines()
    clusters: list[list[str]] = []
    current: list[str] = []

    for line in lines:
        if not line.strip():
            if current:
                clusters.append(current)
                current = []
            continue

        is_indented = line[0] in ("\t", " ")

        if is_indented:
            if current:
                current.append(line)
            else:
                current.append(line)
        else:
            if current:
                clusters.append(current)
            current = [line]

    if current:
        clusters.append(current)

    return clusters


def merge_small_clusters(clusters: list[list[str]], min_size: int) -> list[list[str]]:
    """Merge clusters smaller than min_size into their neighbor."""
    if not clusters:
        return clusters

    merged: list[list[str]] = []
    i = 0
    while i < len(clusters):
        cluster = clusters[i]
        if len(cluster) < min_size and i + 1 < len(clusters):
            clusters[i + 1] = cluster + [""] + clusters[i + 1]
            i += 1
            continue
        merged.append(cluster)
        i += 1

    if len(merged) >= 2 and len(merged[-1]) < min_size:
        last = merged.pop()
        merged[-1] = merged[-1] + [""] + last

    return merged


def clusters_to_text(clusters: list[list[str]]) -> str:
    return "\n\n".join("\n".join(line for line in cluster) for cluster in clusters)


def sample_clusters(clusters: list[list[str]], n: int) -> list[list[str]]:
    """Pure random sample — used in proportional (no blueprint) mode."""
    if n >= len(clusters):
        return clusters
    return random.sample(clusters, n)


def bias_sample_clusters(
    clusters: list[list[str]],
    n: int,
    focus_bullets: list[str],
) -> tuple[list[list[str]], int]:
    """
    Blueprint-aware sampling. Guarantees that clusters whose anchor text
    fuzzy-matches a focus bullet are included before random fill.

    Strategy:
    1. Score every cluster against the full set of focus bullets via token overlap.
    2. Pin the top-scoring cluster per bullet (deduplicated) as guaranteed slots.
    3. Fill remaining slots randomly from the unpinned pool.

    Returns (sampled_clusters, n_pinned) so the caller can report coverage.
    """
    if n >= len(clusters):
        return clusters, 0

    bullet_token_sets = [set(normalize(b).split()) for b in focus_bullets]

    def cluster_score(cluster: list[str]) -> int:
        anchor = cluster[0].split("::")[0].split(">>")[0]
        anchor_tokens = set(normalize(anchor).split())
        return sum(
            len(anchor_tokens & bt) for bt in bullet_token_sets
        )

    # Find the best-matching cluster for each bullet, deduplicated
    pinned_indices: list[int] = []
    for bt in bullet_token_sets:
        best_idx, best_overlap = -1, 0
        for i, cluster in enumerate(clusters):
            anchor = cluster[0].split("::")[0].split(">>")[0]
            overlap = len(set(normalize(anchor).split()) & bt)
            if overlap > best_overlap:
                best_overlap = overlap
                best_idx = i
        if best_idx >= 0 and best_idx not in pinned_indices and best_overlap > 0:
            pinned_indices.append(best_idx)

    # Cap pinned to n slots
    pinned_indices = pinned_indices[:n]
    n_pinned = len(pinned_indices)

    pinned = [clusters[i] for i in pinned_indices]

    # Fill remaining slots from unpinned pool
    remaining_n = n - n_pinned
    unpinned = [c for i, c in enumerate(clusters) if i not in set(pinned_indices)]
    fill = random.sample(unpinned, min(remaining_n, len(unpinned)))

    return pinned + fill, n_pinned


# ── Reference Doc ──────────────────────────────────────────────────────────────

def load_system_prompt() -> str:
    if not REFERENCE_DOC_PATH.exists():
        print(f"Error: NCLEX reference doc not found at: {REFERENCE_DOC_PATH}")
        print("Make sure nclex_question_reference.md is in the same folder as this script.")
        sys.exit(1)
    with open(REFERENCE_DOC_PATH, "r", encoding="utf-8") as f:
        base = f.read()
    return base.rstrip() + "\n\n" + COMPOSITE_SYSTEM_ADDENDUM.strip()


# ── JSON Parsing ───────────────────────────────────────────────────────────────

def parse_questions_json(raw: str) -> list[dict]:
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE).strip()

    start = cleaned.find("[")
    end = cleaned.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("No JSON array found in model response.")

    questions = json.loads(cleaned[start:end + 1])
    if not isinstance(questions, list):
        raise ValueError("Parsed JSON is not a list.")
    return questions


# ── API Call ───────────────────────────────────────────────────────────────────

JSON_SCHEMA_INSTRUCTIONS = """
OUTPUT FORMAT — CRITICAL. READ TWICE.
Return ONLY a valid JSON array. No preamble, no commentary, no markdown fences,
no trailing text, no explanation.

Each question object must have EXACTLY these 5 fields and NO others:
{
  "id": <integer, sequential starting from the start number provided>,
  "type": <"mcq" | "sata" | "calculation" | "exhibit">,
  "stem": <string — question stem, concise; 1–3 sentences for MCQ>,
  "options": <object with string keys "A", "B", "C", "D" and optionally "E">,
  "answer": <array of strings — e.g. ["B"] for single-answer, ["A","C","E"] for SATA>
}

HARD RULES — failure to follow will cause the output to be rejected:
- DO NOT include a "rationale" field. It will be discarded and wastes tokens.
- DO NOT include an "explanation", "notes", or "tags" field.
- DO NOT include any text outside the JSON array — no header like "Here are…".
- "answer" must always be an array, even for single-answer questions.
- Keep each stem under ~60 words; keep each option under ~20 words.
"""


def generate_batch(
    notes_text: str,
    system_prompt: str,
    client: anthropic.Anthropic,
    question_offset: int,
    batch_size: int,
    source_label: str,
    focus_bullets: list[str] | None = None,
    custom_instructions: str | None = None,
    verbose: bool = False,
) -> tuple[list[dict], dict]:
    start_num = question_offset + 1
    end_num   = question_offset + batch_size

    # Build focus bullet injection if provided by blueprint
    focus_block = ""
    if focus_bullets:
        bullets_text = "\n".join(f"  - {b}" for b in focus_bullets)
        focus_block = (
            f"\nBLUEPRINT FOCUS AREAS FOR THIS TOPIC:\n"
            f"Prioritize questions that test the following concepts:\n"
            f"{bullets_text}\n\n"
        )

    # Build custom instructions injection if provided
    instructions_block = ""
    if custom_instructions:
        instructions_block = f"\nCUSTOM INSTRUCTIONS:\n{custom_instructions}\n\n"

    count_directive = (
        f"CRITICAL — BATCH SIZE: Generate EXACTLY {batch_size} question(s) — "
        f"no more, no fewer. Ids must run from {start_num} through {end_num} inclusive. "
        f"After emitting the question with id {end_num}, STOP IMMEDIATELY and close the JSON array with `]`. "
        f"Do not continue generating additional questions even if you feel more could be added."
    )

    response = client.messages.create(
        model=MODEL_MAIN,
        max_tokens=MAX_TOKENS,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": (
                    f"{count_directive}\n\n"
                    "Follow all style and distribution rules in the system prompt. "
                    "For small batches, pick the question type(s) that best fit the source notes — "
                    "ratios apply across a full exam, not this batch.\n\n"
                    f"{focus_block}"
                    f"{instructions_block}"
                    f"{JSON_SCHEMA_INSTRUCTIONS}\n\n"
                    f"REMINDER: {count_directive}\n\n"
                    f"SOURCE NOTES ({source_label}):\n\n"
                    f"{notes_text}"
                ),
            }
        ],
    )

    usage = {
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
    }

    if verbose:
        print(f"    Input tokens:  {usage['input_tokens']:>8,}")
        print(f"    Output tokens: {usage['output_tokens']:>8,}")

    raw_text = response.content[0].text
    try:
        questions = parse_questions_json(raw_text)
    except (ValueError, json.JSONDecodeError):
        # Dump raw output next to the script for diagnosis.
        dump = Path(__file__).parent / f"_debug_raw_{source_label.replace(' ', '_')}_{start_num}.txt"
        dump.write_text(raw_text, encoding="utf-8")
        print(f"    ↳ raw model output saved to {dump.name} ({len(raw_text):,} chars)")
        raise
    return questions, usage


# ── Output ─────────────────────────────────────────────────────────────────────

def write_output(data: dict, path: Path) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\nComposite test saved to: {path}")
    print("Load this .json file in the NCLEX Test Interface to start practicing.")


# ── Plan Builders ──────────────────────────────────────────────────────────────

def build_proportional_plan(input_paths: list[Path]) -> list[dict]:
    """
    Fallback plan when no blueprint is provided.
    Each doc gets an equal share of TOTAL_QUESTIONS with remainder distributed first.
    """
    n         = len(input_paths)
    base      = TOTAL_QUESTIONS // n
    remainder = TOTAL_QUESTIONS - base * n

    return [
        {
            "path":    path,
            "count":   base + (1 if i < remainder else 0),
            "bullets": None,
            "topic":   path.stem,
        }
        for i, path in enumerate(input_paths)
    ]


PREVIOUS_CONTENT_PREFIX = "Previous Content"


def build_blueprint_plan(
    blueprint_topics: list[dict],
    input_paths: list[Path],
) -> list[dict]:
    """
    Blueprint-aware plan. Fuzzy-matches each blueprint topic to one or more
    input files (splitting on 'and'/'&' when the topic spans multiple files).
    A "Previous Content" blueprint entry is distributed across files that were
    not matched by any other topic. Anything still unmatched is redistributed
    proportionally across matched topics.
    """
    matched: list[dict] = []
    unmatched_count = 0
    previous_content_count = 0
    previous_content_bullets: list[str] = []

    # Separate "Previous Content" rows — handled after regular matching so they
    # can be assigned to files the blueprint didn't otherwise claim.
    regular_topics = []
    for t in blueprint_topics:
        if "previous content" in t["topic"].lower():
            previous_content_count += t["count"]
            previous_content_bullets += t.get("bullets") or []
        else:
            regular_topics.append(t)

    for t in regular_topics:
        paths = fuzzy_match_multi(t["topic"], input_paths)
        if not paths:
            print(f"  ⚠  No file matched '{t['topic']}' ({t['count']} questions) — will redistribute.")
            unmatched_count += t["count"]
            continue

        shares = split_count(t["count"], len(paths))
        for path, share in zip(paths, shares):
            label = t["topic"] if len(paths) == 1 else f"{t['topic']} → {path.stem}"
            existing = next((m for m in matched if m["path"] == path), None)
            if existing:
                print(f"  ⚠  '{t['topic']}' and '{existing['topic']}' both matched "
                      f"'{path.name}' — merging.")
                existing["count"]  += share
                existing["bullets"] = (existing["bullets"] or []) + (t.get("bullets") or [])
            else:
                matched.append({
                    "path":    path,
                    "count":   share,
                    "bullets": t.get("bullets") or [],
                    "topic":   label,
                })

    if not matched:
        print("Error: No blueprint topics matched any input file.")
        sys.exit(1)

    # "Previous Content" → spread across files the blueprint didn't already use.
    matched_paths = {m["path"] for m in matched}
    unused_paths = [p for p in input_paths if p not in matched_paths]

    if previous_content_count > 0:
        if unused_paths:
            shares = split_count(previous_content_count, len(unused_paths))
            print(f"  ↳  Assigning {previous_content_count} 'Previous Content' question(s) "
                  f"across {len(unused_paths)} unused file(s).")
            for path, share in zip(unused_paths, shares):
                if share > 0:
                    matched.append({
                        "path":    path,
                        "count":   share,
                        "bullets": previous_content_bullets or None,
                        "topic":   PREVIOUS_CONTENT_PREFIX,
                    })
        else:
            print(f"  ⚠  {previous_content_count} 'Previous Content' question(s) have no "
                  f"unused files — redistributing instead.")
            unmatched_count += previous_content_count

    # Redistribute remaining unmatched counts — only across regular matched
    # entries (not PC entries, which are already balanced per file).
    if unmatched_count > 0:
        regular_matched = [m for m in matched if not m["topic"].startswith(PREVIOUS_CONTENT_PREFIX)]
        total_matched = sum(m["count"] for m in regular_matched)
        redistributed = 0
        for i, m in enumerate(regular_matched):
            if i == len(regular_matched) - 1:
                share = unmatched_count - redistributed
            else:
                share = round(unmatched_count * m["count"] / total_matched)
            m["count"]    += share
            redistributed += share
        print(f"  ↳  Redistributed {unmatched_count} questions across {len(regular_matched)} matched topics.")

    # Warn about any file still unclaimed
    used_paths = {m["path"] for m in matched}
    for path in input_paths:
        if path not in used_paths:
            print(f"  ⚠  '{path.name}' had no matching blueprint topic and will not be used.")

    print(f"\n  Blueprint plan ({sum(m['count'] for m in matched)} total questions):")
    for m in matched:
        print(f"    • {m['topic']} → {m['path'].name} ({m['count']} questions)")

    return matched


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Build a 60-question NCLEX composite test from RemNote flashcard .txt files. "
            "With --blueprint, a Haiku pre-pass extracts weights and focus bullets to "
            "drive proportional, targeted question generation."
        )
    )
    parser.add_argument(
        "--input", "-i",
        nargs="+",
        required=True,
        help="One or more RemNote flashcard .txt files."
    )
    parser.add_argument(
        "--blueprint", "-b",
        default=None,
        help="Exam blueprint file (.pdf, .txt, or .md). Enables weighted, focused generation."
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output JSON file path (default: composite_nclex_test.json)"
    )
    parser.add_argument(
        "--title", "-t",
        default=None,
        help="Test title shown in the UI (default: auto-generated)"
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducible topic sampling."
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show token usage per batch and selected topic details."
    )
    parser.add_argument(
        "--instructions",
        default=None,
        help="Custom instructions for the model (e.g., 'Generate extra calculation questions' or 'Make questions more challenging')."
    )
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    # ── Resolve input paths
    input_paths = []
    for raw in args.input:
        p = Path(raw).resolve()
        if not p.exists():
            print(f"Error: Input file not found: {p}")
            sys.exit(1)
        if p.suffix.lower() not in (".txt", ".md"):
            print(f"Error: Only .txt and .md files are supported. Got: {p.name}")
            sys.exit(1)
        input_paths.append(p)

    if not input_paths:
        print("Error: Provide at least one input file.")
        sys.exit(1)

    # ── Resolve output path
    if args.output:
        output_path = Path(args.output).resolve()
        if output_path.suffix.lower() != ".json":
            output_path = output_path.with_suffix(".json")
    else:
        output_path = Path.cwd() / "composite_nclex_test.json"

    # ── API key
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set.")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    # ── Stage 1: Build generation plan
    if args.blueprint:
        blueprint_path = Path(args.blueprint).resolve()
        if not blueprint_path.exists():
            print(f"Error: Blueprint file not found: {blueprint_path}")
            sys.exit(1)
        blueprint_topics = parse_blueprint(blueprint_path, client, args.verbose)
        plan = build_blueprint_plan(blueprint_topics, input_paths)
        mode_label = f"blueprint-weighted ({blueprint_path.name})"
    else:
        plan = build_proportional_plan(input_paths)
        mode_label = "proportional (no blueprint)"

    title = args.title or (
        f"NCLEX Composite Test — {', '.join(p.stem for p in input_paths)}"
    )

    print(f"\nMode: {mode_label}")
    print(f"Planned questions: {sum(e['count'] for e in plan)} across {len(plan)} topic(s)")

    # ── Load system prompt
    print("\nLoading NCLEX question reference...")
    system_prompt = load_system_prompt()

    # ── Stage 2: Generate questions per plan entry
    all_questions: list[dict] = []
    total_usage   = {"input_tokens": 0, "output_tokens": 0}
    question_offset = 0

    for entry_idx, entry in enumerate(plan):
        path        = entry["path"]
        n_questions = entry["count"]
        bullets     = entry.get("bullets")
        topic_label = entry.get("topic", path.stem)

        print(f"\n[{entry_idx + 1}/{len(plan)}] {topic_label} → {path.name} ({n_questions} questions)")

        with open(path, "r", encoding="utf-8") as f:
            raw_txt = f.read()

        clusters = parse_clusters(raw_txt)
        clusters = merge_small_clusters(clusters, MIN_CLUSTER_CARDS)
        print(f"  Parsed {len(clusters)} topic clusters")

        if bullets:
            sampled, n_pinned = bias_sample_clusters(clusters, n_questions, bullets)
            print(f"  Sampled {len(sampled)} clusters "
                  f"({n_pinned} pinned by focus bullets, {len(sampled) - n_pinned} random fill)")
        else:
            sampled = sample_clusters(clusters, n_questions)
            print(f"  Sampled {len(sampled)} clusters (random)")

        if args.verbose:
            print("  Selected clusters:")
            for c in sampled:
                anchor = c[0].split("::")[0].split(">>")[0].strip()
                print(f"    • {anchor[:70]}")
            if bullets:
                print("  Focus bullets:")
                for b in bullets:
                    print(f"    → {b}")

        notes_text = clusters_to_text(sampled)

        print(f"  Generating questions {question_offset + 1}–{question_offset + n_questions}...")

        # Split large entries into chunks so a single API call never approaches
        # MAX_TOKENS. Partial success is preserved — if one chunk fails the rest
        # of the entry still runs.
        chunk_sizes = [
            min(QUESTIONS_PER_CHUNK, n_questions - i)
            for i in range(0, n_questions, QUESTIONS_PER_CHUNK)
        ]
        entry_questions: list[dict] = []
        chunk_offset = question_offset
        for chunk_idx, chunk_size in enumerate(chunk_sizes):
            if len(chunk_sizes) > 1:
                print(f"    Chunk {chunk_idx + 1}/{len(chunk_sizes)} "
                      f"→ questions {chunk_offset + 1}–{chunk_offset + chunk_size}")
            try:
                questions, usage = generate_batch(
                    notes_text=notes_text,
                    system_prompt=system_prompt,
                    client=client,
                    question_offset=chunk_offset,
                    batch_size=chunk_size,
                    source_label=topic_label,
                    focus_bullets=bullets,
                    custom_instructions=args.instructions,
                    verbose=args.verbose,
                )
                entry_questions.extend(questions)
                for k in total_usage:
                    total_usage[k] += usage[k]
            except (anthropic.APIError, ValueError, json.JSONDecodeError) as e:
                print(f"    ✗ Chunk failed: {e}")
            chunk_offset += chunk_size

        all_questions.extend(entry_questions)
        print(f"  ✓ {len(entry_questions)}/{n_questions} questions parsed.")
        question_offset += n_questions

    if not all_questions:
        print("\nError: No questions were generated.")
        sys.exit(1)

    # Re-number sequentially
    for idx, q in enumerate(all_questions, 1):
        q["id"] = idx

    output_data = {
        "title":          title,
        "generated_at":   datetime.now().isoformat(timespec="seconds"),
        "question_count": len(all_questions),
        "sources":        [p.name for p in input_paths],
        "questions":      all_questions,
    }

    write_output(output_data, output_path)

    print(f"\nTotal questions generated: {len(all_questions)}")

    if args.verbose:
        print(f"\nToken usage summary:")
        print(f"  Input:   {total_usage['input_tokens']:>8,}")
        print(f"  Output:  {total_usage['output_tokens']:>8,}")

    print("\nDone.")


if __name__ == "__main__":
    main()