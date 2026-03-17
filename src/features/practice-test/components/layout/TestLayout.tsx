import { cn, getTypeColor, getTypeLabel } from "@/lib/utils";
import { useCallback, useState } from "react";
import { QuestionCard } from "../ui/QuestionCard";
import { ScoreSummary } from "@/features/score/components/ScoreSummary";
import { UploadScreen } from "@/features/upload/components/ui/UploadScreen";
import { AnswerState, Question, RevealState, TestData } from "@/types";

interface TestLayoutProps {
    initialData: TestData | null;
}

export const TestLayout: React.FC<TestLayoutProps> = ({ initialData }) => {
  const [testData, setTestData] = useState<TestData | null>(initialData);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [revealed, setRevealed] = useState<RevealState>({});
  const [filter, setFilter] = useState<"all" | Question["type"]>("all");

  const handleLoad = useCallback((data: TestData) => {
    setTestData(data);
    setAnswers({});
    setRevealed({});
    setFilter("all");
  }, []);

  const handleSelect = useCallback((id: number, option: string) => {
    setAnswers((prev) => {
      const q = testData?.questions.find((q) => q.id === id);
      if (!q) return prev;
      const isSata = q.type === "sata";
      const current = prev[id] ?? [];
      if (isSata) {
        return {
          ...prev,
          [id]: current.includes(option)
            ? current.filter((o) => o !== option)
            : [...current, option],
        };
      }
      return { ...prev, [id]: [option] };
    });
  }, [testData]);

  const handleReveal = useCallback((id: number) => {
    setRevealed((prev) => ({ ...prev, [id]: true }));
  }, []);

  const handleReset = useCallback(() => {
    setTestData(null);
    setAnswers({});
    setRevealed({});
  }, []);

  if (!testData) return <UploadScreen onLoad={handleLoad} />;

  const types = Array.from(new Set(testData.questions.map((q) => q.type)));
  const filtered =
    filter === "all"
      ? testData.questions
      : testData.questions.filter((q) => q.type === filter);

  return (
    <div className="flex min-h-screen bg-[#0d0d14] text-[#e8e6f0]">
      {/* Sidebar */}
      <aside className="w-[240px] min-w-[240px] bg-[#0f0f1a] border-r border-[#1e1e2e] px-5 py-7 flex flex-col gap-1.5 sticky top-0 h-screen overflow-y-auto">
        <div className="text-[30px] font-bold text-[#4f8ef7] mb-2 tracking-tight">Rx</div>
        <div className="text-[13px] text-[#bbb] font-semibold leading-snug mb-1">{testData.title}</div>
        <div className="text-[11px] text-[#555] font-mono overflow-hidden text-ellipsis whitespace-nowrap">
          {testData.question_count} questions
        </div>
        <div className="text-[11px] text-[#555] font-mono overflow-hidden text-ellipsis whitespace-nowrap" title={testData.sources.join(", ")}>
          {testData.sources.slice(0, 2).join(", ")}
          {testData.sources.length > 2 && ` +${testData.sources.length - 2}`}
        </div>

        <div className="mt-6 flex flex-col gap-[3px]">
          <div className="text-[10px] text-[#444] tracking-widest uppercase mb-1.5 font-mono">Filter by type</div>
          {(["all", ...types] as Array<"all" | Question["type"]>).map((t) => (
            <button
                key={t}
                className={cn(
                "bg-transparent border-none text-[#666] text-[13px] px-2.5 py-1.5 rounded-md cursor-pointer text-left flex items-center justify-between transition-[background,color] duration-150",
                filter === t && "bg-[#1e1e2e] text-[#e8e6f0]"
                )}
                onClick={() => setFilter(t)}
            >
                {t === "all" ? "All types" : getTypeLabel(t as Question["type"])}
                {t !== "all" && (
                <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: getTypeColor(t as Question["type"]) }}
                />
                )}
            </button>
            ))}
        </div>

        <ScoreSummary
          data={testData}
          answers={answers}
          revealed={revealed}
          onReset={handleReset}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 px-10 py-8 overflow-y-auto">
        <div className="max-w-[760px] flex flex-col gap-5">
          {filtered.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              selected={answers[q.id] ?? []}
              revealed={!!revealed[q.id]}
              onSelect={handleSelect}
              onReveal={handleReveal}
            />
          ))}
        </div>
      </main>
    </div>
  );
}