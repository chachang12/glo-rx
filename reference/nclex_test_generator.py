#!/usr/bin/env python3
"""
NCLEX Practice Test Generator
------------------------------
Converts PDF or plain text notes into a 60-question NCLEX-style practice test
exported as JSON, ready for the NCLEX Test Interface web app.

Usage:
    # Single file
    python nclex_test_generator.py --input notes.pdf

    # Multiple files (combined into one test)
    python nclex_test_generator.py --input lecture1.pdf lecture2.pdf lecture3.txt

    # Custom output path
    python nclex_test_generator.py --input notes.pdf --output exam1.json

    # Show cache savings after generation
    python nclex_test_generator.py --input notes.pdf --verbose

Setup:
    pip install anthropic pdfplumber python-dotenv
    export ANTHROPIC_API_KEY="your-key-here"

Output JSON Schema:
    {
      "title": "NCLEX Practice Test — <source filename>",
      "generated_at": "2025-01-01T00:00:00",
      "question_count": 60,
      "sources": ["notes.pdf"],
      "questions": [
        {
          "id": 1,
          "type": "mcq" | "sata" | "calculation" | "exhibit",
          "stem": "A 45-year-old patient...",
          "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
          "answer": ["B"]          // always an array; SATA has multiple entries
        }
      ]
    }
"""

import argparse
import json
import os
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

REFERENCE_DOC_PATH = Path(__file__).parent / "nclex_question_reference.md"
MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 8192   # 60 questions without rationale fits comfortably within Sonnet's output ceiling
CHUNK_SIZE = 80_000

# ── PDF / Text Extraction ──────────────────────────────────────────────────────

def extract_text_from_pdf(pdf_path: Path) -> str:
    try:
        import pdfplumber
    except ImportError:
        print("Error: pdfplumber not installed. Run: pip install pdfplumber")
        sys.exit(1)

    print(f"  Extracting: {pdf_path.name}")
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages, 1):
            print(f"    Page {i}/{total}...", end="\r")
            text = page.extract_text()
            if text:
                pages.append(text)
    print(f"    Done. {len(pages)} pages extracted.    ")
    return "\n\n".join(pages)


def extract_text_from_txt(path: Path) -> str:
    print(f"  Reading: {path.name}")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return extract_text_from_pdf(path)
    elif suffix in (".txt", ".md"):
        return extract_text_from_txt(path)
    else:
        print(f"Error: Unsupported file type '{suffix}'. Supported: .pdf, .txt, .md")
        sys.exit(1)


# ── Reference Document ─────────────────────────────────────────────────────────

def load_reference_doc() -> str:
    if not REFERENCE_DOC_PATH.exists():
        print(f"Error: NCLEX reference doc not found at: {REFERENCE_DOC_PATH}")
        print("Make sure nclex_question_reference.md is in the same folder as this script.")
        sys.exit(1)
    with open(REFERENCE_DOC_PATH, "r", encoding="utf-8") as f:
        return f.read()


# ── Chunking ───────────────────────────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int) -> list[str]:
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    pos = 0
    while pos < len(text):
        end = pos + chunk_size
        if end >= len(text):
            chunks.append(text[pos:])
            break
        break_pos = text.rfind("\n\n", pos, end)
        if break_pos == -1:
            break_pos = text.rfind("\n", pos, end)
        if break_pos == -1:
            break_pos = end
        chunks.append(text[pos:break_pos])
        pos = break_pos + 1
    return chunks


# ── JSON Parsing ───────────────────────────────────────────────────────────────

def parse_questions_json(raw: str) -> list[dict]:
    """Extract and parse the JSON array from the model response."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
    cleaned = cleaned.strip()

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
OUTPUT FORMAT — CRITICAL:
Return ONLY a valid JSON array. No preamble, no commentary, no markdown fences.

Each question object must have exactly these fields:
{
  "id": <integer, sequential starting from the start number provided>,
  "type": <"mcq" | "sata" | "calculation" | "exhibit">,
  "stem": <string — full question stem including patient scenario>,
  "options": <object with string keys "A", "B", "C", "D" and optionally "E">,
  "answer": <array of strings — e.g. ["B"] for single-answer, ["A","C","E"] for SATA>
}

All fields are required. "answer" must always be an array, even for single-answer questions.
Do not include a rationale field. Do not include any text outside the JSON array.
"""


def generate_questions_json(
    notes_text: str,
    system_prompt: str,
    client: anthropic.Anthropic,
    question_offset: int = 0,
    total_questions: int = 60,
    verbose: bool = False,
) -> tuple[list[dict], dict]:
    start_num = question_offset + 1

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Generate exactly {total_questions} NCLEX-style practice questions "
                    f"numbered {start_num} through {question_offset + total_questions}. "
                    "Follow all formatting and distribution rules in the system prompt exactly.\n\n"
                    f"{JSON_SCHEMA_INSTRUCTIONS}\n\n"
                    "SOURCE NOTES:\n\n"
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
        print(f"\n  Token usage:")
        print(f"    Input:   {usage['input_tokens']:>8,}")
        print(f"    Output:  {usage['output_tokens']:>8,}")

    questions = parse_questions_json(response.content[0].text)
    return questions, usage


# ── Output ─────────────────────────────────────────────────────────────────────

def write_output(data: dict, path: Path) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\nPractice test saved to: {path}")
    print("Load this .json file in the NCLEX Test Interface to start practicing.")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Generate a 60-question NCLEX practice test as JSON from your notes."
    )
    parser.add_argument(
        "--input", "-i",
        nargs="+",
        required=True,
        help="One or more note files (.pdf, .txt, .md)."
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output JSON file path (default: <first_input_stem>_nclex_test.json)"
    )
    parser.add_argument(
        "--title", "-t",
        default=None,
        help="Test title shown in the UI (default: auto-generated from input filenames)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show token usage and cache statistics."
    )
    args = parser.parse_args()

    # ── Resolve paths
    input_paths = []
    for raw in args.input:
        p = Path(raw).resolve()
        if not p.exists():
            print(f"Error: Input file not found: {p}")
            sys.exit(1)
        input_paths.append(p)

    if args.output:
        output_path = Path(args.output).resolve()
        if output_path.suffix.lower() != ".json":
            output_path = output_path.with_suffix(".json")
    else:
        stem = input_paths[0].stem
        output_path = input_paths[0].parent / f"{stem}_nclex_test.json"

    title = args.title or (
        f"NCLEX Practice Test — {', '.join(p.stem for p in input_paths)}"
    )

    # ── Check API key
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set.")
        print("Run: export ANTHROPIC_API_KEY='your-key-here'")
        sys.exit(1)

    # ── Load reference doc
    print("Loading NCLEX question reference...")
    system_prompt = load_reference_doc()

    # ── Extract and combine all input files
    print(f"\nLoading {len(input_paths)} source file(s):")
    all_text_parts = []
    for path in input_paths:
        text = extract_text(path)
        if text.strip():
            all_text_parts.append(f"--- SOURCE: {path.name} ---\n\n{text}")
        else:
            print(f"  Warning: No text extracted from {path.name}, skipping.")

    if not all_text_parts:
        print("Error: No text could be extracted from any input file.")
        sys.exit(1)

    combined_notes = "\n\n\n".join(all_text_parts)
    print(f"\nTotal notes: {len(combined_notes):,} characters")

    # ── Chunk if necessary
    chunks = chunk_text(combined_notes, CHUNK_SIZE)
    if len(chunks) > 1:
        print(f"Notes split into {len(chunks)} chunks.")

    # ── Initialize client
    client = anthropic.Anthropic(api_key=api_key)
    # ── Generate in 2 batches of 30 (fits within the 8k output token limit per call)
    all_questions: list[dict] = []
    total_usage = {k: 0 for k in ("input_tokens", "output_tokens")}

    for batch_num, (offset, count) in enumerate([(0, 30), (30, 30)], 1):
        print(f"\nGenerating questions {offset + 1}\u2013{offset + count} (batch {batch_num}/2)...")

        try:
            questions, usage = generate_questions_json(
                notes_text=combined_notes,
                system_prompt=system_prompt,
                client=client,
                question_offset=offset,
                total_questions=count,
                verbose=args.verbose,
            )
            all_questions.extend(questions)
            for k in total_usage:
                total_usage[k] += usage[k]
            print(f"  \u2713 {len(questions)} questions parsed.")

        except (anthropic.APIError, ValueError, json.JSONDecodeError) as e:
            print(f"  \u2717 Error on batch {batch_num}: {e}")
            print("  Skipping this batch...")
            continue


    if not all_questions:
        print("\nError: No questions were generated.")
        sys.exit(1)

    # Re-number sequentially
    for idx, q in enumerate(all_questions, 1):
        q["id"] = idx

    output_data = {
        "title": title,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "question_count": len(all_questions),
        "sources": [p.name for p in input_paths],
        "questions": all_questions,
    }

    write_output(output_data, output_path)
    print(f"\nTotal questions: {len(all_questions)}")

    if args.verbose:
        print(f"\nToken usage summary:")
        print(f"  Input:   {total_usage['input_tokens']:>8,}")
        print(f"  Output:  {total_usage['output_tokens']:>8,}")

    print("\nDone.")


if __name__ == "__main__":
    main()