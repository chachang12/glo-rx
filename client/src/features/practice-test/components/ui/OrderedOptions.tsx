import { cn } from "@/lib/utils";
import { Question } from "@/types";

interface OrderedOptionsProps {
  question: Question;
  selected: string[];
  revealed: boolean;
  onSelect: (id: number, option: string) => void;
}

export const OrderedOptions: React.FC<OrderedOptionsProps> = ({
  question,
  selected,
  revealed,
  onSelect,
}) => {
  const available = Object.keys(question.options).filter(
    (k) => !selected.includes(k)
  );

  const correctOrder = question.answer;

  return (
    <div className="flex flex-col gap-4">
      {/* Sequence builder */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-mono text-[#444] tracking-widest uppercase">
          Your order {selected.length > 0 && `(${selected.length}/${Object.keys(question.options).length})`}
        </p>

        {/* Sequence slots */}
        <div className="flex flex-col gap-2">
          {selected.length === 0 ? (
            <div className="border border-dashed border-[#2a2a3a] rounded-lg px-4 py-3 text-[13px] text-[#444] font-mono">
              Click options below to build your sequence
            </div>
          ) : (
            selected.map((key, i) => {
              const isCorrectPosition = revealed && correctOrder[i] === key;
              const isWrongPosition = revealed && correctOrder[i] !== key;

              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 border transition-[border-color,background] duration-150",
                    revealed && isCorrectPosition && "border-[#10b981] bg-[#10b98110] text-[#10b981]",
                    revealed && isWrongPosition && "border-[#ef4444] bg-[#ef444410] text-[#ef4444]",
                    !revealed && "border-[#4f8ef7] bg-[#4f8ef710] text-[#e8e6f0] cursor-pointer hover:bg-[#4f8ef720]"
                  )}
                  onClick={() => !revealed && onSelect(question.id, key)}
                >
                  {/* Position number */}
                  <span className="font-mono font-bold text-[13px] w-6 h-6 rounded-full border flex items-center justify-center shrink-0"
                    style={{
                      borderColor: revealed
                        ? isCorrectPosition ? "#10b98155" : "#ef444455"
                        : "#4f8ef755",
                      color: revealed
                        ? isCorrectPosition ? "#10b981" : "#ef4444"
                        : "#4f8ef7",
                      backgroundColor: revealed
                        ? isCorrectPosition ? "#10b98115" : "#ef444415"
                        : "#4f8ef715",
                    }}
                  >
                    {i + 1}
                  </span>

                  {/* Option key */}
                  <span className="font-mono font-bold text-[13px] opacity-70 min-w-[18px]">
                    {key}
                  </span>

                  {/* Option text */}
                  <span className="flex-1 text-sm leading-[1.6]">
                    {question.options[key]}
                  </span>

                  {/* Revealed indicators */}
                  {revealed && isCorrectPosition && (
                    <span className="text-[#10b981] font-bold ml-auto pl-2">✓</span>
                  )}
                  {revealed && isWrongPosition && (
                    <div className="flex items-center gap-2 ml-auto pl-2 shrink-0">
                      <span className="text-[11px] font-mono text-[#ef4444] opacity-70">
                        should be {correctOrder[i]}
                      </span>
                      <span className="text-[#ef4444] font-bold">✗</span>
                    </div>
                  )}

                  {/* Remove hint */}
                  {!revealed && (
                    <span className="text-[11px] font-mono text-[#555] ml-auto pl-2 opacity-0 group-hover:opacity-100">
                      click to remove
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Correct order after reveal */}
      {revealed && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-mono text-[#444] tracking-widest uppercase">
            Correct order
          </p>
          {correctOrder.map((key, i) => (
            <div
              key={key}
              className="flex items-center gap-3 border border-[#10b98133] bg-[#10b98108] rounded-lg px-4 py-3"
            >
              <span className="font-mono font-bold text-[13px] w-6 h-6 rounded-full border border-[#10b98155] bg-[#10b98115] text-[#10b981] flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="font-mono font-bold text-[13px] text-[#10b981] opacity-70 min-w-[18px]">
                {key}
              </span>
              <span className="flex-1 text-sm leading-[1.6] text-[#10b981]">
                {question.options[key]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Available options */}
      {!revealed && available.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-mono text-[#444] tracking-widest uppercase">
            Available
          </p>
          {available.map((key) => (
            <button
              key={key}
              className="flex items-center gap-3 bg-[#0d0d14] border border-[#1e1e2e] rounded-lg px-4 py-3 cursor-pointer text-left text-[#bbb] text-sm leading-[1.6] transition-[border-color,background] duration-150 hover:border-[#4f8ef7] hover:text-[#e8e6f0]"
              onClick={() => onSelect(question.id, key)}
            >
              <span className="font-mono font-bold text-[14px] min-w-[20px] opacity-70">
                {key}
              </span>
              <span className="flex-1">{question.options[key]}</span>
              <span className="text-[11px] font-mono text-[#555] ml-auto pl-2">
                + add
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};