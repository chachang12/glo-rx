import { isCorrect } from '@/lib/utils'
import type { SessionQuestion } from '../types/session'

interface AnswerSurfaceProps {
  question: SessionQuestion
  selected: string[]
  isRevealed: boolean
  onSelect: (option: string) => void
  onFib: (value: string) => void
}

/** FIB stores options as {} server-side and Mongoose Mixed can drop the empty
 *  object before it reaches the client, so coalesce defensively. */
function toEntries(options: SessionQuestion['options']): [string, string][] {
  if (!options) return []
  if (Array.isArray(options)) return options.map((v, i) => [String(i), v])
  return Object.entries(options)
}

export const AnswerSurface = ({ question, selected, isRevealed, onSelect, onFib }: AnswerSurfaceProps) => {
  const entries = toEntries(question.options)

  if (question.type === 'ordered') {
    return (
      <OrderedSequence
        entries={entries}
        selected={selected}
        answer={question.answer}
        isRevealed={isRevealed}
        onPick={onSelect}
      />
    )
  }

  if (question.type === 'fib') {
    const correct = isCorrect(
      { id: 0, type: question.type, stem: question.stem, options: {}, answer: question.answer },
      selected,
    )
    return (
      <FibInput
        value={selected[0] ?? ''}
        onChange={onFib}
        acceptedAnswers={question.answer}
        isRevealed={isRevealed}
        isCorrect={correct}
      />
    )
  }

  // mcq / sata / calculation / exhibit / priority — option cards
  return (
    <div className="flex flex-col gap-[9px]">
      {entries.map(([key, text]) => (
        <OptionCard
          key={`${question._id}-${key}`}
          letter={key.toUpperCase()}
          text={text}
          isSelected={selected.includes(key)}
          isAnswer={question.answer.includes(key)}
          isRevealed={isRevealed}
          onClick={() => onSelect(key)}
        />
      ))}
    </div>
  )
}

// ── Option card ───────────────────────────────────────────────────────────────

interface OptionCardProps {
  letter: string
  text: string
  isSelected: boolean
  isAnswer: boolean
  isRevealed: boolean
  onClick: () => void
}

const OptionCard = ({ letter, text, isSelected, isAnswer, isRevealed, onClick }: OptionCardProps) => {
  // Resolve the visual state → card / letter / icon styling.
  let cardCls = 'border-white/[0.07] bg-white/[0.03] text-[#a7adbd] hover:-translate-y-0.5 hover:border-[#6aa8ff]/40 hover:bg-[#6aa8ff]/[0.05]'
  let letterCls = 'border-white/[0.07] bg-white/[0.07] text-[#5b6173]'
  let textCls = 'text-[#a7adbd]'
  let anim = ''
  let icon: string | null = null

  if (isSelected && !isRevealed) {
    cardCls = 'border-[#6aa8ff]/55 bg-[#6aa8ff]/[0.07] -translate-y-px'
    letterCls = 'border-[#6aa8ff]/45 bg-[#6aa8ff]/20 text-[#6aa8ff]'
    textCls = 'text-[#f3f5f9]'
  } else if (isRevealed) {
    if (isAnswer) {
      cardCls = 'border-[#6e9cc7]/65 bg-[#6e9cc7]/[0.09] quiz-pop'
      letterCls = 'border-[#6e9cc7]/55 bg-[#6e9cc7]/20 text-[#6e9cc7]'
      textCls = 'text-[#f3f5f9]'
      anim = 'quiz-pop'
      icon = '✓'
    } else if (isSelected) {
      cardCls = 'border-[#ff4858]/45 bg-[#ff4858]/[0.07] quiz-shake'
      letterCls = 'border-[#ff4858]/45 bg-[#ff4858]/20 text-[#ff4858]'
      textCls = 'text-[#f3f5f9]'
      anim = 'quiz-shake'
      icon = '✗'
    } else {
      cardCls = 'border-white/[0.04] bg-transparent opacity-30'
      letterCls = 'border-white/[0.07] bg-white/[0.04] text-[#5b6173]'
      textCls = 'text-[#5b6173]'
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isRevealed}
      className={`quiz-answer-enter ${anim} group flex w-full items-center gap-3 rounded-[12px] border-[1.5px] px-[18px] py-[15px] text-left transition-[border-color,background,transform,box-shadow] duration-200 disabled:cursor-default ${cardCls}`}
    >
      <span
        className={`flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[10px] border font-mono text-[11px] transition-colors ${letterCls}`}
      >
        {isRevealed && icon ? icon : letter}
      </span>
      <span className={`flex-1 text-[14.5px] leading-snug transition-colors ${textCls}`}>{text}</span>
    </button>
  )
}

// ── Ordered sequence builder ──────────────────────────────────────────────────

interface OrderedSequenceProps {
  entries: [string, string][]
  selected: string[]
  answer: string[]
  isRevealed: boolean
  onPick: (key: string) => void
}

const OrderedSequence = ({ entries, selected, answer, isRevealed, onPick }: OrderedSequenceProps) => {
  const byKey = Object.fromEntries(entries) as Record<string, string>
  const available = entries.filter(([k]) => !selected.includes(k))
  const total = entries.length

  // Resolve the correct sequence back to keys for per-step reveal feedback.
  const correctKeys = answer
    .map((value) => entries.find(([, text]) => text === value)?.[0])
    .filter((k): k is string => !!k)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#5b6173]">
          Your order {selected.length > 0 && `(${selected.length}/${total})`}
        </p>
        {selected.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-white/[0.08] px-4 py-3 text-xs text-[#5b6173]">
            Tap options below to build your sequence.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {selected.map((key, i) => {
              const rightPos = isRevealed && correctKeys[i] === key
              const wrongPos = isRevealed && !rightPos
              const cls = !isRevealed
                ? 'border-[#6aa8ff]/45 bg-[#6aa8ff]/[0.07] text-[#f3f5f9]'
                : rightPos
                  ? 'border-[#6e9cc7]/55 bg-[#6e9cc7]/[0.09] text-[#6e9cc7]'
                  : 'border-[#ff4858]/45 bg-[#ff4858]/[0.07] text-[#ff4858]'
              return (
                <button
                  type="button"
                  key={`sel-${key}-${i}`}
                  onClick={() => onPick(key)}
                  disabled={isRevealed}
                  className={`flex w-full items-center gap-3 rounded-[12px] border-[1.5px] px-[18px] py-[13px] text-left transition-all disabled:cursor-default ${cls}`}
                >
                  <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full border border-current/40 font-mono text-[11px]">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm">{byKey[key]}</span>
                  {wrongPos && correctKeys[i] && (
                    <span className="font-mono text-[10px] opacity-70">should be: {byKey[correctKeys[i]]}</span>
                  )}
                  {!isRevealed && <span className="font-mono text-[10px] text-[#5b6173]">remove</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {!isRevealed && available.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#5b6173]">Available</p>
          <div className="flex flex-col gap-2">
            {available.map(([key, text]) => (
              <button
                type="button"
                key={`av-${key}`}
                onClick={() => onPick(key)}
                className="flex w-full items-center gap-3 rounded-[12px] border-[1.5px] border-white/[0.07] bg-white/[0.03] px-[18px] py-[13px] text-left text-[#a7adbd] transition-all hover:border-[#6aa8ff]/40 hover:bg-[#6aa8ff]/[0.05]"
              >
                <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[10px] border border-white/10 font-mono text-[11px]">
                  +
                </span>
                <span className="flex-1 text-sm">{text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Fill-in-the-blank input ───────────────────────────────────────────────────

interface FibInputProps {
  value: string
  onChange: (next: string) => void
  acceptedAnswers: string[]
  isRevealed: boolean
  isCorrect: boolean
}

const FibInput = ({ value, onChange, acceptedAnswers, isRevealed, isCorrect }: FibInputProps) => {
  const borderCls = !isRevealed
    ? 'border-white/[0.08] focus-within:border-[#6aa8ff]/50'
    : isCorrect
      ? 'border-[#6e9cc7]/55 bg-[#6e9cc7]/[0.06]'
      : 'border-[#ff4858]/50 bg-[#ff4858]/[0.06]'

  return (
    <div className="flex flex-col gap-2">
      <div className={`rounded-[12px] border-[1.5px] bg-white/[0.03] transition-colors ${borderCls}`}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isRevealed}
          placeholder="Type your answer"
          autoFocus
          className="w-full bg-transparent px-4 py-3 text-sm text-[#f3f5f9] outline-none placeholder:text-[#5b6173] disabled:cursor-default"
        />
      </div>
      {isRevealed && !isCorrect && (
        <p className="text-xs text-[#a7adbd]">
          Accepted answer{acceptedAnswers.length > 1 ? 's' : ''}:{' '}
          <span className="text-[#6e9cc7]">{acceptedAnswers.join(', ')}</span>
        </p>
      )}
    </div>
  )
}
