import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { paths } from '@/config/paths'
import {
  useGetSharedPlan,
  useCloneSharedPlan,
} from '@/features/learn/custom-plans'
import { ApiError } from '@/lib/api/client'
import { PageLoader } from '@/features/shared/ui/PageLoader'

export const SharedPlan = () => {
  const { shareCode } = useParams()
  const navigate = useNavigate()
  const { data: plan, isLoading, isError } = useGetSharedPlan(shareCode)
  const cloneMutation = useCloneSharedPlan()
  const [error, setError] = useState<string | null>(null)
  const cloning = cloneMutation.isPending

  const handleClone = async () => {
    if (!shareCode) return
    setError(null)
    try {
      const newPlan = await cloneMutation.mutateAsync(shareCode)
      navigate(paths.app.customPlanDetail.getHref(newPlan._id))
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError('Custom plans require an active license. Upgrade to access this feature.')
        } else if (err.status === 409) {
          setError('You already have a plan with this name.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Something went wrong')
      }
    }
  }

  if (isLoading) return <PageLoader />

  if (isError || !plan) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center space-y-4 py-16">
          <p className="text-sm text-[#888]">This shared plan doesn't exist or is no longer available.</p>
          <Link to={paths.app.plans.getHref()} className="text-xs text-[#4f8ef7] hover:underline">
            Back to plans
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#555]">
          <Link to={paths.app.plans.getHref()} className="hover:text-[#888] transition-colors">
            Plans
          </Link>
          <span>/</span>
          <span className="text-[#888]">Shared Plan</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#4f8ef7]/20 bg-[#4f8ef7]/5 p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#4f8ef7]">
                Shared Plan
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#e8e6f0]">{plan.examName}</h1>
            {plan.examDate && (
              <p className="text-xs text-[#555]">
                Exam date: {new Date(plan.examDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-center">
              <p className="text-lg font-bold text-[#e8e6f0]">{plan.topicCount}</p>
              <p className="text-[10px] text-[#555]">Topics</p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-center">
              <p className="text-lg font-bold text-[#e8e6f0]">{plan.documentCount}</p>
              <p className="text-[10px] text-[#555]">Documents</p>
            </div>
          </div>

          {/* Topics list */}
          {plan.topics.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#bbb]">Topics included</p>
              <div className="flex flex-wrap gap-2">
                {plan.topics.map((topic) => (
                  <span
                    key={topic}
                    className="px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-[#ddd]"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-[#ef4444]">{error}</p>
          )}

          {/* Action */}
          <button
            onClick={handleClone}
            disabled={cloning}
            className="w-full py-3 rounded-2xl bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cloning ? 'Adding...' : 'Add to My Plans'}
          </button>
        </div>
      </div>
    </div>
  )
}
