import { cn, getTypeColor, getTypeLabel, isCorrect } from "@/lib/utils"
import { Question } from "@/types";
import { OrderedOptions } from "./OrderedOptions";

interface QuestionCardProps {
    question: Question;
    index: number;
    selected: string[];
    revealed: boolean;
    onSelect: (id: number, option: string) => void;
    onSubmit: (id: number) => void;
    onNext: () => void;
    onComplete: () => void;
    isNextDisabled: boolean;
    isLastQuestion: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  selected,
  revealed,
  onSelect,
  onSubmit,
  onNext,
  onComplete,
  isNextDisabled,
  isLastQuestion,
}) => {
  const isSata = question.type === "sata";
  const answered = question.type === "ordered"
  ? selected.length === Object.keys(question.options).length
  : selected.length > 0;
  const correct = isCorrect(question, selected);

  return (
    <div className="bg-[#13131f] border border-[#1e1e2e] rounded-xl px-8 py-7 transition-[border-color] duration-200 flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center gap-3 border-b border-[#1e1e2e] pb-5">
        <span className="text-[12px] font-bold text-[#555] font-mono tracking-[0.05em]">QUESTION {index}</span>
        <span
            className="text-[12px] font-semibold px-2.5 py-1 rounded font-mono tracking-[0.05em] border"
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
      <p className="text-[16px] leading-[1.7] text-[#ddd]">{question.stem}</p>

      {/* Options */}
      {question.type === "ordered" ? (
        <OrderedOptions
            question={question}
            selected={selected}
            revealed={revealed}
            onSelect={onSelect}
        />
        ) : (
        <div className="flex flex-col gap-3">
            {Object.entries(question.options).map(([key, text]) => {
                const isSelected = selected.includes(key);
                const isAnswer = question.answer.includes(key);

                return (
                <button
                    key={key}
                    className={cn(
                    "flex items-start gap-3 bg-[#0d0d14] border border-[#1e1e2e] rounded-lg px-4 py-3 cursor-pointer text-left text-[#bbb] text-sm leading-[1.6] transition-[border-color,background] duration-150",
                    revealed && isAnswer && "border-[#10b981] bg-[#10b98110] text-[#10b981] cursor-default",
                    revealed && isSelected && !isAnswer && "border-[#ef4444] bg-[#ef444410] text-[#ef4444] cursor-default",
                    !revealed && isSelected && "border-[#4f8ef7] bg-[#4f8ef710] text-[#e8e6f0]",
                    revealed && "cursor-default opacity-90"
                    )}
                    onClick={() => !revealed && onSelect(question.id, key)}
                    disabled={revealed}
                >
                    <span className="font-mono font-bold text-[14px] min-w-[20px] opacity-70">{key}</span>
                    <span className="flex-1">{text}</span>
                    {revealed && isAnswer && <span className="text-[#10b981] font-bold ml-auto pl-2 text-lg">✓</span>}
                    {revealed && isSelected && !isAnswer && <span className="text-[#ef4444] font-bold ml-auto pl-2 text-lg">✗</span>}
                </button>
                );
            })}
        </div>
        )}
        {/* Score display after submission */}
        {revealed && (
            <div
            className="p-4 rounded-lg border font-semibold text-center"
            style={{
                backgroundColor: correct ? "#10b98115" : "#ef444415",
                color: correct ? "#10b981" : "#ef4444",
                borderColor: correct ? "#10b98155" : "#ef444455",
            }}
            >
            {correct ? "✓ Correct!" : "✗ Incorrect"}
            </div>
      )}

      {/* Action row */}
    <div className="flex items-center gap-3 pt-4 border-t border-[#1e1e2e]">
        {!revealed ? (
            <button
            className={cn(
                "flex-1 bg-[#4f8ef7] border-none text-white text-[13px] font-semibold px-6 py-3 rounded-lg transition-opacity duration-150",
                answered ? "opacity-100 cursor-pointer hover:bg-[#3d7dd9]" : "opacity-40 cursor-default"
            )}
            onClick={() => answered && onSubmit(question.id)}
            disabled={!answered}
            >
            Submit Answer
            </button>
        ) : isLastQuestion ? (
            <button
            className="flex-1 bg-[#10b981] border-none text-white text-[13px] font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            onClick={onComplete}
            >
            Finish Test
            </button>
        ) : (
            <button
            className="flex-1 bg-[#4f8ef7] border-none text-white text-[13px] font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            onClick={onNext}
            >
            Next
            </button>
        )}
        </div>
    </div>
  );
}