import { isCorrect } from "@/lib/utils";
import { AnswerState, RevealState, TestData } from "@/types";

interface ScoreSummaryProps {
    data: TestData;
  answers: AnswerState;
  revealed: RevealState;
  onReset: () => void;
}

export const ScoreSummary: React.FC<ScoreSummaryProps> = ({
  data,
  answers,
  revealed,
  onReset,
}) => {
  const revealedIds = Object.keys(revealed).map(Number);
  const totalRevealed = revealedIds.length;
  const totalCorrect = revealedIds.filter((id) => {
    const q = data.questions.find((q) => q.id === id);
    return q && isCorrect(q, answers[id] ?? []);
  }).length;

  const pct = totalRevealed > 0 ? Math.round((totalCorrect / totalRevealed) * 100) : 0;

  return (
    <div className="mt-auto pt-6 border-t border-[#1e1e2e]">
      <div className="flex mb-3.5">
        <div className="flex-1 flex flex-col items-center py-2">
          <span className="text-[20px] font-bold text-[#e8e6f0] leading-none">{totalCorrect}/{totalRevealed}</span>
          <span className="text-[10px] text-[#555] mt-[3px] font-mono">Answered</span>
        </div>
        <div className="flex-1 flex flex-col items-center py-2 border-l border-[#2a2a3a]">
            <span
                className="text-[20px] font-bold leading-none"
                style={{
                    color: pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444",
                }}
            >
            {pct}%
          </span>
          <span className="text-[10px] text-[#555] mt-[3px] font-mono">Score</span>
        </div>
        <div className="flex-1 flex flex-col items-center py-2 border-l border-[#2a2a3a]">
          <span className="text-[20px] font-bold text-[#e8e6f0] leading-none">{data.question_count - totalRevealed}</span>
          <span className="text-[10px] text-[#555] mt-[3px] font-mono">Remaining</span>
        </div>
      </div>
      <button className="w-full bg-transparent border border-[#2a2a3a] text-[#888] rounded-lg py-2 text-xs cursor-pointer transition-[border-color,color] duration-150"
        onClick={onReset}>
        Load New Test
      </button>
    </div>
  );
}