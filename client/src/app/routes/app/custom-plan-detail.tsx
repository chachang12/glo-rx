import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'
import { Tooltip } from '@/features/ui/Tooltip'

interface PlanData {
  _id: string
  examCode: string
  examName: string
  examDate: string | null
  dailyGoal: number | null
  status: string
  isPublished?: boolean
  shareCode?: string | null
}

interface TopicData {
  _id: string
  label: string
  mastery: number
  questionsAnswered: number
  correctCount: number
}

interface ReadinessData {
  readiness: number
  topicCount: number
  topics: TopicData[]
}

interface DocData {
  _id: string
  fileName: string
  fileType: string
  fileSize: number
  charCount: number
}

interface RoadmapDayData {
  _id: string
  dayNumber: number
  date: string
  phase: 'learn' | 'review' | 'simulate'
  activityType: string
  topicLabels: string[]
  label: string
  completed: boolean
}

function getMasteryColor(mastery: number): string {
  if (mastery >= 67) return '#10b981'
  if (mastery >= 34) return '#eab308'
  return '#ef4444'
}

export const CustomPlanDetail = () => {
  const { planId } = useParams()
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [readiness, setReadiness] = useState<ReadinessData | null>(null)
  const [docs, setDocs] = useState<DocData[]>([])
  const [roadmap, setRoadmap] = useState<RoadmapDayData[]>([])
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false)
  const [selectedDay, setSelectedDay] = useState<RoadmapDayData | null>(null)
  const [ready, setReady] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState(false)

  const handlePublish = useCallback(async () => {
    if (!planId) return
    setPublishing(true)
    try {
      const res = await apiFetch(`/api/custom-plans/${planId}/publish`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setPlan((prev) => prev ? { ...prev, isPublished: true, shareCode: data.shareCode } : prev)
      }
    } finally {
      setPublishing(false)
    }
  }, [planId])

  const handleUnpublish = useCallback(async () => {
    if (!planId) return
    setPublishing(true)
    try {
      const res = await apiFetch(`/api/custom-plans/${planId}/unpublish`, { method: 'POST' })
      if (res.ok) {
        setPlan((prev) => prev ? { ...prev, isPublished: false, shareCode: null } : prev)
      }
    } finally {
      setPublishing(false)
    }
  }, [planId])

  const copyShareLink = useCallback(() => {
    if (!plan?.shareCode) return
    const url = `${window.location.origin}${paths.app.sharedPlan.getHref(plan.shareCode)}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [plan?.shareCode])

  const handleGenerateRoadmap = useCallback(async () => {
    if (!planId) return
    setGeneratingRoadmap(true)
    try {
      const res = await apiFetch(`/api/custom-plans/${planId}/roadmap/generate`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setRoadmap(data)
      }
    } finally {
      setGeneratingRoadmap(false)
    }
  }, [planId])

  const handleMarkComplete = useCallback(async (dayNumber: number) => {
    if (!planId) return
    const res = await apiFetch(`/api/custom-plans/${planId}/roadmap/${dayNumber}/complete`, {
      method: 'PATCH',
    })
    if (res.ok) {
      setRoadmap((prev) =>
        prev.map((d) => (d.dayNumber === dayNumber ? { ...d, completed: true } : d))
      )
      setSelectedDay((prev) => (prev?.dayNumber === dayNumber ? { ...prev, completed: true } : prev))
    }
  }, [planId])

  useEffect(() => {
    if (!planId) return
    Promise.all([
      apiFetch('/api/plans')
        .then((r) => r.json())
        .then((plans: PlanData[]) => {
          const found = plans.find((p) => p._id === planId)
          if (found) setPlan(found)
          else setNotFound(true)
        })
        .catch(() => setNotFound(true)),
      apiFetch(`/api/custom-plans/${planId}/readiness`)
        .then((r) => {
          if (!r.ok) return null
          return r.json()
        })
        .then((data) => { if (data) setReadiness(data) })
        .catch(() => {}),
      apiFetch(`/api/custom-plans/${planId}/documents`)
        .then((r) => {
          if (!r.ok) return []
          return r.json()
        })
        .then(setDocs)
        .catch(() => {}),
      apiFetch(`/api/custom-plans/${planId}/roadmap`)
        .then((r) => {
          if (!r.ok) return []
          return r.json()
        })
        .then(setRoadmap)
        .catch(() => {}),
    ]).finally(() => setReady(true))
  }, [planId])

  if (!ready) return <PageLoader />

  if (notFound || !plan) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center space-y-4 py-16">
          <p className="text-sm text-[#888]">Plan not found</p>
          <Link to={paths.app.plans.getHref()} className="text-xs text-[#4f8ef7] hover:underline">
            Back to plans
          </Link>
        </div>
      </div>
    )
  }

  const daysToExam = plan.examDate
    ? Math.max(0, Math.ceil((new Date(plan.examDate).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#555]">
          <Link to={paths.app.plans.getHref()} className="hover:text-[#888] transition-colors">
            Plans
          </Link>
          <span>/</span>
          <span className="text-[#888]">{plan.examName}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
              {plan.examName}
            </h1>
            <div className="flex items-center gap-3 text-xs text-[#555]">
              {plan.examDate && (
                <span>
                  Exam: {new Date(plan.examDate).toLocaleDateString()}
                  {daysToExam !== null && ` (${daysToExam}d away)`}
                </span>
              )}
              {plan.dailyGoal && <span>Goal: {plan.dailyGoal} questions/day</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={paths.app.customPlanSetup.getHref(planId!)}
              className="px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-[#888] hover:text-[#ddd] transition-all"
            >
              Upload More
            </Link>
            <Link
              to={paths.app.customPlanSettings.getHref(planId!)}
              className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#555] hover:text-[#ddd] transition-all"
            >
              <GearIcon />
            </Link>
          </div>
        </div>

        {/* Sharing */}
        {plan.isPublished && plan.shareCode ? (
          <div className="rounded-xl border border-[#10b981]/20 bg-[#10b981]/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span className="text-xs font-semibold text-[#10b981]">Published</span>
              </div>
              <button
                onClick={handleUnpublish}
                disabled={publishing}
                className="text-[10px] text-[#555] hover:text-[#888] transition-colors"
              >
                Unpublish
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}${paths.app.sharedPlan.getHref(plan.shareCode)}`}
                className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs text-[#888] font-mono truncate focus:outline-none"
              />
              <button
                onClick={copyShareLink}
                className="px-3 py-2 rounded-lg border border-[#4f8ef7]/30 bg-[#4f8ef7]/5 text-xs font-semibold text-[#4f8ef7] hover:border-[#4f8ef7]/60 transition-all"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-[#888] hover:text-[#ddd] hover:border-white/[0.15] transition-all disabled:opacity-50"
          >
            <ShareIcon />
            {publishing ? 'Publishing...' : 'Share this plan'}
          </button>
        )}

        {/* Readiness Score */}
        {readiness && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6">
            <div className="flex items-center gap-5">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke={getMasteryColor(readiness.readiness)}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${readiness.readiness * 2.64} 264`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-semibold text-[#e8e6f0]">
                    {readiness.readiness}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-[#ddd]">Readiness Score</p>
                  <Tooltip content={
                    <>
                      <p className="font-semibold text-[#ddd] mb-1.5">How readiness is calculated</p>
                      <ul className="space-y-1 text-[11px]">
                        <li><span className="text-[#4f8ef7]">Topic mastery</span> — each topic has a mastery score that adapts as you answer questions</li>
                        <li><span className="text-[#4f8ef7]">Recent performance</span> — recent answers are weighted more than older ones</li>
                        <li><span className="text-[#4f8ef7]">Experience</span> — as you answer more questions per topic, individual wrong answers have less impact</li>
                        <li><span className="text-[#4f8ef7]">Coverage</span> — your overall readiness is the average mastery across all topics</li>
                      </ul>
                    </>
                  }>
                    <InfoIcon />
                  </Tooltip>
                </div>
                <p className="text-xs text-[#555]">
                  Across {readiness.topicCount} topic{readiness.topicCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Study Roadmap */}
        {readiness && readiness.topics.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#bbb]">Study Roadmap</h2>
              {plan.examDate && (
                <button
                  onClick={handleGenerateRoadmap}
                  disabled={generatingRoadmap}
                  className="text-[10px] font-semibold text-[#4f8ef7] hover:underline disabled:opacity-50"
                >
                  {roadmap.length > 0
                    ? generatingRoadmap ? 'Regenerating...' : 'Regenerate'
                    : generatingRoadmap ? 'Generating...' : 'Generate Roadmap'}
                </button>
              )}
            </div>

            {!plan.examDate && (
              <p className="text-xs text-[#555]">Set an exam date to generate a study roadmap.</p>
            )}

            {roadmap.length > 0 && (
              <>
                {/* Timeline visualization */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6">
                  <div>
                    <div className="flex items-center py-4 px-2">
                      {roadmap.map((day, i) => {
                        const isToday = new Date(day.date).toDateString() === new Date().toDateString()
                        const isPast = new Date(day.date) < new Date() && !isToday
                        const isLast = i === roadmap.length - 1
                        const size = getDotSize(day.activityType)
                        const color = getPhaseColor(day.phase)
                        const nextColor = !isLast ? getPhaseColor(roadmap[i + 1].phase) : color

                        return (
                          <div key={day._id} className={`flex items-center ${isLast ? 'flex-shrink-0' : 'flex-1'}`}>
                            {/* Dot */}
                            <button
                              onClick={() => setSelectedDay(day)}
                              className="relative group flex-shrink-0"
                              title={day.label}
                            >
                              <div
                                className={`rounded-full transition-all ${
                                  selectedDay?._id === day._id ? 'scale-125' : 'hover:scale-110'
                                }`}
                                style={{
                                  width: size,
                                  height: size,
                                  backgroundColor: day.completed ? color : isPast ? `${color}66` : `${color}33`,
                                  borderWidth: day.completed ? 0 : 2,
                                  borderColor: color,
                                  borderStyle: 'solid',
                                  boxShadow: isToday ? `0 0 0 2px #060611, 0 0 0 4px ${color}` : undefined,
                                }}
                              />
                              {/* Day number tooltip */}
                              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-[#555] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                D{day.dayNumber}
                              </span>
                            </button>
                            {/* Connector line after dot */}
                            {!isLast && (
                              <div
                                className="h-px flex-1 min-w-2"
                                style={{ backgroundColor: day.completed ? nextColor : 'rgba(255,255,255,0.06)' }}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.04]">
                      <LegendItem color="#4f8ef7" size={8} label="Study" />
                      <LegendItem color="#4f8ef7" size={12} label="Quiz" />
                      <LegendItem color="#8b5cf6" size={14} label="Review Test" />
                      <LegendItem color="#e07b3f" size={16} label="Full Test" />
                    </div>
                  </div>
                </div>

                {/* Selected day detail */}
                {selectedDay && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-mono uppercase tracking-widest"
                            style={{ color: getPhaseColor(selectedDay.phase) }}
                          >
                            Day {selectedDay.dayNumber} — {selectedDay.phase}
                          </span>
                          {selectedDay.completed && (
                            <span className="text-[10px] font-semibold text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded-full">
                              Done
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-[#ddd]">{selectedDay.label}</p>
                        <p className="text-xs text-[#555]">
                          {new Date(selectedDay.date).toLocaleDateString('en-US', {
                            weekday: 'long', month: 'short', day: 'numeric',
                          })}
                        </p>
                      </div>
                      {!selectedDay.completed && (
                        <button
                          onClick={() => handleMarkComplete(selectedDay.dayNumber)}
                          className="px-3 py-1.5 rounded-lg bg-[#4f8ef7] text-[#0f0f1a] text-xs font-semibold hover:bg-[#4f8ef7]/90 transition-all"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                    {selectedDay.topicLabels && selectedDay.topicLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDay.topicLabels.map((label) => (
                          <span
                            key={label}
                            className="px-2 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-[10px] text-[#888] truncate max-w-48"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Topic Mastery Grid */}
        {readiness && readiness.topics.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#bbb]">Topic Mastery</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {readiness.topics.map((topic) => (
                <div
                  key={topic._id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#ddd] truncate">{topic.label}</p>
                    <span
                      className="text-xs font-bold tabular-nums flex-shrink-0"
                      style={{ color: getMasteryColor(topic.mastery) }}
                    >
                      {topic.mastery}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${topic.mastery}%`,
                        backgroundColor: getMasteryColor(topic.mastery),
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[#555]">
                    {topic.questionsAnswered} answered — mastery
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No topics state */}
        {readiness && readiness.topics.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 text-center space-y-2">
            <p className="text-sm text-[#888]">No topics yet</p>
            <Link
              to={paths.app.customPlanSetup.getHref(planId!)}
              className="text-xs text-[#4f8ef7] hover:underline"
            >
              Upload materials to extract topics
            </Link>
          </div>
        )}

        {/* Tools */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#bbb]">Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to={paths.app.planFlashcards.getHref(plan.examCode)}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 hover:border-[#4f8ef7]/30 transition-all"
            >
              <p className="text-sm font-semibold text-[#ddd] group-hover:text-[#4f8ef7] transition-colors">
                Flashcard Generator
              </p>
              <p className="text-xs text-[#555] mt-1">
                Generate study flashcards from your materials
              </p>
            </Link>
          </div>
        </div>

        {/* Documents */}
        {docs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#bbb]">
              Uploaded Materials ({docs.length})
            </h2>
            <div className="space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc._id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#4f8ef7]/10 border border-[#4f8ef7]/20 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-[#4f8ef7]">
                      {doc.fileType.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#ddd] truncate">{doc.fileName}</p>
                    <p className="text-[10px] text-[#555]">
                      {(doc.fileSize / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Roadmap Helpers ──────────────────────────────────────────────────────────

function getDotSize(activityType: string): number {
  switch (activityType) {
    case 'flashcard': return 8
    case 'daily-quiz': return 8
    case 'topic-quiz': return 12
    case 'subset-test': return 14
    case 'composite-test': return 16
    default: return 8
  }
}

function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'learn': return '#4f8ef7'
    case 'review': return '#8b5cf6'
    case 'simulate': return '#e07b3f'
    default: return '#888'
  }
}

const LegendItem = ({ color, size, label }: { color: string; size: number; label: string }) => (
  <div className="flex items-center gap-1.5">
    <div
      className="rounded-full border-2 flex-shrink-0"
      style={{ width: size, height: size, borderColor: color, backgroundColor: `${color}33` }}
    />
    <span className="text-[10px] text-[#555]">{label}</span>
  </div>
)

// ── Icons ────────────────────────────────────────────────────────────────────

const GearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const InfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const ShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
)
