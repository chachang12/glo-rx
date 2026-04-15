import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'

export const CustomPlanCreate = () => {
  const navigate = useNavigate()
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [dailyGoal, setDailyGoal] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!examName.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await apiFetch('/api/custom-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examName: examName.trim(),
          examDate: examDate || null,
          dailyGoal: dailyGoal ? parseInt(dailyGoal) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to create plan')
        return
      }

      const plan = await res.json()
      navigate(paths.app.customPlanSetup.getHref(plan._id))
    } catch {
      setError('Something went wrong')
    } finally {
      setSubmitting(false)
    }
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
          <span className="text-[#888]">New Custom Plan</span>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
            Create Custom Plan
          </h1>
          <p className="text-sm text-[#888]">
            Set up a study plan for any exam. You'll upload your materials next.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Exam name */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#bbb]">
              Exam Name
            </label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="e.g., NUR 301 Midterm"
              required
              className="w-full px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-sm text-[#ddd] placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40"
            />
          </div>

          {/* Exam date */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#bbb]">
              Exam Date <span className="text-[#555] font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-sm text-[#ddd] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40 [color-scheme:dark]"
            />
          </div>

          {/* Daily goal */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#bbb]">
              Daily Goal <span className="text-[#555] font-normal">(questions per day, optional)</span>
            </label>
            <input
              type="number"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(e.target.value)}
              placeholder="e.g., 20"
              min="1"
              className="w-full px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-sm text-[#ddd] placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-[#ef4444]">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !examName.trim()}
            className="w-full py-3 rounded-2xl bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Continue to Upload Materials'}
          </button>
        </form>
      </div>
    </div>
  )
}
