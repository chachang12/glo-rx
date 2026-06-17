import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import {
  useGetContributorMe,
  useGetContributorQueue,
  useSubmitReview,
  useSkipQuestion,
  type QueueItem,
} from '@/features/learn/contribute'

type Toast = { kind: 'info' | 'warn' | 'success'; text: string } | null

export const ContributorQueue = () => {
  const { data: me, isLoading: meLoading } = useGetContributorMe()
  const [examCode, setExamCode] = useState<string | null>(null)
  const activeExam = examCode ?? me?.scopes[0]?.examCode ?? undefined

  const { data: queue, isLoading: queueLoading } = useGetContributorQueue(activeExam, 5)
  const submit = useSubmitReview()
  const skip = useSkipQuestion()

  const current: QueueItem | undefined = queue?.items[0]
  const [comment, setComment] = useState('')
  const [toast, setToast] = useState<Toast>(null)
  const dwellStartRef = useRef<number>(Date.now())

  // Reset dwell + comment whenever the current question changes.
  useEffect(() => {
    dwellStartRef.current = Date.now()
    setComment('')
    setToast(null)
  }, [current?._id])

  const minDwellMs = me?.minDwellMs ?? 5000
  // Admins reach the queue via admin bypass with dailyCap=0; the cap concept
  // doesn't apply to them, so don't surface the cap-reached banner.
  const capReached =
    me?.role !== 'admin' && (me?.remainingToday ?? Infinity) <= 0

  const handleVote = async (vote: 'approve' | 'reject') => {
    if (!current) return
    if (submit.isPending || skip.isPending) return
    if (vote === 'reject' && !comment.trim()) {
      setToast({ kind: 'warn', text: 'A comment is required when rejecting.' })
      return
    }
    const dwellMs = Date.now() - dwellStartRef.current
    try {
      const result = await submit.mutateAsync({
        questionId: current._id,
        vote,
        comment: vote === 'reject' ? comment.trim() : (comment.trim() || null),
        dwellMs,
      })
      if (result.notBillableReason === 'below-dwell') {
        setToast({
          kind: 'warn',
          text: 'Vote recorded but not billable — you spent less than 5s on this question.',
        })
      } else if (result.notBillableReason === 'over-cap') {
        setToast({ kind: 'warn', text: 'Daily cap reached. Vote recorded but not billable.' })
      } else if (result.notBillableReason === 'duplicate') {
        setToast({ kind: 'warn', text: 'You already voted on this question.' })
      } else {
        setToast({
          kind: 'success',
          text:
            result.questionStatus === 'pending'
              ? 'Vote counted.'
              : `Question ${result.questionStatus} by consensus.`,
        })
      }
    } catch (err) {
      setToast({ kind: 'warn', text: (err as Error).message })
    }
  }

  const handleSkip = async () => {
    if (!current || skip.isPending) return
    try {
      await skip.mutateAsync(current._id)
      setToast({ kind: 'info', text: 'Skipped.' })
    } catch (err) {
      setToast({ kind: 'warn', text: (err as Error).message })
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase()
      if (tag === 'textarea' || tag === 'input') return
      if (e.key === 'a' || e.key === 'A') void handleVote('approve')
      if (e.key === 'r' || e.key === 'R') void handleVote('reject')
      if (e.key === 's' || e.key === 'S') void handleSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // Re-subscribe whenever any value the handlers close over changes, so the
    // in-flight guards (submit.isPending / skip.isPending) stay current and
    // rapid keypresses can't double-submit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?._id, comment, submit.isPending, skip.isPending])

  const scopeOptions = useMemo(() => me?.scopes ?? [], [me])

  if (meLoading) return <PageLoader />
  if (!me) return null

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">Review Queue</h1>
            <nav className="flex items-center gap-3 text-xs text-[#888]">
              <Link to={paths.app.contribute.earnings.getHref()} className="hover:text-[#bbb]">
                Earnings
              </Link>
              <Link to={paths.app.contribute.me.getHref()} className="hover:text-[#bbb]">
                Profile
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#555]">
            <span>
              Today: <span className="text-[#bbb] tabular-nums">{me.billableToday}</span>
              {' / '}
              <span className="text-[#bbb] tabular-nums">{me.dailyCap}</span> billable
            </span>
            <span>·</span>
            <span>Reliability {(me.reliabilityScore * 100).toFixed(0)}%</span>
            {scopeOptions.length > 1 && (
              <>
                <span>·</span>
                <select
                  value={activeExam ?? ''}
                  onChange={(e) => setExamCode(e.target.value || null)}
                  className="bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-1 text-xs text-[#ddd]"
                >
                  {scopeOptions.map((s) => (
                    <option key={s.examCode} value={s.examCode}>
                      {s.examCode}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </header>

        {capReached && (
          <div className="rounded-lg border border-[#facc15]/30 bg-[#facc15]/10 px-4 py-3 text-xs text-[#facc15]">
            Daily cap reached. Votes are still recorded but won&apos;t be billable until the cap resets.
          </div>
        )}

        {queueLoading ? (
          <p className="text-xs text-[#555]">Loading…</p>
        ) : !current ? (
          <div className="rounded-lg border border-dashed border-white/[0.06] bg-white/[0.02] p-10 text-center">
            <p className="text-sm text-[#888]">No questions in queue.</p>
            <p className="text-xs text-[#555] mt-1">
              Check back later — drafts are promoted to review by admins.
            </p>
          </div>
        ) : (
          <article className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-[#555]">
              <span>{current.examCode}</span>
              {current.topics.length > 0 && <span>· {current.topics.join(' / ')}</span>}
              {current.difficulty && <span>· {current.difficulty}</span>}
              <span className="ml-auto text-[#555]">
                {(queue?.remaining ?? 0)} remaining
              </span>
            </div>

            <p className="text-sm text-[#e8e6f0] leading-relaxed whitespace-pre-wrap">{current.stem}</p>

            <OptionsBlock
              options={current.options as Record<string, string> | string[]}
              answer={current.answer}
            />

            {current.explanation && (
              <div className="rounded-md bg-white/[0.02] p-4 text-xs text-[#aaa] leading-relaxed">
                <span className="block text-[10px] uppercase tracking-wide text-[#555] mb-1">
                  Explanation
                </span>
                <p className="whitespace-pre-wrap">{current.explanation}</p>
              </div>
            )}

            {current.sourceCitations.length > 0 && (
              <details className="text-xs text-[#888]">
                <summary className="cursor-pointer">
                  Citations ({current.sourceCitations.length})
                </summary>
                <ul className="mt-2 space-y-1 text-[10px] text-[#666] font-mono">
                  {current.sourceCitations.map((cit, i) => (
                    <li key={i}>
                      {cit.filePath ?? cit.documentId ?? 'unknown'} · chunk {cit.chunkIndex}
                      {cit.excerpt && (
                        <div className="mt-1 italic text-[#888]">&ldquo;{cit.excerpt}&rdquo;</div>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comment — required when rejecting, optional when approving"
              rows={2}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-2 text-xs text-[#ddd] resize-none"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVote('approve')}
                disabled={submit.isPending || skip.isPending}
                className="px-4 py-2 rounded-md bg-[#10b981]/15 text-[#10b981] text-xs font-semibold disabled:opacity-50"
              >
                Approve <span className="opacity-50">(A)</span>
              </button>
              <button
                onClick={() => handleVote('reject')}
                disabled={submit.isPending || skip.isPending}
                className="px-4 py-2 rounded-md bg-[#ef4444]/15 text-[#ef4444] text-xs font-semibold disabled:opacity-50"
              >
                Reject <span className="opacity-50">(R)</span>
              </button>
              <button
                onClick={handleSkip}
                disabled={submit.isPending || skip.isPending}
                className="px-4 py-2 rounded-md bg-white/[0.04] text-[#888] text-xs font-semibold disabled:opacity-50"
              >
                Skip <span className="opacity-50">(S)</span>
              </button>
              <span className="ml-auto text-[10px] text-[#555]">
                Minimum dwell: {Math.round(minDwellMs / 1000)}s
              </span>
            </div>

            {toast && (
              <div
                className={`text-xs rounded-md px-3 py-2 ${
                  toast.kind === 'success'
                    ? 'bg-[#10b981]/10 text-[#10b981]'
                    : toast.kind === 'warn'
                      ? 'bg-[#facc15]/10 text-[#facc15]'
                      : 'bg-white/[0.04] text-[#888]'
                }`}
              >
                {toast.text}
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  )
}

const OptionsBlock = ({
  options,
  answer,
}: {
  options: Record<string, string> | string[]
  answer: string[]
}) => {
  const entries: Array<[string, string]> = Array.isArray(options)
    ? options.map((v, i) => [String.fromCharCode(65 + i), v])
    : Object.entries(options)

  const correct = new Set(answer)

  return (
    <ul className="space-y-1.5">
      {entries.map(([key, val]) => {
        const isCorrect = correct.has(key)
        return (
          <li
            key={key}
            className={`rounded-md px-3 py-2 text-xs flex gap-2 ${
              isCorrect
                ? 'bg-[#10b981]/10 text-[#10b981]'
                : 'bg-white/[0.02] text-[#bbb]'
            }`}
          >
            <span className="font-mono w-5 flex-shrink-0">{key}.</span>
            <span>{val}</span>
            {isCorrect && (
              <span className="ml-auto text-[10px] uppercase tracking-wide opacity-60">answer</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
