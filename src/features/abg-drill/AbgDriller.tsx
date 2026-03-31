import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type ImbalanceType =
  | "Respiratory Acidosis"
  | "Respiratory Alkalosis"
  | "Metabolic Acidosis"
  | "Metabolic Alkalosis";

type CompensationState =
  | "Uncompensated"
  | "Partially Compensated"
  | "Fully Compensated";

interface AbgValues {
  pH: number;
  PaCO2: number;
  HCO3: number;
  PaO2: number;
}

interface AbgQuestion {
  values: AbgValues;
  imbalance: ImbalanceType;
  compensation: CompensationState;
  answer: string; // e.g. "Respiratory Acidosis, Uncompensated"
  choices: string[];
  vignette: string | null;
}

type Phase = "setup" | "loading" | "question" | "feedback" | "complete";

// ── ABG Generator ──────────────────────────────────────────────────────────────

const rand = (min: number, max: number, decimals = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

const IMBALANCE_TYPES: ImbalanceType[] = [
  "Respiratory Acidosis",
  "Respiratory Alkalosis",
  "Metabolic Acidosis",
  "Metabolic Alkalosis",
];

const COMPENSATION_STATES: CompensationState[] = [
  "Uncompensated",
  "Partially Compensated",
  "Fully Compensated",
];

function generateAbgValues(
  imbalance: ImbalanceType,
  compensation: CompensationState
): AbgValues {
  // Normal ranges: pH 7.35–7.45, PaCO2 35–45, HCO3 22–26, PaO2 80–100
  let pH: number;
  let PaCO2: number;
  let HCO3: number;
  const PaO2 = rand(75, 100, 0);

  switch (imbalance) {
    case "Respiratory Acidosis": {
      // Primary: PaCO2 high → pH low
      PaCO2 = rand(48, 65, 0);
      if (compensation === "Uncompensated") {
        pH = rand(7.20, 7.34, 2);
        HCO3 = rand(22, 26, 0); // normal
      } else if (compensation === "Partially Compensated") {
        pH = rand(7.20, 7.34, 2); // still acidotic
        HCO3 = rand(27, 35, 0);   // kidneys raising HCO3
      } else {
        // Fully compensated — pH normalized, but values still abnormal
        pH = rand(7.35, 7.39, 2);
        HCO3 = rand(27, 35, 0);
      }
      break;
    }
    case "Respiratory Alkalosis": {
      // Primary: PaCO2 low → pH high
      PaCO2 = rand(20, 34, 0);
      if (compensation === "Uncompensated") {
        pH = rand(7.46, 7.60, 2);
        HCO3 = rand(22, 26, 0);
      } else if (compensation === "Partially Compensated") {
        pH = rand(7.46, 7.55, 2); // still alkalotic
        HCO3 = rand(15, 21, 0);   // kidneys dropping HCO3
      } else {
        pH = rand(7.41, 7.45, 2);
        HCO3 = rand(15, 21, 0);
      }
      break;
    }
    case "Metabolic Acidosis": {
      // Primary: HCO3 low → pH low
      HCO3 = rand(10, 21, 0);
      if (compensation === "Uncompensated") {
        pH = rand(7.20, 7.34, 2);
        PaCO2 = rand(35, 45, 0);
      } else if (compensation === "Partially Compensated") {
        pH = rand(7.20, 7.34, 2); // still acidotic
        PaCO2 = rand(20, 34, 0);  // lungs blowing off CO2
      } else {
        pH = rand(7.35, 7.39, 2);
        PaCO2 = rand(20, 34, 0);
      }
      break;
    }
    case "Metabolic Alkalosis": {
      // Primary: HCO3 high → pH high
      HCO3 = rand(27, 40, 0);
      if (compensation === "Uncompensated") {
        pH = rand(7.46, 7.60, 2);
        PaCO2 = rand(35, 45, 0);
      } else if (compensation === "Partially Compensated") {
        pH = rand(7.46, 7.55, 2); // still alkalotic
        PaCO2 = rand(46, 55, 0);  // lungs retaining CO2
      } else {
        pH = rand(7.41, 7.45, 2);
        PaCO2 = rand(46, 55, 0);
      }
      break;
    }
  }

  return { pH, PaCO2, HCO3, PaO2 };
}

function pickDistractors(correct: string): string[] {
  const all: string[] = [];
  for (const imbalance of IMBALANCE_TYPES) {
    for (const comp of COMPENSATION_STATES) {
      all.push(`${imbalance}, ${comp}`);
    }
  }

  const pool = all.filter((a) => a !== correct);

  // Prefer distractors sharing imbalance type or compensation state
  const [correctImbalance, correctComp] = correct.split(", ");
  const sameImbalance = pool.filter((a) => a.startsWith(correctImbalance));
  const sameComp = pool.filter((a) => a.endsWith(correctComp) && !a.startsWith(correctImbalance));
  const other = pool.filter(
    (a) => !a.startsWith(correctImbalance) && !a.endsWith(correctComp)
  );

  const distractors: string[] = [];

  // Pull 1-2 from same imbalance, 1 from same comp, rest from other
  const shuffled = (arr: string[]) => arr.sort(() => Math.random() - 0.5);
  distractors.push(...shuffled(sameImbalance).slice(0, 2));
  distractors.push(...shuffled(sameComp).slice(0, 1));
  distractors.push(...shuffled(other));

  const final = distractors.slice(0, 3);
  const choices = [correct, ...final].sort(() => Math.random() - 0.5);
  return choices;
}

function generateQuestion(): Omit<AbgQuestion, "vignette"> {
  const imbalance = IMBALANCE_TYPES[Math.floor(Math.random() * 4)];
  const compensation = COMPENSATION_STATES[Math.floor(Math.random() * 3)];
  const values = generateAbgValues(imbalance, compensation);
  const answer = `${imbalance}, ${compensation}`;
  const choices = pickDistractors(answer);
  return { values, imbalance, compensation, answer, choices };
}

// ── Vignette Fetch ─────────────────────────────────────────────────────────────

async function fetchVignette(
  values: AbgValues,
  imbalance: ImbalanceType,
  compensation: CompensationState,
  apiKey: string
): Promise<string> {
  const prompt = `Generate a 2-sentence clinical vignette for an NCLEX-style ABG interpretation question.
The ABG values are: pH ${values.pH}, PaCO2 ${values.PaCO2} mmHg, HCO3 ${values.HCO3} mEq/L, PaO2 ${values.PaO2} mmHg.
The correct interpretation is: ${imbalance}, ${compensation}.
The vignette should describe a realistic patient scenario that is consistent with this diagnosis (e.g. a COPD patient for respiratory acidosis, a patient who has been vomiting for metabolic alkalosis).
Do NOT name the diagnosis in the vignette. Start with "A nurse is caring for...".
Return only the vignette text, no quotes, no labels.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text?.trim() ?? "";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AbgTable({ values }: { values: AbgValues }) {
  const rows = [
    { label: "pH", value: values.pH.toFixed(2), normal: "7.35 – 7.45" },
    { label: "PaCO₂", value: `${values.PaCO2} mmHg`, normal: "35 – 45 mmHg" },
    { label: "HCO₃⁻", value: `${values.HCO3} mEq/L`, normal: "22 – 26 mEq/L" },
    { label: "PaO₂", value: `${values.PaO2} mmHg`, normal: "80 – 100 mmHg" },
  ];

  return (
    <div className="rounded-lg border border-[#1e1e2e] overflow-hidden bg-[#0d0d14]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1e1e2e] bg-[#13131f]">
            <th className="text-left px-4 py-3 font-mono text-[11px] text-[#555] uppercase tracking-widest">Parameter</th>
            <th className="text-left px-4 py-3 font-mono text-[11px] text-[#555] uppercase tracking-widest">Result</th>
            <th className="text-left px-4 py-3 font-mono text-[11px] text-[#555] uppercase tracking-widest">Normal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.label}
              className={cn(
                "border-t border-[#1e1e2e]",
                i % 2 === 0 ? "bg-[#0d0d14]" : "bg-[#13131f]"
              )}
            >
              <td className="px-4 py-3 font-mono font-medium text-[#ddd]">
                {row.label}
              </td>
              <td className="px-4 py-3 font-mono font-semibold text-[#4f8ef7]">
                {row.value}
              </td>
              <td className="px-4 py-3 text-[#888] font-mono text-xs">
                {row.normal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChoiceButton({
  label,
  choice,
  selected,
  correct,
  revealed,
  onClick,
}: {
  label: string;
  choice: string;
  selected: boolean;
  correct: boolean;
  revealed: boolean;
  onClick: () => void;
}) {
  const isCorrectChoice = revealed && correct;
  const isWrongSelection = revealed && selected && !correct;

  return (
    <button
      onClick={onClick}
      disabled={revealed}
      className={cn(
        "w-full text-left px-4 py-3 rounded-lg border text-sm transition-all duration-150",
        "flex items-start gap-3",
        "bg-[#0d0d14] border-[#1e1e2e] text-[#bbb]",
        !revealed && "hover:border-[#4f8ef7]/40 hover:bg-[#4f8ef7]/5 cursor-pointer",
        !revealed && selected && "border-[#4f8ef7] bg-[#4f8ef710] text-[#e8e6f0]",
        isCorrectChoice && "border-[#10b981] bg-[#10b98110] text-[#10b981]",
        isWrongSelection && "border-[#ef4444] bg-[#ef444410] text-[#ef4444]",
        revealed && !selected && !correct && "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center mt-0.5 font-mono",
          !revealed && "border-[#555] text-[#888]",
          isCorrectChoice && "border-[#10b981] text-[#10b981]",
          isWrongSelection && "border-[#ef4444] text-[#ef4444]",
          revealed && !selected && !correct && "border-[#333] text-[#555]",
        )}
      >
        {label}
      </span>
      <span className="leading-relaxed flex-1">{choice}</span>
      {isCorrectChoice && <span className="text-[#10b981] font-bold ml-auto pl-2 text-lg">✓</span>}
      {isWrongSelection && <span className="text-[#ef4444] font-bold ml-auto pl-2 text-lg">✗</span>}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AbgDriller() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [sessionLength, setSessionLength] = useState<number>(10);
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem("anthropic_api_key") ?? "";
    } catch {
      return "";
    }
  });
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const [questions, setQuestions] = useState<AbgQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [loadingVignette, setLoadingVignette] = useState(false);
  const [vignetteError, setVignetteError] = useState(false);

  const currentQuestion = questions[currentIdx] ?? null;
  const revealed = selected !== null;

  // Pre-generate all question skeletons upfront, fetch vignettes lazily
  const startSession = useCallback(async () => {
    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }
    setPhase("loading");
    setScore(0);
    setCurrentIdx(0);
    setSelected(null);

    // Generate all question skeletons
    const skeletons = Array.from({ length: sessionLength }, generateQuestion);
    const withNullVignettes: AbgQuestion[] = skeletons.map((q) => ({
      ...q,
      vignette: null,
    }));
    setQuestions(withNullVignettes);

    // Fetch vignette for first question immediately
    try {
      setLoadingVignette(true);
      const vignette = await fetchVignette(
        skeletons[0].values,
        skeletons[0].imbalance,
        skeletons[0].compensation,
        apiKey
      );
      setQuestions((prev) => {
        const updated = [...prev];
        updated[0] = { ...updated[0], vignette };
        return updated;
      });
    } catch {
      setVignetteError(true);
    } finally {
      setLoadingVignette(false);
    }

    setPhase("question");
  }, [apiKey, sessionLength]);

  // Pre-fetch next question's vignette in the background after answering
  const prefetchNext = useCallback(
    async (nextIdx: number) => {
      if (nextIdx >= questions.length) return;
      if (questions[nextIdx].vignette !== null) return;
      try {
        const q = questions[nextIdx];
        const vignette = await fetchVignette(q.values, q.imbalance, q.compensation, apiKey);
        setQuestions((prev) => {
          const updated = [...prev];
          updated[nextIdx] = { ...updated[nextIdx], vignette };
          return updated;
        });
      } catch {
        // silently fail — question still works without vignette
      }
    },
    [questions, apiKey]
  );

  const handleSelect = (choice: string) => {
    if (revealed) return;
    setSelected(choice);
    const isCorrect = choice === currentQuestion.answer;
    if (isCorrect) setScore((s) => s + 1);
    // Immediately kick off next vignette prefetch
    prefetchNext(currentIdx + 1);
  };

  const handleNext = () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) {
      setPhase("complete");
    } else {
      setCurrentIdx(nextIdx);
      setSelected(null);
    }
  };

  const saveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem("anthropic_api_key", trimmed);
    } catch {}
    setApiKey(trimmed);
    setApiKeyInput("");
    setShowKeyInput(false);
  };

  const SESSION_OPTIONS = [5, 10, 20, 30];

  // ── Setup Screen
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-[#4f8ef7]">ABG Driller</h1>
            <p className="text-[#888] text-sm">
              Arterial blood gas interpretation practice
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#bbb]">Session length</p>
            <div className="grid grid-cols-4 gap-2">
              {SESSION_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setSessionLength(n)}
                  className={cn(
                    "py-2.5 rounded-lg border text-sm font-semibold transition-all font-mono",
                    sessionLength === n
                      ? "border-[#4f8ef7] bg-[#4f8ef7] text-[#0f0f1a]"
                      : "border-[#1e1e2e] bg-[#0d0d14] text-[#888] hover:border-[#4f8ef7]/40 hover:text-[#bbb]"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* API Key section */}
          <div className="space-y-2">
            {apiKey ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#888]">
                  API key{" "}
                  <span className="font-mono text-xs text-[#555]">
                    {apiKey.slice(0, 8)}•••
                  </span>
                </span>
                <button
                  onClick={() => setShowKeyInput((v) => !v)}
                  className="text-[#4f8ef7] hover:underline text-xs font-semibold"
                >
                  Change
                </button>
              </div>
            ) : (
              <p className="text-sm text-[#d4753e]">
                API key required to generate vignettes
              </p>
            )}

            {/* Warning about token consumption */}
            <div className="mt-4 p-3 rounded-lg border border-[#d4753e]/40 bg-[#d4753e]/5">
              <p className="text-xs text-[#d4753e] leading-snug">
                <span className="font-semibold">⚠️ Note:</span> Each vignette generated consumes API tokens. Use sparingly and monitor your usage.
              </p>
            </div>

            {(!apiKey || showKeyInput) && (
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveApiKey()}
                  className="flex-1 px-3 py-2 rounded-lg border border-[#1e1e2e] bg-[#0d0d14] text-sm font-mono text-[#ddd] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40"
                />
                <button
                  onClick={saveApiKey}
                  className="px-3 py-2 rounded-lg bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          <button
            onClick={startSession}
            disabled={!apiKey}
            className={cn(
              "w-full py-3 rounded-lg font-semibold text-sm transition-all",
              apiKey
                ? "bg-[#4f8ef7] text-[#0f0f1a] hover:bg-[#4f8ef7]/90"
                : "bg-[#1e1e2e] text-[#555] cursor-not-allowed"
            )}
          >
            Start {sessionLength}-question session
          </button>
        </div>
      </div>
    );
  }

  // ── Loading Screen
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#4f8ef7] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#888]">Generating vignette...</p>
        </div>
      </div>
    );
  }

  // ── Complete Screen
  if (phase === "complete") {
    const pct = Math.round((score / sessionLength) * 100);
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-2">
            <p className="text-5xl font-bold tabular-nums text-[#4f8ef7]">{pct}%</p>
            <p className="text-[#888] text-sm">
              {score} of {sessionLength} correct
            </p>
          </div>

          <div className="h-2 rounded-full bg-[#1e1e2e] overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct >= 80 ? "bg-[#10b981]" : pct >= 60 ? "bg-[#d4753e]" : "bg-[#ef4444]"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPhase("setup")}
              className="flex-1 py-2.5 rounded-lg border border-[#1e1e2e] bg-[#0d0d14] text-[#bbb] text-sm font-semibold hover:border-[#4f8ef7]/40 hover:text-[#ddd] transition-all"
            >
              Change settings
            </button>
            <button
              onClick={startSession}
              className="flex-1 py-2.5 rounded-lg bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all"
            >
              Drill again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Question Screen
  if (!currentQuestion) return null;

  const isCorrect = selected === currentQuestion.answer;

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      {/* Progress bar */}
      <div className="h-1 bg-[#1e1e2e]">
        <div
          className="h-full bg-[#4f8ef7] transition-all duration-300"
          style={{ width: `${((currentIdx) / sessionLength) * 100}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto p-8 space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between border-b border-[#1e1e2e] pb-5">
          <span className="text-[12px] font-bold text-[#555] font-mono tracking-[0.05em]">
            QUESTION {currentIdx + 1}
          </span>
          <span className="text-[12px] text-[#888] font-mono">
            {score}/{currentIdx} correct
          </span>
        </div>

        {/* Vignette */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-[#555] font-mono font-medium">
            Clinical Scenario
          </p>
          {currentQuestion.vignette ? (
            <p className="text-[16px] leading-[1.7] text-[#ddd]">
              {currentQuestion.vignette} The following arterial blood gas results
              are obtained:
            </p>
          ) : loadingVignette ? (
            <div className="flex items-center gap-2 text-[#888] text-sm">
              <div className="w-3 h-3 border border-[#888] border-t-transparent rounded-full animate-spin" />
              Loading vignette...
            </div>
          ) : (
            <p className="text-[16px] leading-[1.7] text-[#ddd]">
              A nurse is caring for a patient with the following arterial blood
              gas results:
            </p>
          )}
        </div>

        {/* ABG Table */}
        <AbgTable values={currentQuestion.values} />

        {/* Question stem */}
        <p className="text-[16px] font-medium text-[#ddd]">
          Which interpretation should the nurse document?
        </p>

        {/* Answer choices */}
        <div className="space-y-2">
          {currentQuestion.choices.map((choice, i) => (
            <ChoiceButton
              key={choice}
              label={String.fromCharCode(65 + i)}
              choice={choice}
              selected={selected === choice}
              correct={choice === currentQuestion.answer}
              revealed={revealed}
              onClick={() => handleSelect(choice)}
            />
          ))}
        </div>

        {/* Feedback + Next */}
        {revealed && (
          <div className="space-y-4 pt-4">
            <div
              className={cn(
                "flex items-center gap-2 text-sm font-semibold",
                isCorrect ? "text-[#10b981]" : "text-[#ef4444]"
              )}
            >
              {isCorrect ? (
                <>
                  <span className="text-base">✓</span> Correct
                </>
              ) : (
                <>
                  <span className="text-base">✗</span> Incorrect — correct answer:{" "}
                  <span className="font-mono">{currentQuestion.answer}</span>
                </>
              )}
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 rounded-lg bg-[#4f8ef7] text-[#0f0f1a] font-semibold text-sm hover:bg-[#4f8ef7]/90 transition-all"
            >
              {currentIdx + 1 >= sessionLength ? "See results" : "Next question →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}