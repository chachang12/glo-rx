import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import {
  useDeleteAdminQuestion,
  useGetAdminExam,
  useListExamQuestionsPaged,
  type QuestionFilters,
} from '@/features/learn/admin'

type DifficultyFilter = 'any' | 'easy' | 'medium' | 'hard'
type FlaggedFilter = 'any' | 'flagged' | 'clean'

export const AdminExamQuestions = () => {
  const { code } = useParams()
  const { data: exam, isLoading: examLoading, isError: examError } = useGetAdminExam(code)

  const [rawSearch, setRawSearch] = useState('')
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('any')
  const [topic, setTopic] = useState<string>('')
  const [flagged, setFlagged] = useState<FlaggedFilter>('any')

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(rawSearch.trim()), 250)
    return () => window.clearTimeout(id)
  }, [rawSearch])

  const filters = useMemo<QuestionFilters>(
    () => ({
      q: search || undefined,
      difficulty: difficulty === 'any' ? undefined : difficulty,
      topic: topic || undefined,
      flagged: flagged === 'any' ? undefined : flagged,
    }),
    [search, difficulty, topic, flagged]
  )

  const {
    data,
    isLoading: questionsLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListExamQuestionsPaged(code, filters)

  const deleteQuestion = useDeleteAdminQuestion()

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data])
  const total = data?.pages[0]?.total ?? 0
  const filtersActive = !!filters.q || !!filters.difficulty || !!filters.topic || !!filters.flagged

  const resetFilters = () => {
    setRawSearch('')
    setSearch('')
    setDifficulty('any')
    setTopic('')
    setFlagged('any')
  }

  if (examLoading) return <PageLoader />

  if (examError || !exam) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center space-y-4 py-16">
          <p className="text-sm text-[#888]">Exam not found</p>
          <Link to={paths.app.admin.getHref()} className="text-xs text-[#4f8ef7] hover:underline">
            Back to admin
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <Link to={paths.app.admin.getHref()} className="hover:text-[#888]">
              Admin
            </Link>
            <span>/</span>
            <Link to={paths.app.adminExam.getHref(exam.code)} className="hover:text-[#888]">
              {exam.label}
            </Link>
            <span>/</span>
            <span className="text-[#888]">Questions</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">Question bank</h1>
          <p className="text-xs text-[#555]">
            {questionsLoading
              ? 'Loading…'
              : filtersActive
                ? `${total.toLocaleString()} matching · ${items.length.toLocaleString()} loaded`
                : `${total.toLocaleString()} total · ${items.length.toLocaleString()} loaded`}
          </p>
        </div>

        <div className="sticky top-0 z-10 -mx-2 px-2 py-3 backdrop-blur-md bg-[#0a0a0f]/70 border-b border-white/[0.04]">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              placeholder="Search stem…"
              className="flex-1 min-w-[200px] bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-[#ddd] placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40"
            />

            <div className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.02] p-0.5">
              {(['any', 'easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wide font-semibold transition-colors ${
                    difficulty === d ? 'bg-white/[0.08] text-[#ddd]' : 'text-[#666] hover:text-[#999]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-1.5 text-xs text-[#ddd] max-w-[180px]"
            >
              <option value="">All topics</option>
              {exam.topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={flagged}
              onChange={(e) => setFlagged(e.target.value as FlaggedFilter)}
              className="bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-1.5 text-xs text-[#ddd]"
            >
              <option value="any">Any status</option>
              <option value="flagged">Flagged only</option>
              <option value="clean">Clean only</option>
            </select>

            {filtersActive && (
              <button
                onClick={resetFilters}
                className="text-[10px] text-[#888] hover:text-[#ddd] hover:underline ml-auto"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
          {questionsLoading && items.length === 0 && (
            <div className="px-4 py-12 text-center text-xs text-[#555]">Loading…</div>
          )}
          {!questionsLoading && items.length === 0 && (
            <div className="px-4 py-12 text-center text-xs text-[#555]">
              {filtersActive ? 'No questions match these filters.' : 'No questions yet.'}
            </div>
          )}
          {items.map((q) => (
            <div key={q._id} className="px-4 py-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#ddd] line-clamp-2">{q.stem}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wide text-[#666]">{q.type}</span>
                  {q.difficulty && (
                    <span
                      className={`text-[10px] uppercase tracking-wide font-semibold ${
                        q.difficulty === 'easy'
                          ? 'text-[#10b981]'
                          : q.difficulty === 'medium'
                            ? 'text-[#eab308]'
                            : 'text-[#ef4444]'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  )}
                  {(q.reportCount ?? 0) > 0 && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-[#ef4444]">
                      {q.reportCount} flag{q.reportCount === 1 ? '' : 's'}
                    </span>
                  )}
                  {q.topics.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] text-[#4f8ef7] bg-[#4f8ef7]/10 px-1.5 py-0.5 rounded"
                    >
                      {t}
                    </span>
                  ))}
                  {q.topics.length > 4 && (
                    <span className="text-[10px] text-[#555]">+{q.topics.length - 4}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Delete this question? This cannot be undone.')) {
                    deleteQuestion.mutate(q._id)
                  }
                }}
                className="text-[10px] text-[#ef4444] hover:underline flex-shrink-0 pt-0.5"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {hasNextPage && (
          <div className="flex justify-center">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-4 py-2 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs text-[#ddd] hover:bg-white/[0.06] disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}

        {!hasNextPage && items.length > 0 && (
          <p className="text-[10px] text-[#555] text-center">End of results.</p>
        )}

        {isFetching && !isFetchingNextPage && items.length > 0 && (
          <p className="text-[10px] text-[#555] text-center">Refreshing…</p>
        )}
      </div>
    </div>
  )
}
