# RemNote Flashcard Syntax Reference
> Master reference for agentic AI flashcard generation. All syntax shown here produces valid RemNote flashcards when pasted directly into RemNote.

---

## AGENT SYSTEM PROMPT

When given source material to convert into RemNote flashcards, follow these instructions exactly.

**Your task:** Read the provided text and convert it into RemNote-formatted flashcards using the syntax defined in this document. Output only valid RemNote syntax — no commentary, no headers, no explanation, no markdown formatting around the output. The output should be pasteable directly into RemNote.

**Core priorities, in order:**
1. Every card must be **atomic** — one fact per card, no exceptions
2. Use the **Concept/Descriptor framework by default** for named medical/scientific concepts
3. Use **Basic cards** for standalone facts, mechanisms, or questions that don't belong under a named concept
4. Use **Cloze** only as supplemental reinforcement, never as the primary card type
5. Use **Multi-line** only when a short list is genuinely enumerable and cannot be decomposed further
6. **Do not card everything** — skip background filler, transitional prose, and facts already implied by hierarchy context

**Output format rules:**
- Use **tab indentation** for hierarchy (not spaces)
- Each top-level Rem starts at the leftmost column
- Child Rems are indented one tab per level
- Do not wrap output in code blocks or quotes
- Do not add any text before or after the flashcard output

---

## Atomicity: The Most Important Rule

**Every flashcard must test exactly one piece of information.** This is the single most important constraint for the agent to enforce. Violating it produces cards that are frustrating to practice, impossible to rate accurately, and ineffective for long-term retention.

### What atomicity means

An atomic card cannot be broken into smaller parts that are each independently useful. If a card's answer contains multiple distinct facts, it is not atomic.

**Non-atomic (wrong):**
```
Neutrophil >> A granulocyte that is the most abundant WBC, produced in bone marrow, has a lifespan of 6–8 hours, and kills bacteria via oxidative burst and degranulation
```
This has at least 5 distinct facts. The agent cannot schedule them independently. The learner cannot rate themselves accurately.

**Atomic (correct) — decompose into Concept + Descriptors:**
```
Neutrophil :: Most abundant white blood cell; primary cellular responder to bacterial infection
	classification ;; Granulocyte; polymorphonuclear (PMN)
	origin ;; Bone marrow; derived from myeloid progenitor cells
	lifespan ;; 6–8 hours in circulation; up to several days in tissue
	killing mechanism ;; Oxidative burst (NADPH oxidase → superoxide → H₂O₂); myeloperoxidase → hypochlorous acid; degranulation of proteases and defensins
```

### Why non-atomic cards fail

- **Inconsistent self-rating:** If you recall 4 of 5 facts, did you pass? You'll either over-rate or under-rate yourself, corrupting the spaced repetition schedule.
- **Selective forgetting:** You will unconsciously memorize the easiest facts and ignore the rest, while believing you know the card.
- **No granular scheduling:** RemNote can only schedule the card as a unit. One difficult sub-fact forces the entire card to repeat at the hardest item's interval.
- **Burnout:** Long, dense answers make it impossible to ever feel confident you've gotten a card right.

### Atomicity rules for the agent

**Rule 1: One answer unit per card.**
If the answer requires a comma-separated list of independent facts, split into separate cards.

```
❌ What does aspirin do? >> Inhibits COX-1 and COX-2, reduces prostaglandins, is antiplatelet, treats fever and pain

✅ Aspirin :: NSAID and irreversible antiplatelet agent
	mechanism ;; Irreversibly inhibits COX-1 and COX-2, reducing prostaglandin and thromboxane A2 synthesis
	antiplatelet effect ;; Suppresses TXA2 → prevents platelet aggregation
	analgesic/antipyretic dose ;; 325–650 mg every 4–6 hours
	antiplatelet dose ;; 81 mg daily
```

**Rule 2: If you can ask "and what else?", the card is not atomic.**
```
❌ What are the signs and symptoms of neutropenia and what causes it?
✅ Split into: definition, causes (as separate Descriptors), clinical signs (as separate Descriptors)
```

**Rule 3: Definitions that contain multiple clauses should be split.**
```
❌ Apoptosis :: Programmed cell death that is caspase-mediated, does not cause inflammation, is triggered by intrinsic or extrinsic pathways, and results in cell fragmentation into apoptotic bodies

✅ Apoptosis :: Programmed, regulated cell death; does not trigger inflammation
	mechanism ;; Caspase-mediated; initiated by intrinsic (mitochondrial) or extrinsic (death receptor) pathway
	morphology ;; Cell shrinkage, chromatin condensation, membrane blebbing, fragmentation into apoptotic bodies
	key distinction from necrosis ;; Apoptosis is non-inflammatory and ATP-dependent; necrosis is passive and inflammatory
```

**Rule 4: Don't card what context already provides.**
RemNote shows all ancestor Rems during review. A Descriptor under `Neutrophil ::` does not need to mention "neutrophil" in its text — the parent provides that context.

```
❌ (under Neutrophil)
	neutrophil lifespan ;; Neutrophils live 6–8 hours in blood

✅ (under Neutrophil)
	lifespan ;; 6–8 hours in blood; up to several days in tissue
```

**Rule 5: Don't card filler.**
Skip content that is transitional prose, background obvious to the learner, or restates something already captured in a parent Rem. Only card discrete, testable facts.

---



In RemNote, every flashcard is a **Rem** (a bullet point). The syntax trigger you type between the front and back of a card determines the card type. Indentation creates parent-child hierarchy, and RemNote automatically shows ancestor Rems as context during review — so prompts do not need to repeat information already present in parent Rems.

---

## Card Types Overview

| Type | Trigger | Direction | Visual indicator |
|---|---|---|---|
| Basic (forward) | `>>` or `==` | Front → Back | → |
| Basic (reverse) | `<<` | Back → Front | ← |
| Basic (bidirectional) | `<>` | Both directions | ↔ |
| Basic (disabled) | `>>=` or `==-` | None | — |
| Concept (bidirectional) | `::` | Both (default) | ↔ bold |
| Concept (forward only) | `:>` | Front → Back | → bold |
| Concept (reverse only) | `:<` | Back → Front | ← bold |
| Descriptor (forward) | `;;` | Forward (default) | → italic |
| Descriptor (reverse) | `;<` | Back → Front | ← italic |
| Descriptor (bidirectional) | `;<>` | Both directions | ↔ italic |
| Cloze | `{{blank}}` | Fill-in-blank | underlined |
| Multiple Choice | `>>A)` | Forward | dropdown |
| Multi-line | `>>>` or `==` then Enter | Forward (configurable) | → multiline |

---

## 1. Basic Cards

**Use for:** Simple question → answer pairs. One discrete fact per card.

**Syntax:**
```
Question or prompt >> Answer
```

**Direction variants:**
```
What is the powerhouse of the cell? >> Mitochondria
What is the powerhouse of the cell? << Mitochondria
What is the powerhouse of the cell? <> Mitochondria
```

**Disabled card (for temporary suppression):**
```
What is the powerhouse of the cell? >>- Mitochondria
```

**Best practice examples:**
```
What is the normal resting heart rate in adults? >> 60–100 bpm

What does the sinoatrial node do? >> Acts as the heart's primary pacemaker, initiating electrical impulses

What is Starling's Law? >> The heart's stroke volume increases in response to greater ventricular filling (preload)
```

**Rules:**
- Use for single, unambiguous facts
- The prompt should be unambiguous without context (or rely on parent Rem hierarchy for context)
- Default direction is forward only (`>>`)
- Clicking the arrow in RemNote lets you change direction after creation

---

## 2. Concept Cards

**Use for:** Defining a named concept (a noun/thing). Generates cards in **both directions** by default — name → definition AND definition → name.

**Syntax:**
```
ConceptName :: definition of the concept
```

**Direction variants:**
```
Mitochondria :: Centers of energy production in the cell
Mitochondria :> Centers of energy production in the cell
Mitochondria :< Centers of energy production in the cell
```

**Formatting rules:**
- Concept name appears in **bold** automatically
- Convention: begin with an **uppercase letter**
- Bidirectional by default (tests both recall of name and recall of definition)
- Child Rems under a Concept card do NOT show the back of the concept during review (prevents answer leakage)

**Best practice examples:**
```
Neutrophil :: The most abundant type of white blood cell; a granulocyte that is the first responder to bacterial infection

Apoptosis :: Programmed cell death; a regulated process of cellular self-destruction that does not trigger inflammation

Action Potential :: A rapid, temporary reversal of membrane potential in a neuron caused by ion channel opening
```

**When to use Concept vs Basic:**
- Use **Concept** when the thing has a proper name and you need to recall both the name and the definition
- Use **Basic** when the prompt is a question rather than a term

---

## 3. Descriptor Cards

**Use for:** Describing a specific **attribute or property** of a parent Concept. Shown in *italics*. Forward direction only by default.

**Syntax:**
```
ConceptName :: definition
    attribute name ;; description of that attribute
```

**Direction variants:**
```
    mechanism ;; description
    mechanism ;< description
    mechanism ;<> description
```

**Formatting rules:**
- Descriptor name appears in *italic* automatically
- Convention: begin with a **lowercase letter**
- Must be indented under their parent Concept to work correctly
- During review, the parent Concept is shown as context (but NOT its back/definition, preventing answer leakage)

**Best practice examples:**
```
Neutrophil :: The most abundant type of white blood cell; first responder to bacterial infection
    lifespan ;; 6–8 hours in circulation; up to a few days in tissue
    primary function ;; Phagocytosis of bacteria and fungi
    granule contents ;; Myeloperoxidase, elastase, defensins, and other antimicrobial proteins
    origin ;; Produced in bone marrow from myeloid progenitor cells
```

```
Aspirin :: A nonsteroidal anti-inflammatory drug (NSAID) and antiplatelet agent
    mechanism of action ;; Irreversibly inhibits COX-1 and COX-2 enzymes, reducing prostaglandin and thromboxane synthesis
    antiplatelet dose ;; 81 mg daily
    analgesic/anti-inflammatory dose ;; 325–650 mg every 4–6 hours
    contraindication ;; Reye's syndrome risk in children with viral illness
```

**When to use Descriptors vs Basic:**
- Use **Descriptor** when the fact is a specific attribute of a named concept and you want it organized under that concept in your notes
- Descriptors make notes easier to scan and cross-reference than standalone Basic cards

---

## 4. Cloze (Fill-in-the-Blank) Cards

**Use for:** Sentences where you want to hide one or more specific terms. Good for memorizing definitions in sentence form, sequences, or quotes.

**Syntax — while typing:**
```
The {{term or phrase}} is the location where X occurs.
```

**Syntax — multiple occlusions in one Rem:**
```
The {{sinoatrial node}} initiates the heartbeat and is located in the {{right atrium}}.
```

**Rules:**
- Each `{{...}}` creates one occlusion (blank)
- Multiple occlusions in one Rem: you can choose to hide all at once OR each individually as a separate card
- Can be combined with Basic/Concept/Descriptor cards on the same Rem for extra reinforcement

**Best practice examples:**
```
Neutrophils are produced in the {{bone marrow}} from {{myeloid progenitor}} cells.

The normal WBC count range is {{4,500–11,000}} cells per microliter.

Myeloperoxidase converts hydrogen peroxide and chloride into {{hypochlorous acid}}, a potent antimicrobial.
```

**When to use Cloze:**
- Memorizing parts of a definition or classification
- Quotes or exact phrasing that must be recalled verbatim
- Fast card creation when processing large volumes of content

**When NOT to use Cloze as primary method:**
- The surrounding sentence context can make the answer artificially obvious during review
- Cloze cards are harder to search and cross-reference in notes than Concept/Descriptor cards
- Prefer Concept/Descriptor for most medical/factual learning; use Cloze as supplemental reinforcement

---

## 5. Multi-Line Cards

**Use for:** When the back of a card is a short list that genuinely must be recalled as a set (e.g., enumerable criteria, classification members, steps in a fixed sequence). Use sparingly — lists are among the hardest things to memorize because memory works in connections, not lists.

**When NOT to use multi-line cards:**
- Procedures where understanding the logic makes each next step obvious — learn the model, not the list
- Any list longer than ~5–7 items (break it into sub-concepts instead)
- When individual items could each be their own Concept/Descriptor card

**Two display modes:**

| Mode | Items during review | How to create |
|---|---|---|
| **Set card** | All revealed at once | Default bullet list children |
| **List card** | Revealed one at a time | Numbered list children (type `1.` on first child) |

**Syntax — Set card (all at once):**
```
Question or prompt >>>
    Answer item 1
    Answer item 2
    Answer item 3
```

**Syntax — List card (one at a time):**
```
Question or prompt >>>
    1. Answer item 1
    2. Answer item 2
    3. Answer item 3
```

**Multi-line also works with Concept and Descriptor triggers:**
```
ConceptName :::
    child item 1
    child item 2
```

**Best practice examples:**

Set card (order doesn't matter):
```
What are the five types of white blood cells? >>>
    Neutrophils
    Lymphocytes
    Monocytes
    Eosinophils
    Basophils
```

List card (fixed sequence matters):
```
Intrinsic coagulation pathway (in order) >>>
    1. Factor XII activated by collagen contact
    2. XIIa activates XI → XIa
    3. XIa activates IX → IXa
    4. IXa + VIIIa activate X (tenase complex)
    5. Xa + Va → thrombin (prothrombinase complex)
    6. Thrombin cleaves fibrinogen → fibrin clot
```

Borderline case — prefer Concept/Descriptor over multi-line:
```
❌ Less effective (hard to recall, poor searchability):
SIRS criteria >>>
    Temp >38°C or <36°C
    HR >90 bpm
    RR >20 or PaCO2 <32
    WBC >12k or <4k or >10% bands

✅ More effective (each criterion is its own searchable, testable Descriptor):
SIRS :: Systemic inflammatory response to infection or injury; diagnosed by ≥2 of 4 criteria
    temperature criterion ;; >38°C or <36°C
    heart rate criterion ;; >90 bpm
    respiratory criterion ;; RR >20/min OR PaCO2 <32 mmHg
    WBC criterion ;; >12,000, <4,000, or >10% band forms
```

---

## 6. Multiple-Choice Cards

**Use for:** Exam prep specifically for multiple-choice exams, or as a quick comprehension check after initial reading. Do NOT use as a primary learning method — over-reliance creates pattern-matching memory that fails when answer choices change.

**Why MC is weak for learning:** Repeated MC practice trains you to recognize the right answer from a fixed list, not to recall or reason with the knowledge independently. If exam distractors look different than your study choices, recall can fail entirely.

**The better approach:** Convert MC questions to Basic or Concept/Descriptor cards. Example:

```
❌ Multiple choice (weaker for retention):
Which gas fills party balloons? >>A)
    A) Helium
    B) Hydrogen
    C) Xenon
    D) Nitrogen

✅ Basic (better for free recall):
Which gas is used to fill party balloons? >> Helium

✅ Even better — Concept/Descriptor (builds understanding):
Helium :: Noble gas; second lightest element; chemically inert
    why used in balloons ;; Lighter than air and non-flammable, unlike hydrogen
```

**When MC IS appropriate:**
- You have an official question bank from a licensing exam (e.g., USMLE Qbank)
- You need to practice discrimination between commonly confused answer choices
- Use as a supplement alongside Concept/Descriptor cards, not instead of them

**Syntax:**
```
Question >>A)
    A) Correct answer (A is correct by default)
    B) Wrong answer
    C) Wrong answer
    D) Wrong answer
```

**Mark correct/incorrect answers with slash commands:**
```
    A) Mitochondria /mcw
    B) Nucleus /mcr
    C) Ribosome /mcw
```
(`/mcr` or `/correct` = mark correct; `/mcw` or `/incorrect` = mark wrong)

**Add explanations with Extra Card Detail:**
```
Which is NOT a granulocyte? >>A)
    A) Lymphocyte
        Lymphocytes are agranulocytes — they lack cytoplasmic granules. /extra
    B) Neutrophil /mcw
    C) Eosinophil /mcw
    D) Basophil /mcw
```

**Best practice example:**
```
Which enzyme is deficient in Lesch-Nyhan syndrome? >>A)
    A) HGPRT (hypoxanthine-guanine phosphoribosyltransferase)
    B) Adenosine deaminase /mcw
    C) Xanthine oxidase /mcw
    D) Purine nucleoside phosphorylase /mcw
```

---

## 7. Extra Card Detail (ECD)

**Use for:** Supplementary, non-testable information on the back of a card. Appears after the answer is revealed.

**Trigger:** Type `/extra` or `/ecd` on a child Rem indented under a flashcard Rem.

> ⚠️ ECD is a **RemNote Pro** feature.

**Valid uses for ECD:**
- Additional context or examples that clarify *why* something is true
- Mnemonics or memory aids
- Common misconceptions to watch out for
- Synonyms or alternate terms
- References to related material

**Invalid uses for ECD (don't do this):**
- Information you actually want to be tested on — put that directly on the card back or make a separate card
- Overloading cards with lengthy context — keep cards concise; frequent ECD use is a signal that cards are too complex

**Syntax:**
```
Term :: Definition
    Mnemonic or extra context here /extra
```

```
What is the mechanism of action of metformin? >> Activates AMPK → decreases hepatic gluconeogenesis; also improves peripheral insulin sensitivity
    Does NOT cause hypoglycemia or weight gain; first-line for T2DM /extra
```

```
Neutrophil :: Most abundant WBC; first responder to bacterial infection
    primary function ;; Phagocytosis via oxidative burst and degranulation
        Mnemonic: Neutrophils = "Now!" — they arrive first /extra
```

---

## 8. Disabling Cards

Add `-` immediately after any card trigger to create the card in a disabled state (it won't appear in review queue).

```
Term >>- Answer
Term ::- Definition
Term ;;- Attribute description
```

---

## Hierarchy & Context Example

RemNote shows all **ancestor Rems** during review. This means child cards inherit context from parents — you don't need to repeat the parent concept in every child card.

**Example structure:**
```
Immune System
    Innate Immunity :: Non-specific first line of defense; does not require prior exposure
        key cells ;; Neutrophils, macrophages, dendritic cells, NK cells
        speed of response ;; Minutes to hours
    Adaptive Immunity :: Antigen-specific defense that develops immunological memory
        key cells ;; T lymphocytes and B lymphocytes
        speed of response ;; Days to weeks on first exposure; faster on re-exposure
```

During review of `speed of response ;; Minutes to hours`, the student sees:
- Parent: `Immune System`
- Parent: `Innate Immunity ↔ Non-specific first line of defense...`
- Card front: `speed of response → ?`

---

## Choosing the Right Card Type

| Situation | Best card type |
|---|---|
| Named concept with a definition | Concept (`::`) |
| Specific attribute of a named concept | Descriptor (`;;`) |
| Question with a single factual answer | Basic (`>>`) |
| Sentence with key terms to recall | Cloze (`{{...}}`) |
| A short list where order doesn't matter | Multi-line Set (`>>>` with bullet children) |
| A short list where order matters | Multi-line List (`>>>` with numbered children) |
| Multiple-choice exam preparation | Multiple Choice (`>>A)`) |
| Non-testable supplementary info on card back | Extra Card Detail (`/extra`) |
| Content you want to write but not study yet | Disabled (`>>=`) |
| A concept with multiple enumerable attributes | Descriptor children under a Concept — NOT multi-line |

---

## Complete Worked Example (Medical Content)

```
Neutrophil :: The most abundant granulocyte; primary cellular mediator of acute bacterial infection
    lifespan ;; 6–8 hours in blood; up to several days in tissue
    origin ;; Bone marrow; derived from myeloid progenitor cells via granulopoiesis
    normal count ;; 1,800–7,700 cells/µL (50–70% of total WBC)
    primary function ;; Phagocytosis and destruction of bacteria and fungi
    mechanism of killing ;; Oxidative burst (NADPH oxidase → superoxide → H₂O₂); myeloperoxidase → hypochlorous acid; degranulation of proteases and defensins
    NET formation ;; Neutrophil extracellular traps — chromatin + antimicrobial proteins released to trap and kill pathogens extracellularly

What lab finding suggests a left shift? >> Increased band neutrophils (>10%) in peripheral blood, indicating the marrow is releasing immature forms due to high demand

What is neutropenia? >> ANC <1,500 cells/µL; severe neutropenia is ANC <500; increases risk of bacterial and fungal infection

Signs of neutropenia-related infection >>>
    Fever (often the only sign)
    Absence of classic inflammatory signs (pus, swelling) due to lack of neutrophils
    High risk of gram-negative bacteremia
    Consider empiric broad-spectrum antibiotics immediately
```

---

---

## Handling Lists and Tables from Source Material

Medical source text frequently presents information as bullet lists, numbered lists, or tables. The agent must decide how to convert these rather than blindly mapping them to Multi-line cards. Follow this decision tree for every list or table encountered.

### Decision Tree for Lists

**Step 1: Can any item in the list be expanded further — i.e., does it have its own mechanism, dose, significance, or sub-facts?**
→ YES: Decompose into a Concept with Descriptor children. Do not use Multi-line.
→ NO: Continue to Step 2.

**Step 2: Is the set of items itself what must be recalled (i.e., the complete membership of a category)?**
→ YES: Use a Multi-line Set card (`>>>` with bullet children). Keep to ≤6 items.
→ NO: Continue to Step 3.

**Step 3: Is the order of items fixed and meaningful (a sequence or procedure)?**
→ YES: Use a Multi-line List card (`>>>` with numbered children).
→ NO: The list is probably prose disguised as bullets. Card individual facts as Basic or Descriptor cards and skip the list structure.

---

### Examples

**Source: "Neutrophils function via: phagocytosis, oxidative burst, degranulation, NET formation"**

Each item has its own mechanism — decompose, don't use Multi-line:
```
Neutrophil :: Most abundant WBC; primary responder to bacterial infection
	phagocytosis ;; Engulfs and destroys bacteria and fungi via phagolysosome fusion
	oxidative burst ;; NADPH oxidase → superoxide → H₂O₂; myeloperoxidase converts H₂O₂ + Cl⁻ → hypochlorous acid
	degranulation ;; Releases elastase, defensins, and lactoferrin from primary granules
	NET formation ;; Extrudes chromatin + antimicrobial proteins to trap extracellular pathogens
```

---

**Source: "The five types of white blood cells are: neutrophils, lymphocytes, monocytes, eosinophils, basophils"**

Items are flat category members with no further depth needed at this level — use Multi-line Set:
```
What are the five types of white blood cells? >>>
	Neutrophils
	Lymphocytes
	Monocytes
	Eosinophils
	Basophils
```

---

**Source: "Steps of the complement classical pathway: (1) C1 binds antibody-antigen complex, (2) C1 cleaves C4 and C2, (3) C4b2a forms the C3 convertase, (4) C3 convertase cleaves C3 → C3b, (5) C5 convertase formed → MAC assembly"**

Fixed ordered sequence — use Multi-line List with numbered children:
```
Classical complement pathway (in order) >>>
	1. C1q binds Fc regions of antibody-antigen complex → activates C1r and C1s
	2. C1s cleaves C4 → C4b and C2 → C2a
	3. C4b2a forms = C3 convertase
	4. C3 convertase cleaves C3 → C3b (opsonin) + C3a (anaphylatoxin)
	5. C3b joins C3 convertase → C5 convertase → cleaves C5 → MAC assembly (C5b-9)
```

---

### Decision Tree for Tables

Tables in medical texts typically take one of two forms:

**Form 1: Comparison table (rows = concepts, columns = attributes)**
Each row becomes a Concept with Descriptors. Each column header becomes a Descriptor attribute name.

Source table:

| Drug | Mechanism | Indication | Key SE |
|---|---|---|---|
| Metformin | Activates AMPK → ↓ hepatic gluconeogenesis | T2DM first-line | Lactic acidosis (rare), GI upset |
| Glipizide | Closes K⁺ channels on beta cells → insulin release | T2DM | Hypoglycemia, weight gain |

Convert to:
```
Metformin :: Biguanide; first-line oral agent for type 2 diabetes
	mechanism ;; Activates AMPK → reduces hepatic gluconeogenesis; improves peripheral insulin sensitivity
	indication ;; Type 2 diabetes mellitus; first-line unless contraindicated
	key side effects ;; GI upset (common); lactic acidosis (rare, especially in renal failure)

Glipizide :: Second-generation sulfonylurea for type 2 diabetes
	mechanism ;; Closes ATP-sensitive K⁺ channels on pancreatic beta cells → depolarization → insulin release
	indication ;; Type 2 diabetes; adjunct or alternative when metformin is insufficient
	key side effects ;; Hypoglycemia, weight gain
```

**Form 2: Single-concept attribute table (rows = attributes of one thing)**
Treat as a single Concept with one Descriptor per row.

Source table (about Aspirin):

| Property | Value |
|---|---|
| Class | NSAID / antiplatelet |
| Mechanism | Irreversible COX-1/COX-2 inhibition |
| Antiplatelet dose | 81 mg daily |
| Analgesic dose | 325–650 mg q4–6h |
| Key risk | Reye's syndrome in children with viral illness |

Convert to:
```
Aspirin :: NSAID and irreversible antiplatelet agent
	mechanism ;; Irreversibly acetylates and inhibits COX-1 and COX-2 → ↓ prostaglandins and thromboxane A2
	antiplatelet dose ;; 81 mg daily
	analgesic/antipyretic dose ;; 325–650 mg every 4–6 hours
	key risk ;; Reye's syndrome — avoid in children with viral illness
```

---

### The Override Rule

**If any item in a list or any row in a table could itself have Descriptor children, always decompose into Concept/Descriptor — never collapse into Multi-line.** Multi-line is a last resort for genuinely flat, non-expandable enumerations only.

---



The agent must produce output that pastes directly into RemNote without any modification. These rules are non-negotiable.

**Indentation:** Use a single tab character (`\t`) per level of hierarchy. Do not use spaces.

**No wrapper text:** Do not output anything before or after the flashcard block. No "Here are your flashcards:", no markdown fences, no section labels.

**One Rem per line:** Each card or card component occupies exactly one line. Multi-line card children are each on their own indented line.

**Hierarchy depth:** Maximum 3 levels deep in most cases (Topic → Concept → Descriptor). Deeper nesting is valid only for genuinely nested knowledge structures.

**Valid output example** (for a block of text about neutrophils):

```
Neutrophil :: Most abundant white blood cell; primary cellular responder to bacterial infection
	classification ;; Granulocyte; polymorphonuclear (PMN)
	origin ;; Bone marrow from myeloid progenitor cells
	lifespan ;; 6–8 hours in blood; up to several days in tissue
	killing mechanism ;; Oxidative burst (NADPH oxidase) and degranulation of myeloperoxidase, defensins, and elastase
	normal count ;; 1,800–7,700 cells/µL; 50–70% of total WBC differential
What is a left shift? >> Increased circulating band neutrophils (>10%), indicating the marrow is releasing immature forms due to high demand
Neutropenia :: ANC <1,500 cells/µL
	clinical significance ;; ANC <500 = severe neutropenia; dramatically increases risk of bacterial and fungal infection
	common causes >>>
		Chemotherapy
		Autoimmune destruction
		Bone marrow failure
		Viral infection (transient)
```

**Invalid output examples:**

```
❌ Here are the flashcards based on your text:

❌ ## Neutrophil Cards

❌ - Neutrophil :: Most abundant WBC   (uses dash instead of tab hierarchy)

❌ Neutrophil :: Most abundant WBC, produced in bone marrow, lives 6-8 hours, kills bacteria via oxidative burst   (not atomic)
```

---

## Syntax Quick Reference Card

```
Basic forward:        Prompt >> Answer
Basic reverse:        Prompt << Answer
Basic bidirectional:  Prompt <> Answer
Basic disabled:       Prompt >>- Answer

Concept bidir:        Term :: Definition
Concept forward:      Term :> Definition
Concept reverse:      Term :< Definition

Descriptor forward:   attribute ;; description
Descriptor reverse:   attribute ;< description
Descriptor bidir:     attribute ;<> description

Cloze:                The {{hidden term}} in a sentence.

Multi-line Set:       Prompt >>>
                          Item 1
                          Item 2

Multi-line List:      Prompt >>>
                          1. Item 1
                          2. Item 2

Multiple choice:      Question >>A)
                          A) Correct answer
                          B) Wrong answer

Extra Card Detail:    (indent under card Rem) Supplementary info /extra

Disable any card:     Add - after trigger (e.g., >>-, ::-, ;;-)
```
