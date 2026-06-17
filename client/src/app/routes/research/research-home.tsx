import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import { useListResearcherExams } from '@/features/shared/researcher'

export const ResearchHome = () => {
  const { data: exams = [], isLoading } = useListResearcherExams()

  if (isLoading) return <PageLoader />

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#555]">
            Research
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">Exams</h1>
          <p className="text-xs text-[#555]">
            Pick an exam to view its topics and upload reference material.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
          {exams.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#555]">
              No exams available.
            </div>
          ) : (
            exams.map((exam, i) => (
              <Link
                key={exam._id}
                to={paths.app.researchExamTopics.getHref(exam.code)}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-all ${
                  i > 0 ? 'border-t border-white/[0.04]' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#e8e6f0]">{exam.label}</p>
                  <p className="text-xs text-[#555] mt-0.5">
                    {exam.category} — {exam.topics.length} topic{exam.topics.length === 1 ? '' : 's'}
                  </p>
                </div>
                <span className="text-xs text-[#555]">&rarr;</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
