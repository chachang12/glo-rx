import { Link, useParams } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import { useListResearcherExams } from '@/features/shared/researcher'

export const ResearchExamTopics = () => {
  const { code } = useParams()
  const { data: exams = [], isLoading } = useListResearcherExams()
  const exam = exams.find((e) => e.code === code) ?? null

  if (isLoading) return <PageLoader />

  if (!exam) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center space-y-4 py-16">
          <p className="text-sm text-[#888]">Exam not found</p>
          <Link to={paths.app.research.getHref()} className="text-xs text-[#4f8ef7] hover:underline">
            Back to exams
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <Link to={paths.app.research.getHref()} className="hover:text-[#888]">
              Research
            </Link>
            <span>/</span>
            <span className="text-[#888]">{exam.label}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">Topics</h1>
          <p className="text-xs text-[#555]">
            {exam.topics.length} topic{exam.topics.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 space-y-3">
          {exam.topics.length === 0 ? (
            <p className="text-xs text-[#555]">
              No topics yet. Ask an admin to add topics for this exam before uploading reference material.
            </p>
          ) : (
            exam.topics.map((topic, i) => (
              <div
                key={`${topic}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2"
              >
                <span className="text-sm text-[#ddd]">{topic}</span>
                <button
                  type="button"
                  disabled
                  title="Upload not yet wired — coming soon"
                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[10px] font-semibold text-[#555] cursor-not-allowed"
                >
                  Upload reference
                </button>
              </div>
            ))
          )}
        </div>

        <p className="text-[10px] text-[#555] text-center">
          The upload control will accept a markdown reference per topic. Researchers will own
          this content — admins manage the topic list itself.
        </p>
      </div>
    </div>
  )
}
