import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'

interface PlanData {
  _id: string
  examCode: string
  examName: string
  examDate: string | null
  dailyGoal: number | null
  status: string
}

export const CustomPlanSettings = () => {
  const { planId } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [ready, setReady] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!planId) return
    apiFetch('/api/plans')
      .then((r) => r.json())
      .then((plans: PlanData[]) => {
        const found = plans.find((p) => p._id === planId)
        if (found) setPlan(found)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setReady(true))
  }, [planId])

  const patchPlan = async (updates: Record<string, unknown>) => {
    if (!plan) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/plans/${plan.examCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updated = await res.json()
        setPlan((prev) => prev ? { ...prev, ...updated } : prev)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRemovePlan = async () => {
    if (!plan) return
    await apiFetch(`/api/plans/${plan.examCode}`, { method: 'DELETE' })
    navigate(paths.app.plans.getHref())
  }

  if (!ready) return <PageLoader />

  if (notFound || !plan) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold text-[#e8e6f0]">Plan not found</h1>
          <Link to={paths.app.plans.getHref()} className="text-sm text-[#4f8ef7] hover:underline">
            &larr; Back to plans
          </Link>
        </div>
      </div>
    )
  }

  const examDateValue = plan.examDate
    ? new Date(plan.examDate).toISOString().slice(0, 10)
    : ''

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#555]">
          <Link to={paths.app.plans.getHref()} className="hover:text-[#888] transition-colors">Plans</Link>
          <span>/</span>
          <Link to={paths.app.customPlanDetail.getHref(planId!)} className="hover:text-[#888] transition-colors">{plan.examName}</Link>
          <span>/</span>
          <span className="text-[#888]">Settings</span>
        </div>

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
            Settings
          </h1>
          <p className="text-sm text-[#888]">
            Manage your study plan for {plan.examName}
          </p>
        </div>

        {/* Schedule */}
        <Section title="Schedule">
          <div className="space-y-3">
            <SettingRow
              label="Exam date"
              description="Set your target exam date to generate a study timeline"
              action={
                <input
                  type="date"
                  value={examDateValue}
                  onChange={(e) => patchPlan({ examDate: e.target.value || null })}
                  className="px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-[#ddd] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40 [color-scheme:dark]"
                />
              }
            />
            <div className="border-t border-white/[0.06]" />
            <SettingRow
              label="Daily goal"
              description="Number of practice questions per day"
              action={
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={plan.dailyGoal ?? ''}
                  placeholder="10"
                  onChange={(e) => patchPlan({ dailyGoal: e.target.value ? Number(e.target.value) : null })}
                  className="w-20 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-[#ddd] text-center focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40"
                />
              }
            />
            <div className="border-t border-white/[0.06]" />
            <SettingRow
              label="Study reminders"
              description="Get daily reminders to stay on track"
              action={
                <button disabled className="px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-[#555] cursor-not-allowed">
                  Coming soon
                </button>
              }
            />
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <SettingRow
            label="Progress reports"
            description="Weekly email summary of your study progress"
            action={
              <button disabled className="px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-[#555] cursor-not-allowed">
                Coming soon
              </button>
            }
          />
        </Section>

        {/* Danger Zone */}
        <Section title="Danger zone">
          <div className="space-y-3">
            <SettingRow
              label="Reset progress"
              description="Clear all mastery scores and question history for this plan"
              action={
                <button disabled className="px-4 py-2 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 text-xs font-semibold text-[#555] cursor-not-allowed">
                  Coming soon
                </button>
              }
            />
            <div className="border-t border-white/[0.06]" />
            <SettingRow
              label="Remove plan"
              description={`Remove "${plan.examName}" and delete all associated data`}
              action={
                !showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 text-xs font-semibold text-[#ef4444] hover:border-[#ef4444]/60 transition-all"
                  >
                    Remove
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-[#888] hover:text-[#ddd] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRemovePlan}
                      className="px-3 py-2 rounded-lg bg-[#ef4444] text-xs font-semibold text-white hover:bg-[#ef4444]/90 transition-all"
                    >
                      Confirm remove
                    </button>
                  </div>
                )
              }
            />
          </div>
        </Section>

        {saving && (
          <p className="text-xs text-[#888] text-center">Saving...</p>
        )}
      </div>
    </div>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <h2 className="text-sm font-semibold text-[#bbb]">{title}</h2>
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
      {children}
    </div>
  </div>
)

const SettingRow = ({ label, description, action }: { label: string; description: string; action: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-semibold text-[#ddd]">{label}</p>
      <p className="text-xs text-[#888] mt-0.5">{description}</p>
    </div>
    {action}
  </div>
)
