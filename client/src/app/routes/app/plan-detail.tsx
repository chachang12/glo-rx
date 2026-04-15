import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'
import { Tooltip } from '@/features/ui/Tooltip'

interface Exam {
  code: string
  label: string
  category: string
  description: string
}

interface Plan {
  _id: string
  examCode: string
  examDate: string | null
  dailyGoal: number | null
  status: string
}

interface TopicData {
  id: string
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

interface RoadmapDayData {
  _id: string
  dayNumber: number
  date: string
  phase: 'learn' | 'review' | 'simulate'
  activityType: string
  topicLabels?: string[]
  label: string
  completed: boolean
}

interface TestSummary {
  _id: string
  title: string
  tags: string[]
  questionCount: number
  timesPlayed: number
}

interface OfficialTestSummary {
  _id: string
  title: string
  questionCount: number
}

function getMasteryColor(mastery: number): string {
  if (mastery >= 67) return '#10b981'
  if (mastery >= 34) return '#eab308'
  return '#ef4444'
}

function getDotSize(activityType: string): number {
  switch (activityType) {
    case 'flashcard': case 'daily-quiz': return 8
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

export const PlanDetail = () => {
  const { examCode } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState<Exam | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [readiness, setReadiness] = useState<ReadinessData | null>(null)
  const [roadmap, setRoadmap] = useState<RoadmapDayData[]>([])
  const [selectedDay, setSelectedDay] = useState<RoadmapDayData | null>(null)
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false)
  const [tests, setTests] = useState<TestSummary[]>([])
  const [officialTests, setOfficialTests] = useState<OfficialTestSummary[]>([])
  const [questionBankAvailable, setQuestionBankAvailable] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [notEnrolled, setNotEnrolled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [ready, setReady] = useState(false)

  // Practice session setup state
  const [showSessionSetup, setShowSessionSetup] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!examCode) return

    Promise.all([
      apiFetch('/api/exams/all')
        .then((r) => r.json())
        .then((exams: Exam[]) => {
          const match = exams.find((e) => e.code === examCode)
          if (match) setExam(match)
          else setNotFound(true)
        })
        .catch(() => setNotFound(true)),
      apiFetch(`/api/plans/${examCode}`)
        .then((r) => {
          if (r.status === 404) { setNotEnrolled(true); return null }
          return r.json()
        })
        .then((data) => { if (data) setPlan(data) })
        .catch(() => {}),
      apiFetch(`/api/plans/${examCode}/readiness`)
        .then((r) => { if (!r.ok) return null; return r.json() })
        .then((data) => { if (data) setReadiness(data) })
        .catch(() => {}),
      apiFetch(`/api/plans/${examCode}/roadmap`)
        .then((r) => { if (!r.ok) return []; return r.json() })
        .then(setRoadmap)
        .catch(() => {}),
      apiFetch(`/api/tests?examCode=${examCode}`)
        .then((r) => r.json())
        .then((data) => setTests(data.tests ?? []))
        .catch(() => {}),
      apiFetch(`/api/exams/${examCode}/official-tests`)
        .then((r) => r.ok ? r.json() : [])
        .then(setOfficialTests)
        .catch(() => {}),
      apiFetch(`/api/exams/${examCode}/questions?limit=1`)
        .then((r) => r.ok ? r.json() : [])
        .then((data: unknown[]) => setQuestionBankAvailable(data.length > 0))
        .catch(() => {}),
    ]).finally(() => setReady(true))
  }, [examCode])

  const handleEnroll = async () => {
    setEnrolling(true)
    try {
      const res = await apiFetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examCode }),
      })
      if (res.ok) {
        const newPlan = await res.json()
        setPlan(newPlan)
        setNotEnrolled(false)
        const readinessRes = await apiFetch(`/api/plans/${examCode}/readiness`)
        if (readinessRes.ok) setReadiness(await readinessRes.json())
      }
    } finally {
      setEnrolling(false)
    }
  }

  const handleGenerateRoadmap = useCallback(async () => {
    if (!examCode) return
    setGeneratingRoadmap(true)
    try {
      const res = await apiFetch(`/api/plans/${examCode}/roadmap/generate`, { method: 'POST' })
      if (res.ok) setRoadmap(await res.json())
    } finally {
      setGeneratingRoadmap(false)
    }
  }, [examCode])

  const handleMarkComplete = useCallback(async (dayNumber: number) => {
    if (!examCode) return
    const res = await apiFetch(`/api/plans/${examCode}/roadmap/${dayNumber}/complete`, { method: 'PATCH' })
    if (res.ok) {
      setRoadmap((prev) => prev.map((d) => (d.dayNumber === dayNumber ? { ...d, completed: true } : d)))
      setSelectedDay((prev) => (prev?.dayNumber === dayNumber ? { ...prev, completed: true } : prev))
    }
  }, [examCode])

  // Get today's roadmap day and its recommended topics
  const todayDay = roadmap.find((d) => new Date(d.date).toDateString() === new Date().toDateString())
  const todayTopicLabels = todayDay?.topicLabels ?? []

  const openSessionSetup = useCallback(() => {
    // Preselect today's roadmap topics
    const preselected = new Set<string>()
    if (readiness) {
      for (const topic of readiness.topics) {
        if (todayTopicLabels.includes(topic.label)) {
          preselected.add(topic.id)
        }
      }
    }
    // If no roadmap topics for today, select all
    if (preselected.size === 0 && readiness) {
      for (const topic of readiness.topics) {
        preselected.add(topic.id)
      }
    }
    setSelectedTopics(preselected)
    setShowSessionSetup(true)
  }, [readiness, todayTopicLabels])

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!ready) return <PageLoader />

  if (notFound) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold text-[#e8e6f0]">Exam not found</h1>
          <Link to={paths.app.plans.getHref()} className="text-sm text-[#4f8ef7] hover:underline">&larr; Back to plans</Link>
        </div>
      </div>
    )
  }

  if (!exam) return <PageLoader />

  if (notEnrolled) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <Link to={paths.app.plans.getHref()} className="hover:text-[#888] transition-colors">Plans</Link>
            <span>/</span>
            <span className="text-[#888]">{exam.label}</span>
          </div>
          <div className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">{exam.label}</h1>
            <p className="text-sm text-[#888]">{exam.description}</p>
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="px-5 py-2.5 rounded-lg bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all disabled:opacity-50"
            >
              {enrolling ? 'Adding...' : 'Add to my plans'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const daysToExam = plan?.examDate
    ? Math.max(0, Math.ceil((new Date(plan.examDate).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#555]">
          <Link to={paths.app.plans.getHref()} className="hover:text-[#888] transition-colors">Plans</Link>
          <span>/</span>
          <span className="text-[#888]">{exam.label}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">{exam.label}</h1>
            <div className="flex items-center gap-3 text-xs text-[#555]">
              <span>{exam.description}</span>
              {plan?.examDate && (
                <span>
                  Exam: {new Date(plan.examDate).toLocaleDateString()}
                  {daysToExam !== null && ` (${daysToExam}d away)`}
                </span>
              )}
            </div>
          </div>
          <Link
            to={paths.app.planSettings.getHref(exam.code)}
            className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#555] hover:text-[#ddd] transition-all"
          >
            <GearIcon />
          </Link>
        </div>

        {/* No exam date reminder */}
        {!plan?.examDate && (
          <Link
            to={paths.app.planSettings.getHref(exam.code)}
            className="flex items-center gap-3 rounded-2xl border border-[#eab308]/20 bg-[#eab308]/5 p-4 hover:border-[#eab308]/40 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-[#eab308]/15 flex items-center justify-center flex-shrink-0">
              <CalendarIcon />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#ddd]">Set your exam date</p>
              <p className="text-xs text-[#888]">A date is needed to generate your study roadmap and track progress</p>
            </div>
          </Link>
        )}

        {/* Readiness Score */}
        {readiness && readiness.topicCount > 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6">
            <div className="flex items-center gap-5">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={getMasteryColor(readiness.readiness)} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${readiness.readiness * 2.64} 264`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-semibold text-[#e8e6f0]">{readiness.readiness}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-[#ddd]">Readiness Score</p>
                  <Tooltip content={
                    <>
                      <p className="font-semibold text-[#ddd] mb-1.5">How readiness is calculated</p>
                      <ul className="space-y-1 text-[11px]">
                        <li><span className="text-[#4f8ef7]">Topic mastery</span> — each topic adapts as you answer questions</li>
                        <li><span className="text-[#4f8ef7]">Recent performance</span> — recent answers weighted more</li>
                        <li><span className="text-[#4f8ef7]">Experience</span> — more questions = less impact per wrong answer</li>
                        <li><span className="text-[#4f8ef7]">Coverage</span> — average mastery across all topics</li>
                      </ul>
                    </>
                  }>
                    <InfoIcon />
                  </Tooltip>
                </div>
                <p className="text-xs text-[#555]">Across {readiness.topicCount} topic{readiness.topicCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        )}

        {/* Practice Session */}
        {readiness && readiness.topicCount > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#bbb]">Practice</h2>

            {!showSessionSetup ? (
              <button
                onClick={openSessionSetup}
                className="w-full group rounded-2xl border border-[#4f8ef7]/20 bg-[#4f8ef7]/[0.04] p-5 hover:border-[#4f8ef7]/40 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#e8e6f0] group-hover:text-[#4f8ef7] transition-colors">
                      Start Practice Session
                    </p>
                    <p className="text-xs text-[#555]">
                      {todayDay
                        ? `Today's plan: ${todayDay.label}`
                        : 'Select topics and begin practicing'}
                    </p>
                  </div>
                  <span className="text-[#4f8ef7] text-lg">&rarr;</span>
                </div>
              </button>
            ) : (
              <div className="rounded-2xl border border-[#4f8ef7]/20 bg-[#4f8ef7]/[0.04] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#e8e6f0]">Select Topics</p>
                    <p className="text-xs text-[#555] mt-0.5">
                      {todayTopicLabels.length > 0
                        ? "Today's recommended topics are preselected"
                        : 'Choose which topics to practice'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSessionSetup(false)}
                    className="text-[#555] hover:text-[#ddd] transition-colors text-lg"
                  >
                    &times;
                  </button>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTopics(new Set(readiness.topics.map((t) => t.id)))}
                    className="text-[10px] font-semibold text-[#4f8ef7] hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-[#555]">·</span>
                  <button
                    onClick={() => setSelectedTopics(new Set())}
                    className="text-[10px] font-semibold text-[#555] hover:text-[#888]"
                  >
                    Clear
                  </button>
                </div>

                {/* Topic checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {readiness.topics.map((topic) => {
                    const isSelected = selectedTopics.has(topic.id)
                    const isRecommended = todayTopicLabels.includes(topic.label)
                    return (
                      <button
                        key={topic.id}
                        onClick={() => toggleTopic(topic.id)}
                        className={`flex items-center gap-2.5 rounded-lg p-2.5 text-left transition-all ${
                          isSelected
                            ? 'border border-[#4f8ef7]/30 bg-[#4f8ef7]/10'
                            : 'border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08]'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-[#4f8ef7] border-[#4f8ef7]'
                            : 'border-white/[0.15] bg-transparent'
                        }`}>
                          {isSelected && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0f0f1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-[#ddd] truncate">{topic.label}</span>
                            {isRecommended && (
                              <span className="text-[8px] font-semibold text-[#4f8ef7] bg-[#4f8ef7]/10 px-1 py-0.5 rounded flex-shrink-0">
                                Today
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className="text-[10px] font-bold tabular-nums flex-shrink-0"
                          style={{ color: getMasteryColor(topic.mastery) }}
                        >
                          {topic.mastery}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Start button */}
                <button
                  disabled={selectedTopics.size === 0}
                  onClick={() => {
                    const topicLabels = readiness.topics
                      .filter((t) => selectedTopics.has(t.id))
                      .map((t) => t.label)
                    navigate(`${paths.app.test.getHref()}?examCode=${examCode}&topics=${encodeURIComponent(topicLabels.join(','))}`)
                  }}
                  className="w-full py-3 rounded-xl bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start with {selectedTopics.size} topic{selectedTopics.size !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Study Roadmap */}
        {readiness && readiness.topicCount > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#bbb]">Study Roadmap</h2>
              {plan?.examDate && (
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

            {!plan?.examDate && roadmap.length === 0 && (
              <Link
                to={paths.app.planSettings.getHref(exam.code)}
                className="block rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] p-5 text-center hover:border-[#4f8ef7]/20 transition-all"
              >
                <p className="text-xs text-[#888]">Set an exam date in settings to generate your roadmap</p>
              </Link>
            )}

            {roadmap.length > 0 && (
              <>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6">
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
                          <button onClick={() => setSelectedDay(day)} className="relative group flex-shrink-0" title={day.label}>
                            <div
                              className={`rounded-full transition-all ${selectedDay?._id === day._id ? 'scale-125' : 'hover:scale-110'}`}
                              style={{
                                width: size, height: size,
                                backgroundColor: day.completed ? color : isPast ? `${color}66` : `${color}33`,
                                borderWidth: day.completed ? 0 : 2, borderColor: color, borderStyle: 'solid',
                                boxShadow: isToday ? `0 0 0 2px #060611, 0 0 0 4px ${color}` : undefined,
                              }}
                            />
                            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-[#555] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">D{day.dayNumber}</span>
                          </button>
                          {!isLast && (
                            <div className="h-px flex-1 min-w-2" style={{ backgroundColor: day.completed ? nextColor : 'rgba(255,255,255,0.06)' }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.04]">
                    <LegendItem color="#4f8ef7" size={8} label="Study" />
                    <LegendItem color="#4f8ef7" size={12} label="Quiz" />
                    <LegendItem color="#8b5cf6" size={14} label="Review Test" />
                    <LegendItem color="#e07b3f" size={16} label="Full Test" />
                  </div>
                </div>

                {selectedDay && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: getPhaseColor(selectedDay.phase) }}>
                            Day {selectedDay.dayNumber} — {selectedDay.phase}
                          </span>
                          {selectedDay.completed && (
                            <span className="text-[10px] font-semibold text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded-full">Done</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-[#ddd]">{selectedDay.label}</p>
                        <p className="text-xs text-[#555]">
                          {new Date(selectedDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      {!selectedDay.completed && (
                        <button onClick={() => handleMarkComplete(selectedDay.dayNumber)} className="px-3 py-1.5 rounded-lg bg-[#4f8ef7] text-[#0f0f1a] text-xs font-semibold hover:bg-[#4f8ef7]/90 transition-all">
                          Mark Complete
                        </button>
                      )}
                    </div>
                    {selectedDay.topicLabels && selectedDay.topicLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDay.topicLabels.map((label) => (
                          <span key={label} className="px-2 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-[10px] text-[#888] truncate max-w-48">{label}</span>
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
                <div key={topic.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#ddd] truncate">{topic.label}</p>
                    <span className="text-xs font-bold tabular-nums flex-shrink-0" style={{ color: getMasteryColor(topic.mastery) }}>{topic.mastery}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full transition-all" style={{ width: `${topic.mastery}%`, backgroundColor: getMasteryColor(topic.mastery) }} />
                  </div>
                  <p className="text-[10px] text-[#555]">{topic.questionsAnswered} answered — mastery</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Tests */}
        {(officialTests.length > 0 || tests.length > 0 || questionBankAvailable) && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#bbb]">Practice Tests</h2>
            <div className="space-y-2">
              {/* Official tests */}
              {officialTests.map((test) => (
                <Link
                  key={test._id}
                  to={`${paths.app.test.getHref()}?testId=${test._id}&official=true`}
                  className="group flex items-center justify-between rounded-xl border border-[#4f8ef7]/10 bg-[#4f8ef7]/[0.03] p-4 hover:border-[#4f8ef7]/30 transition-all"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#ddd] group-hover:text-[#4f8ef7] transition-colors truncate">{test.title}</p>
                      <span className="text-[10px] font-semibold text-[#4f8ef7] bg-[#4f8ef7]/10 px-1.5 py-0.5 rounded flex-shrink-0">Official</span>
                    </div>
                    <p className="text-xs text-[#555]">{test.questionCount} questions</p>
                  </div>
                  <span className="text-xs text-[#555] ml-4 flex-shrink-0">&rarr;</span>
                </Link>
              ))}

              {/* Question bank */}
              {questionBankAvailable && (
                <Link
                  to={`${paths.app.test.getHref()}?examCode=${examCode}&mode=bank`}
                  className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 hover:border-[#4f8ef7]/30 transition-all"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#ddd] group-hover:text-[#4f8ef7] transition-colors">Question Bank</p>
                    <p className="text-xs text-[#555]">Individual questions from the official bank</p>
                  </div>
                  <span className="text-xs text-[#555]">&rarr;</span>
                </Link>
              )}

              {/* Community tests */}
              {tests.map((test) => (
                <Link
                  key={test._id}
                  to={`${paths.app.test.getHref()}?testId=${test._id}`}
                  className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 hover:border-[#4f8ef7]/30 transition-all"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#ddd] group-hover:text-[#4f8ef7] transition-colors truncate">{test.title}</p>
                      <span className="text-[10px] text-[#555]">{test.timesPlayed} plays</span>
                    </div>
                    <p className="text-xs text-[#555]">{test.questionCount} questions</p>
                  </div>
                  <span className="text-xs text-[#555] ml-4 flex-shrink-0">&rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tools */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#bbb]">Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to={paths.app.planFlashcards.getHref(exam.code)}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 hover:border-[#4f8ef7]/30 transition-all"
            >
              <p className="text-sm font-semibold text-[#ddd] group-hover:text-[#4f8ef7] transition-colors">Flashcard Generator</p>
              <p className="text-xs text-[#555] mt-1">Generate study flashcards from your materials</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helper Components ────────────────────────────────────────────────────────

const LegendItem = ({ color, size, label }: { color: string; size: number; label: string }) => (
  <div className="flex items-center gap-1.5">
    <div className="rounded-full border-2 flex-shrink-0" style={{ width: size, height: size, borderColor: color, backgroundColor: `${color}33` }} />
    <span className="text-[10px] text-[#555]">{label}</span>
  </div>
)

const InfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const GearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
