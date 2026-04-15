import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'

interface SharedPlanData {
  examName: string
  examDate: string | null
  topicCount: number
  topics: string[]
  documentCount: number
}

export const SharedPlan = () => {
  const { shareCode } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<SharedPlanData | null>(null)
  const [ready, setReady] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shareCode) return

    apiFetch(`/api/custom-plans/shared/${shareCode}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null }
        return r.json()
      })
      .then((data) => { if (data) setPlan(data) })
      .catch(() => setNotFound(true))
      .finally(() => setReady(true))
  }, [shareCode])

  const handleClone = async () => {
    if (!shareCode) return

    setCloning(true)
    setError(null)

    try {
      const res = await apiFetch(`/api/custom-plans/shared/${shareCode}/clone`, {
        method: 'POST',
      })

      if (res.status === 403) {
        setError('Custom plans require an active license. Upgrade to access this feature.')
        return
      }

      if (res.status === 409) {
        setError('You already have a plan with this name.')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to add plan')
        return
      }

      const newPlan = await res.json()
      navigate(paths.app.customPlanDetail.getHref(newPlan._id))
    } catch {
      setError('Something went wrong')
    } finally {
      setCloning(false)
    }
  }

  if (!ready) return <PageLoader />

  if (notFound || !plan) {
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
