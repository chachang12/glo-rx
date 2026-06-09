import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import {
  useListAdminExams,
  useListCorpusVersions,
  useListExamTopics,
  useGenerateBatch,
  usePromoteQuestions,
  type GenerateBatchResult,
} from '@/features/learn/admin'

type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed'

export const AdminGeneration = () => {
  const { data: exams = [], isLoading: examsLoading } = useListAdminExams()
  const [examCode, setExamCode] = useState<string | null>(null)
  const activeExam = examCode ?? exams[0]?.code ?? null

  const { data: versions = [], isLoading: versionsLoading } = useListCorpusVersions(
    activeExam ?? undefined
  )
  const { data: topics = [], isLoading: topicsLoading } = useListExamTopics(
    activeExam ?? undefined
  )

  const [corpusVersion, setCorpusVersion] = useState<string>('')
  const [topicLabel, setTopicLabel] = useState<string>('')
  const [count, setCount] = useState<number>(5)
  const [difficulty, setDifficulty] = useState<Difficulty>('mixed')
  const [customInstructions, setCustomInstructions] = useState<string>('')

  const effectiveCorpusVersion = corpusVersion || versions[0]?.version || ''
  const effectiveTopicLabel = topicLabel || topics[0] || ''

  const generateMutation = useGenerateBatch()
  const promoteMutation = usePromoteQuestions()

  const [lastResult, setLastResult] = useState<GenerateBatchResult | null>(null)

  const canGenerate = useMemo(() => {
    return (
      !!activeExam &&
      !!effectiveCorpusVersion &&
      !!effectiveTopicLabel &&
      !generateMutation.isPending
    )
  }, [activeExam, effectiveCorpusVersion, effectiveTopicLabel, generateMutation.isPending])

  if (examsLoading) return <PageLoader />

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <Link to={paths.app.admin.getHref()} className="hover:text-[#888]">
              Admin
            </Link>
            <span>/</span>
            <span className="text-[#888]">Generation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
            Official Question Generation
          </h1>
          <p className="text-xs text-[#555]">
            Generate draft questions from a loaded corpus version against a chosen topic. Drafts
            are <strong className="text-[#bbb]">not</strong> served to users — promote to the
            review queue to advance them.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {exams.map((exam) => (
            <button
              key={exam._id}
              onClick={() => {
                setExamCode(exam.code)
                setCorpusVersion('')
                setTopicLabel('')
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeExam === exam.code
                  ? 'bg-[#4f8ef7]/10 text-[#4f8ef7]'
                  : 'text-[#555] hover:text-[#888] bg-white/[0.02]'
              }`}
            >
              {exam.label}
            </button>
          ))}
        </div>

        {activeExam && (
          <div className="space-y-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6">
            <Row label="Corpus version">
              {versionsLoading ? (
                <span className="text-xs text-[#555]">Loading…</span>
              ) : versions.length === 0 ? (
                <span className="text-xs text-[#ef4444]">
                  No corpus loaded — go to Corpus and reload first.
                </span>
              ) : (
                <select
                  value={effectiveCorpusVersion}
                  onChange={(e) => setCorpusVersion(e.target.value)}
                  className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-[#ddd] min-w-[200px]"
                >
                  {versions.map((v) => (
                    <option key={v._id} value={v.version}>
                      {v.version} ({v.files.length} files)
                    </option>
                  ))}
                </select>
              )}
            </Row>

            <Row label="Topic">
              {topicsLoading ? (
                <span className="text-xs text-[#555]">Loading…</span>
              ) : topics.length === 0 ? (
                <span className="text-xs text-[#ef4444]">
                  No topics defined on this exam. Seed Exam.topics first.
                </span>
              ) : (
                <select
                  value={effectiveTopicLabel}
                  onChange={(e) => setTopicLabel(e.target.value)}
                  className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-[#ddd] min-w-[320px]"
                >
                  {topics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </Row>

            <Row label="Count">
              <input
                type="number"
                min={1}
                max={25}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(25, Number(e.target.value) || 1)))}
                className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-[#ddd] w-24"
              />
              <span className="text-[10px] text-[#555] ml-2">1–25</span>
            </Row>

            <Row label="Difficulty">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-[#ddd]"
              >
                <option value="mixed">Mixed</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </Row>

            <Row label="Custom instructions">
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={2}
                placeholder="Optional — extra guidance for this batch only."
                className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-[#ddd] flex-1 max-w-2xl"
              />
            </Row>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={async () => {
                  if (!activeExam) return
                  try {
                    setLastResult(null)
                    const result = await generateMutation.mutateAsync({
                      examCode: activeExam,
                      input: {
                        corpusVersion: effectiveCorpusVersion,
                        topicLabel: effectiveTopicLabel,
                        count,
                        difficulty,
                        customInstructions: customInstructions.trim() || undefined,
                      },
                    })
                    setLastResult(result)
                  } catch (err) {
                    alert(`Generation failed: ${(err as Error).message}`)
                  }
                }}
                disabled={!canGenerate}
                className="px-4 py-2 rounded-md bg-[#4f8ef7] text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generateMutation.isPending ? 'Generating…' : 'Generate'}
              </button>
              <span className="text-[10px] text-[#555]">
                Drafts land in the question bank with <code>status: draft</code>.
              </span>
            </div>
          </div>
        )}

        {lastResult && (
          <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#bbb]">
                Last batch — {lastResult.generatedCount} draft(s)
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[#555]">
                  Attempted {lastResult.attempted}, dropped {lastResult.droppedCount}
                </span>
                <button
                  onClick={async () => {
                    if (lastResult.questionIds.length === 0) return
                    try {
                      const r = await promoteMutation.mutateAsync(lastResult.questionIds)
                      alert(`Promoted ${r.promoted} of ${r.matched} matched drafts to pending.`)
                      setLastResult(null)
                    } catch (err) {
                      alert(`Promote failed: ${(err as Error).message}`)
                    }
                  }}
                  disabled={promoteMutation.isPending || lastResult.questionIds.length === 0}
                  className="px-3 py-1.5 rounded-md bg-[#10b981]/10 text-[#10b981] text-xs font-semibold disabled:opacity-50"
                >
                  {promoteMutation.isPending ? 'Promoting…' : 'Promote all to review queue'}
                </button>
              </div>
            </div>
            <div className="text-xs text-[#555] font-mono space-y-0.5">
              {lastResult.questionIds.map((id) => (
                <div key={id}>{id}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-4">
    <span className="text-xs font-semibold text-[#888] w-40 flex-shrink-0">{label}</span>
    <div className="flex-1 flex items-center">{children}</div>
  </div>
)
