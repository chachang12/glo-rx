import { cn, getTypeColor, getTypeLabel, isCorrect } from "@/lib/utils"
import { Question } from "@/types";

interface QuestionCardProps {
    question: Question;
    index: number;
    selected: string[];
    revealed: boolean;
    onSelect: (id: number, option: string) => void;
    onReveal: (id: number) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  selected,
  revealed,
  onSelect,
  onReveal,
}) => {
  const isSata = question.type === "sata";
  const answered = selected.length > 0;
  const correct = isCorrect(question, selected);

  return (
    <div className="bg-[#13131f] border border-[#1e1e2e] rounded-xl px-7 py-6 transition-[border-color] duration-200">
      {/* Header row */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="text-[11px] font-bold text-[#555] font-mono tracking-[0.05em]">Q{question.id}</span>
        <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded font-mono tracking-[0.05em] border"
            style={{
                backgroundColor: getTypeColor(question.type) + "22",
                color: getTypeColor(question.type),
                borderColor: getTypeColor(question.type) + "55",
            }}
        >
            {getTypeLabel(question.type)}
            {isSata && " — Select all that apply"}
        </span>
      </div>

      {/* Stem */}
      <p className="text-[15px] leading-[1.65] text-[#ddd] mb-[18px]">{question.stem}</p>

      {/* Options */}
        <div className="flex flex-col gap-2 mb-4">
        {Object.entries(question.options).map(([key, text]) => {
            const isSelected = selected.includes(key);
            const isAnswer = question.answer.includes(key);

            return (
            <button
                key={key}
                className={cn(
                "flex items-start gap-3 bg-[#0d0d14] border border-[#1e1e2e] rounded-lg px-3.5 py-[11px] cursor-pointer text-left text-[#bbb] text-sm leading-[1.5] transition-[border-color,background] duration-150",
                revealed && isAnswer && "border-[#10b981] bg-[#10b98110] text-[#10b981] cursor-default",
                revealed && isSelected && !isAnswer && "border-[#ef4444] bg-[#ef444410] text-[#ef4444] cursor-default",
                !revealed && isSelected && "border-[#4f8ef7] bg-[#4f8ef710] text-[#e8e6f0]"
                )}
                onClick={() => !revealed && onSelect(question.id, key)}
                disabled={revealed}
            >
                <span className="font-mono font-bold text-[13px] min-w-[18px] opacity-70">{key}</span>
                <span className="flex-1">{text}</span>
                {revealed && isAnswer && <span className="text-[#10b981] font-bold ml-auto pl-2">✓</span>}
                {revealed && isSelected && !isAnswer && <span className="text-[#ef4444] font-bold ml-auto pl-2">✗</span>}
            </button>
            );
        })}
        </div>

      {/* Action row */}
        <div className="flex items-center gap-3">
            {!revealed ? (
                <button
                className={cn(
                    "bg-[#4f8ef7] border-none text-white text-[13px] font-semibold px-5 py-2 rounded-lg transition-opacity duration-150",
                    answered ? "opacity-100 cursor-pointer" : "opacity-40 cursor-default"
                )}
                onClick={() => answered && onReveal(question.id)}
                disabled={!answered}
                >
                Check Answer
                </button>
            ) : (
                <div
                className="text-[13px] font-semibold px-3.5 py-1.5 rounded-lg border font-mono"
                style={{
                    backgroundColor: correct ? "#10b98122" : "#ef444422",
                    color: correct ? "#10b981" : "#ef4444",
                    borderColor: correct ? "#10b98155" : "#ef444455",
                }}
                >
                {correct ? "✓ Correct" : "✗ Incorrect"}
                </div>
            )}
        </div>

    </div>
  );
}