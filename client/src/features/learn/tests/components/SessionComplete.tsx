import type { SessionResults, TopicBreakdown } from '../types/session'

interface SessionCompleteProps {
  results: SessionResults
  bestStreak: number
  topics: TopicBreakdown
  onRestart: () => void
  onExit: () => void
}

/** End-of-session screen. XP omitted; every figure is derived from the run. */
export const SessionComplete = ({ results, bestStreak, topics, onRestart, onExit }: SessionCompleteProps) => {
  const accuracy = results.totalQuestions > 0
    ? Math.round((results.correctCount / results.totalQuestions) * 100)
    : 0
  const avgSec = results.answers.length > 0
    ? Math.round(results.answers.reduce((sum, a) => sum + a.timeMs, 0) / results.answers.length / 1000)
    : 0

  const title = accuracy >= 85 ? 'Excellent session.' : accuracy >= 65 ? 'Good effort.' : 'Keep at it.'

  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center px-6 py-8 text-center">
      <div className="quiz-ring quiz-bloom relative mb-[22px] flex h-20 w-20 items-center justify-center rounded-full border border-[#6e9cc7]/20 bg-[#6e9cc7]/10 text-4xl">
        ✦
      </div>

      <div className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#6e9cc7]">
        Session Complete
      </div>
      <div className="mb-2 text-[28px] font-medium tracking-tight text-[#f3f5f9]">{title}</div>
      <div className="mb-8 text-[14.5px] text-[#a7adbd]">
        {results.correctCount} of {results.totalQuestions} correct
      </div>

      <div className="mb-7 grid w-full max-w-[380px] grid-cols-3 gap-2.5">
        <Stat value={`${accuracy}%`} label="Accuracy" />
        <Stat value={String(bestStreak)} label="Best streak" />
        <Stat value={`${avgSec}s`} label="Avg / Q" />
      </div>

      {(topics.weak.length > 0 || topics.strong.length > 0) && (
        <div className="mb-6 flex max-w-[380px] flex-wrap justify-center gap-[7px]">
          {topics.weak.map((t) => (
            <span
              key={`w-${t}`}
              className="rounded-full border border-[#ff4858]/20 bg-[#ff4858]/[0.08] px-3 py-1 text-xs text-[#ff4858]"
            >
              Review: {t}
            </span>
          ))}
          {topics.strong.map((t) => (
            <span
              key={`s-${t}`}
              className="rounded-full border border-[#6e9cc7]/20 bg-[#6e9cc7]/[0.08] px-3 py-1 text-xs text-[#6e9cc7]"
            >
              Strong: {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex w-full max-w-[380px] flex-col gap-[9px]">
        <button
          onClick={onRestart}
          className="w-full rounded-[12px] bg-[#f3f5f9] py-3.5 text-[14.5px] font-medium text-[#06070b] transition-all hover:-translate-y-0.5"
        >
          Start another session
        </button>
        <button
          onClick={onExit}
          className="w-full rounded-[12px] border border-white/[0.13] bg-white/[0.04] py-3 text-sm font-medium text-[#a7adbd] transition-colors hover:bg-white/[0.07] hover:text-[#f3f5f9]"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  )
}

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.04] px-2.5 py-4 text-center">
    <div className="font-mono text-[22px] font-medium tracking-tight text-[#f3f5f9]">{value}</div>
    <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#5b6173]">{label}</div>
  </div>
)
