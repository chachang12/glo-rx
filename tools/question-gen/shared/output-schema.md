# Output schema

The admin Question Bank uploader (`POST /api/admin/exams/:code/questions/bulk`)
expects this exact shape. The server runs `validateBulkQuestions` on every
question and rejects the whole batch on the first malformed item.

## Top-level shape

```json
{
  "questions": [
    /* one entry per question, in any order */
  ]
}
```

## Per-question fields

| Field         | Type                                  | Notes                                                                                                  |
|---------------|---------------------------------------|--------------------------------------------------------------------------------------------------------|
| `type`        | `"mcq" \| "sata" \| "ordered" \| "calculation" \| "exhibit" \| "priority" \| "fib"` | Defaults to `mcq` if omitted, but always set it explicitly.                                            |
| `stem`        | string                                | Non-empty. The question text.                                                                          |
| `options`     | object \| array \| `{}`               | Shape depends on `type` — see per-type rules in `generation-rules.md`.                                 |
| `answer`      | string[]                              | Non-empty. Always an array, even for single-answer types.                                              |
| `explanation` | string                                | Optional but write one for every question. 1–3 sentences.                                              |
| `topics`      | string[]                              | Optional. Use topic strings that exist on the exam (the prompt lists them).                            |
| `difficulty`  | `"easy" \| "medium" \| "hard"`        | Optional but write one for every question — admins filter by difficulty.                               |

For non-`ordered`, non-`fib` types, every entry in `answer` must be a key in
`options`. The server enforces this.

## One example per type

### `mcq`

```json
{
  "type": "mcq",
  "stem": "Which electrolyte imbalance is most likely to cause peaked T waves on an ECG?",
  "options": {
    "A": "Hypokalemia",
    "B": "Hyperkalemia",
    "C": "Hyponatremia",
    "D": "Hypercalcemia"
  },
  "answer": ["B"],
  "explanation": "Hyperkalemia shifts the resting membrane potential and produces tall, peaked T waves as serum K⁺ rises above ~5.5 mEq/L. Hypokalemia flattens T waves and produces U waves.",
  "topics": ["Electrolytes"],
  "difficulty": "medium"
}
```

### `sata`

```json
{
  "type": "sata",
  "stem": "Which findings would the nurse expect in a patient with acute pancreatitis? Select all that apply.",
  "options": {
    "A": "Epigastric pain radiating to the back",
    "B": "Serum lipase 4× the upper limit of normal",
    "C": "Cullen's sign",
    "D": "Hyperactive bowel sounds",
    "E": "Hypocalcemia"
  },
  "answer": ["A", "B", "C", "E"],
  "explanation": "Pain radiating to the back, elevated lipase, periumbilical ecchymosis (Cullen's), and hypocalcemia from fat saponification are classic. Bowel sounds are typically hypoactive due to associated ileus.",
  "topics": ["GI / Pancreas"],
  "difficulty": "hard"
}
```

### `ordered`

```json
{
  "type": "ordered",
  "stem": "Place the steps of the cardiac action potential in the correct order.",
  "options": [
    "Phase 0: rapid depolarization (Na⁺ influx)",
    "Phase 1: brief repolarization (K⁺ efflux, Cl⁻ influx)",
    "Phase 2: plateau (Ca²⁺ influx balances K⁺ efflux)",
    "Phase 3: repolarization (K⁺ efflux)",
    "Phase 4: resting potential"
  ],
  "answer": [
    "Phase 0: rapid depolarization (Na⁺ influx)",
    "Phase 1: brief repolarization (K⁺ efflux, Cl⁻ influx)",
    "Phase 2: plateau (Ca²⁺ influx balances K⁺ efflux)",
    "Phase 3: repolarization (K⁺ efflux)",
    "Phase 4: resting potential"
  ],
  "explanation": "Phases 0–4 follow ion-channel kinetics: rapid Na⁺ influx, transient K⁺/Cl⁻ shift, Ca²⁺ plateau, K⁺ repolarization, then resting potential.",
  "topics": ["Cardiac physiology"],
  "difficulty": "medium"
}
```

### `calculation`

```json
{
  "type": "calculation",
  "stem": "The order is heparin 25,000 units in 250 mL D5W to infuse at 18 units/kg/hr for a 70 kg patient. What rate (mL/hr) should the nurse set? Round to the nearest whole number.",
  "options": {
    "A": "11 mL/hr",
    "B": "13 mL/hr",
    "C": "126 mL/hr",
    "D": "1260 mL/hr"
  },
  "answer": ["B"],
  "explanation": "18 units/kg/hr × 70 kg = 1260 units/hr. Concentration = 25,000 units / 250 mL = 100 units/mL. 1260 / 100 = 12.6 ≈ 13 mL/hr. Choice C drops the concentration step; D forgets to convert units to mL.",
  "topics": ["Pharmacology / Dosage calc"],
  "difficulty": "hard"
}
```

### `exhibit`

```json
{
  "type": "exhibit",
  "stem": "A 62-year-old presents with chest pain. The nurse reviews these labs:\n- Troponin I: 0.42 ng/mL (ref < 0.04)\n- CK-MB: 18 ng/mL (ref < 5)\n- Potassium: 3.8 mEq/L\n- BUN: 22 mg/dL\nWhich finding requires immediate provider notification?",
  "options": {
    "A": "Elevated troponin I",
    "B": "Potassium of 3.8 mEq/L",
    "C": "BUN of 22 mg/dL",
    "D": "Reference range for CK-MB"
  },
  "answer": ["A"],
  "explanation": "Troponin I more than 10× the upper limit indicates myocardial necrosis and demands immediate notification. Potassium and BUN are within or near normal.",
  "topics": ["Cardiac labs"],
  "difficulty": "medium"
}
```

### `priority`

```json
{
  "type": "priority",
  "stem": "Which patient should the nurse assess first?",
  "options": {
    "A": "A 30-year-old 2 hours post-op with pain 6/10 requesting medication",
    "B": "A 65-year-old with K⁺ 6.4 and peaked T waves on the monitor",
    "C": "A 50-year-old with a productive cough and SpO₂ 94%",
    "D": "A 70-year-old asking for help to the bathroom"
  },
  "answer": ["B"],
  "explanation": "Hyperkalemia with ECG changes is an immediate life-threat (risk of VF). Pain, mild cough, and toileting are real needs but not immediately unstable.",
  "topics": ["Prioritization", "Electrolytes"],
  "difficulty": "medium"
}
```

### `fib`

```json
{
  "type": "fib",
  "stem": "The first-line antidote for acetaminophen overdose is _____.",
  "options": {},
  "answer": ["N-acetylcysteine", "NAC", "acetylcysteine"],
  "explanation": "NAC replenishes glutathione stores depleted by the toxic metabolite NAPQI. Most effective within 8–10 hours of ingestion.",
  "topics": ["Toxicology"],
  "difficulty": "easy"
}
```

## A complete minimal batch

```json
{
  "questions": [
    {
      "type": "mcq",
      "stem": "...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "answer": ["B"],
      "explanation": "...",
      "topics": ["..."],
      "difficulty": "medium"
    }
  ]
}
```
