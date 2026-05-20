import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'
import { Tooltip } from '@/features/ui/Tooltip'
import { RoadmapTrack, type RoadmapDay, type RoadmapKind, type RoadmapStatus } from '@/features/roadmap'
import './plan-detail.css'

// ============================================================
// Types
// ============================================================

type Kind = 'standard' | 'custom'

interface Exam {
  code: string
  label: string
  category: string
  description: string
}

interface PlanRecord {
  _id: string
  examCode: string
  examName?: string
  examDate: string | null
  dailyGoal: number | null
  status: string
  isPublished?: boolean
  shareCode?: string | null
}

interface TopicData {
  id: string
  label: string
  description?: string
  mastery: number
  questionsAnswered: number
  correctCount: number
  hasSourceExcerpts?: boolean
  generatedQuestionCount?: number
}

interface ReadinessData {
  readiness: number
  topicCount: number
  topics: TopicData[]
  allowedQuestionTypes?: string[]
}

const ALL_TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  sata: 'SATA',
  ordered: 'Order',
  calculation: 'Calc',
  exhibit: 'Exhibit',
  priority: 'Priority',
  fib: 'Fill-in',
}

// Cycling weight states: 0 (off) → 1 (light) → 2 (normal) → 3 (heavy) → 0 …
type TypeWeight = 0 | 1 | 2 | 3
const WEIGHT_LABELS: Record<TypeWeight, string> = {
  0: '✕',
  1: '•',
  2: '••',
  3: '•••',
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

interface DocData {
  _id: string
  fileName: string
  fileType: string
  fileSize: number
  charCount: number
}

// ============================================================
// Helpers
// ============================================================

function masteryColor(mastery: number): string {
  if (mastery >= 80) return 'var(--green)'
  if (mastery >= 60) return 'var(--teal)'
  if (mastery >= 40) return '#ffb45a'
  return 'var(--coral)'
}

function readinessRingColor(score: number): string {
  if (score >= 80) return 'var(--green)'
  if (score >= 50) return 'var(--teal)'
  if (score >= 25) return '#ffb45a'
  return 'var(--coral)'
}

function roadmapKindFrom(day: RoadmapDayData): RoadmapKind {
  switch (day.activityType) {
    case 'flashcard': return 'drill'
    case 'daily-quiz': return 'drill'
    case 'topic-quiz': return 'quiz'
    case 'subset-test': return 'test'
    case 'composite-test': return 'test'
    default:
      if (day.phase === 'learn') return 'drill'
      if (day.phase === 'review') return 'review'
      return 'test'
  }
}

/**
 * Build rendered roadmap days with today-indicator fallback.
 * If no day's calendar date matches today, mark the first non-completed day as today
 * (so the user always sees a clear "current" marker).
 * The last day is always 'exam' (unless it's the today-match or completed).
 */
function buildRoadmapDays(days: RoadmapDayData[]): RoadmapDay[] {
  const today = new Date().toDateString()
  const anyDateMatchesToday = days.some(
    (d) => new Date(d.date).toDateString() === today && !d.completed,
  )
  let assignedToday = false

  return days.map((d, i) => {
    const isLast = i === days.length - 1
    const dateIsToday = new Date(d.date).toDateString() === today

    let status: RoadmapStatus
    if (d.completed) {
      status = 'done'
    } else if (dateIsToday && !assignedToday) {
      status = 'today'
      assignedToday = true
    } else if (isLast) {
      status = 'exam'
    } else if (!anyDateMatchesToday && !assignedToday) {
      status = 'today'
      assignedToday = true
    } else {
      status = 'future'
    }

    return {
      id: d._id,
      dayNumber: d.dayNumber,
      kind: roadmapKindFrom(d),
      status,
      label: d.label,
      topicLabels: d.topicLabels,
    }
  })
}

// Normalize topic shape (standard returns `id`, custom returns `_id`).
function normalizeTopics(raw: Array<Record<string, unknown>>): TopicData[] {
  return raw.map((t) => ({
    id: (t.id ?? t._id) as string,
    label: t.label as string,
    description: (t.description as string) ?? '',
    mastery: t.mastery as number,
    questionsAnswered: t.questionsAnswered as number,
    correctCount: t.correctCount as number,
    hasSourceExcerpts: (t.hasSourceExcerpts as boolean) ?? false,
    generatedQuestionCount: (t.generatedQuestionCount as number) ?? 0,
  }))
}

// ============================================================
// Public entry points (route-level)
// ============================================================

export const PlanDetail = () => <PlanDetailLayout kind="standard" />
export const CustomPlanDetail = () => <PlanDetailLayout kind="custom" />

// ============================================================
// Unified layout
// ============================================================

const PlanDetailLayout = ({ kind }: { kind: Kind }) => {
  const { examCode, planId } = useParams()
  const identifier = kind === 'custom' ? planId : examCode
  const navigate = useNavigate()

  // Common state
  const [plan, setPlan] = useState<PlanRecord | null>(null)
  const [exam, setExam] = useState<Exam | null>(null)
  const [readiness, setReadiness] = useState<ReadinessData | null>(null)
  const [roadmap, setRoadmap] = useState<RoadmapDayData[]>([])
  const [selectedDay, setSelectedDay] = useState<RoadmapDayData | null>(null)
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [ready, setReady] = useState(false)

  // Standard-only
  const [tests, setTests] = useState<TestSummary[]>([])
  const [officialTests, setOfficialTests] = useState<OfficialTestSummary[]>([])
  const [questionBankAvailable, setQuestionBankAvailable] = useState(false)
  const [notEnrolled, setNotEnrolled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [showSessionSetup, setShowSessionSetup] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set())

  // Custom-only
  const [docs, setDocs] = useState<DocData[]>([])
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState(false)

  // Topic drawer state — shared across both kinds.
  const [drawerTopic, setDrawerTopic] = useState<TopicData | null>(null)
  const [drawerCount, setDrawerCount] = useState(10)
  const [drawerDifficulty, setDrawerDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed')
  const [drawerInstructions, setDrawerInstructions] = useState('')
  const [drawerGenerating, setDrawerGenerating] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [drawerTypeWeights, setDrawerTypeWeights] = useState<Record<string, TypeWeight>>({})

  // Route base for plan-scoped endpoints
  const apiBase = kind === 'custom'
    ? `/api/custom-plans/${identifier}`
    : `/api/plans/${identifier}`

  useEffect(() => {
    if (!identifier) return

    const common = [
      apiFetch(`${apiBase}/readiness`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setReadiness({
              ...data,
              topics: normalizeTopics(data.topics ?? []),
              allowedQuestionTypes: data.allowedQuestionTypes ?? ['mcq'],
            })
          }
        })
        .catch(() => {}),
      apiFetch(`${apiBase}/roadmap`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setRoadmap)
        .catch(() => {}),
    ]

    if (kind === 'standard') {
      common.push(
        apiFetch('/api/exams/all')
          .then((r) => r.json())
          .then((exams: Exam[]) => {
            const match = exams.find((e) => e.code === identifier)
            if (match) setExam(match)
            else setNotFound(true)
          })
          .catch(() => setNotFound(true)),
        apiFetch(`/api/plans/${identifier}`)
          .then((r) => {
            if (r.status === 404) { setNotEnrolled(true); return null }
            return r.json()
          })
          .then((data) => { if (data) setPlan(data) })
          .catch(() => {}),
        apiFetch(`/api/tests?examCode=${identifier}`)
          .then((r) => r.json())
          .then((data) => setTests(data.tests ?? []))
          .catch(() => {}),
        apiFetch(`/api/exams/${identifier}/official-tests`)
          .then((r) => (r.ok ? r.json() : []))
          .then(setOfficialTests)
          .catch(() => {}),
        apiFetch(`/api/exams/${identifier}/questions?limit=1`)
          .then((r) => (r.ok ? r.json() : []))
          .then((data: unknown[]) => setQuestionBankAvailable(data.length > 0))
          .catch(() => {}),
      )
    } else {
      common.push(
        apiFetch('/api/plans')
          .then((r) => r.json())
          .then((plans: PlanRecord[]) => {
            const found = plans.find((p) => p._id === identifier)
            if (found) setPlan(found)
            else setNotFound(true)
          })
          .catch(() => setNotFound(true)),
        apiFetch(`${apiBase}/documents`)
          .then((r) => (r.ok ? r.json() : []))
          .then(setDocs)
          .catch(() => {}),
      )
    }

    Promise.all(common).finally(() => setReady(true))
  }, [identifier, kind, apiBase])

  const handleEnroll = async () => {
    if (kind !== 'standard') return
    setEnrolling(true)
    try {
      const res = await apiFetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examCode: identifier }),
      })
      if (res.ok) {
        const newPlan = await res.json()
        setPlan(newPlan)
        setNotEnrolled(false)
        const readinessRes = await apiFetch(`/api/plans/${identifier}/readiness`)
        if (readinessRes.ok) {
          const data = await readinessRes.json()
          setReadiness({ ...data, topics: normalizeTopics(data.topics ?? []) })
        }
      }
    } finally {
      setEnrolling(false)
    }
  }

  const handleGenerateRoadmap = useCallback(async () => {
    if (!identifier) return
    setGeneratingRoadmap(true)
    try {
      const res = await apiFetch(`${apiBase}/roadmap/generate`, { method: 'POST' })
      if (res.ok) setRoadmap(await res.json())
    } finally {
      setGeneratingRoadmap(false)
    }
  }, [identifier, apiBase])

  const handleMarkComplete = useCallback(async (dayNumber: number) => {
    if (!identifier) return
    const res = await apiFetch(`${apiBase}/roadmap/${dayNumber}/complete`, { method: 'PATCH' })
    if (res.ok) {
      setRoadmap((prev) => prev.map((d) => (d.dayNumber === dayNumber ? { ...d, completed: true } : d)))
      setSelectedDay((prev) => (prev?.dayNumber === dayNumber ? { ...prev, completed: true } : prev))
    }
  }, [identifier, apiBase])

  const handlePublish = useCallback(async () => {
    if (kind !== 'custom' || !identifier) return
    setPublishing(true)
    try {
      const res = await apiFetch(`/api/custom-plans/${identifier}/publish`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setPlan((prev) => (prev ? { ...prev, isPublished: true, shareCode: data.shareCode } : prev))
      }
    } finally {
      setPublishing(false)
    }
  }, [kind, identifier])

  const handleUnpublish = useCallback(async () => {
    if (kind !== 'custom' || !identifier) return
    setPublishing(true)
    try {
      const res = await apiFetch(`/api/custom-plans/${identifier}/unpublish`, { method: 'POST' })
      if (res.ok) {
        setPlan((prev) => (prev ? { ...prev, isPublished: false, shareCode: null } : prev))
      }
    } finally {
      setPublishing(false)
    }
  }, [kind, identifier])

  const refreshReadiness = useCallback(async () => {
    if (!identifier) return
    const res = await apiFetch(`${apiBase}/readiness`)
    if (!res.ok) return
    const data = await res.json()
    setReadiness({
      ...data,
      topics: normalizeTopics(data.topics ?? []),
      allowedQuestionTypes: data.allowedQuestionTypes ?? ['mcq'],
    })
  }, [identifier, apiBase])

  const openTopicDrawer = useCallback((topic: TopicData) => {
    setDrawerTopic(topic)
    setDrawerError(null)
    setDrawerInstructions('')
    // Seed weights to "normal" for every allowed type. User can cycle each
    // pill to off / light / normal / heavy from there.
    const types = readiness?.allowedQuestionTypes ?? ['mcq']
    const seeded: Record<string, TypeWeight> = {}
    for (const t of types) seeded[t] = 2
    setDrawerTypeWeights(seeded)
  }, [readiness?.allowedQuestionTypes])

  const closeTopicDrawer = useCallback(() => {
    if (drawerGenerating) return
    setDrawerTopic(null)
    setDrawerError(null)
  }, [drawerGenerating])

  const handleGenerateQuestions = useCallback(async () => {
    if (!drawerTopic || !identifier) return
    setDrawerGenerating(true)
    setDrawerError(null)
    try {
      const res = await apiFetch(`${apiBase}/topics/${drawerTopic.id}/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: drawerCount,
          difficulty: drawerDifficulty,
          customInstructions: drawerInstructions.trim() || undefined,
          typeWeights: drawerTypeWeights,
          force: (drawerTopic.generatedQuestionCount ?? 0) >= drawerCount,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDrawerError(data.error ?? 'Question generation failed')
        return
      }
      const data = await res.json()
      // Update the drawer topic + readiness count optimistically
      setDrawerTopic((prev) =>
        prev
          ? {
              ...prev,
              generatedQuestionCount:
                (prev.generatedQuestionCount ?? 0) + (data.cached ? 0 : data.generatedCount ?? 0),
            }
          : prev
      )
      await refreshReadiness()
    } catch {
      setDrawerError('Question generation failed')
    } finally {
      setDrawerGenerating(false)
    }
  }, [drawerTopic, identifier, apiBase, drawerCount, drawerDifficulty, drawerInstructions, drawerTypeWeights, refreshReadiness])

  const startTopicPractice = useCallback(
    (topic: TopicData) => {
      if (!identifier) return
      const params = new URLSearchParams({ topicId: topic.id })
      if (kind === 'custom') {
        params.set('customPlanId', identifier)
      } else {
        params.set('examCode', identifier)
      }
      navigate(`${paths.app.test.getHref()}?${params.toString()}`)
    },
    [identifier, kind, navigate]
  )

  const copyShareLink = useCallback(() => {
    if (!plan?.shareCode) return
    const url = `${window.location.origin}${paths.app.sharedPlan.getHref(plan.shareCode)}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [plan?.shareCode])

  const todayDay = roadmap.find((d) => new Date(d.date).toDateString() === new Date().toDateString())
  const todayTopicLabels = todayDay?.topicLabels ?? []

  const openSessionSetup = useCallback(() => {
    const preselected = new Set<string>()
    if (readiness) {
      for (const topic of readiness.topics) {
        if (todayTopicLabels.includes(topic.label)) preselected.add(topic.id)
      }
      if (preselected.size === 0) {
        for (const topic of readiness.topics) preselected.add(topic.id)
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

  const roadmapDisplay = useMemo(() => buildRoadmapDays(roadmap), [roadmap])

  const readinessBuckets = useMemo(() => {
    const buckets = { mastered: 0, inProgress: 0, needsWork: 0 }
    if (!readiness) return buckets
    for (const t of readiness.topics) {
      if (t.mastery >= 80) buckets.mastered++
      else if (t.mastery >= 40) buckets.inProgress++
      else buckets.needsWork++
    }
    return buckets
  }, [readiness])

  if (!ready) return <PageLoader />

  // Title + sub differ by kind.
  const title = kind === 'custom' ? (plan?.examName ?? 'Plan') : (exam?.label ?? '')
  const description = kind === 'custom' ? null : exam?.description ?? ''

  // Settings + flashcards link differ by kind.
  const settingsHref = kind === 'custom'
    ? paths.app.customPlanSettings.getHref(identifier!)
    : paths.app.planSettings.getHref(identifier!)
  const flashcardsHref = kind === 'custom'
    ? paths.app.planFlashcards.getHref(plan?.examCode ?? '')
    : paths.app.planFlashcards.getHref(identifier!)

  // Loading screens for edge states
  if (notFound) {
    return (
      <div className="axeous-plan-detail">
        <div className="wrap">
          <div className="breadcrumb">
            <Link to={paths.app.plans.getHref()}>Plans</Link>
            <span className="sep">/</span>
            <span className="crumb-current">Not found</span>
          </div>
          <div className="enroll-card">
            <h1 className="enroll-title">Plan not found</h1>
            <Link to={paths.app.plans.getHref()} className="enroll-btn">← Back to plans</Link>
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'standard' && !exam) return <PageLoader />

  if (kind === 'standard' && notEnrolled && exam) {
    return (
      <div className="axeous-plan-detail">
        <div className="wrap">
          <div className="breadcrumb">
            <Link to={paths.app.plans.getHref()}>Plans</Link>
            <span className="sep">/</span>
            <span className="crumb-current">{exam.label}</span>
          </div>
          <div className="enroll-card">
            <h1 className="enroll-title">{exam.label}</h1>
            <p className="enroll-desc">{exam.description}</p>
            <button onClick={handleEnroll} disabled={enrolling} className="enroll-btn">
              {enrolling ? 'Adding…' : 'Add to my plans'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'custom' && !plan) return <PageLoader />

  const daysToExam = plan?.examDate
    ? Math.max(0, Math.ceil((new Date(plan.examDate).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="axeous-plan-detail">
      <div className="wrap">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to={paths.app.plans.getHref()}>Plans</Link>
          <span className="sep">/</span>
          <span className="crumb-current">{title}</span>
        </nav>

        <header className="plan-header">
          <div>
            <h1>{title}</h1>
            <div className="plan-header-sub">
              {description && <span>{description}</span>}
              {plan?.examDate && (
                <>
                  {description && <span>·</span>}
                  <span className="exam-date">
                    Exam: {new Date(plan.examDate).toLocaleDateString()}
                    {daysToExam !== null && ` (${daysToExam}d away)`}
                  </span>
                </>
              )}
              {kind === 'custom' && plan?.dailyGoal && (
                <>
                  <span>·</span>
                  <span>Goal: {plan.dailyGoal} questions/day</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {kind === 'custom' && (
              <Link to={paths.app.customPlanSetup.getHref(identifier!)} className="settings-btn" aria-label="Upload more">
                <UploadIcon />
              </Link>
            )}
            <Link to={settingsHref} className="settings-btn" aria-label="Plan settings">
              <GearIcon />
            </Link>
          </div>
        </header>

        {kind === 'standard' && !plan?.examDate && (
          <Link to={settingsHref} className="no-date-card">
            <div className="no-date-icon">
              <CalendarIcon />
            </div>
            <div>
              <div className="no-date-title">Set your exam date</div>
              <div className="no-date-sub">A date is needed to generate your study roadmap and track progress</div>
            </div>
          </Link>
        )}

        {kind === 'custom' && (
          plan?.isPublished && plan.shareCode ? (
            <div className="card share-card">
              <div className="share-row-head">
                <div className="share-status">
                  <span className="share-dot" />
                  <span className="share-label">Published</span>
                </div>
                <button onClick={handleUnpublish} disabled={publishing} className="share-unpublish" type="button">
                  Unpublish
                </button>
              </div>
              <div className="share-row">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${paths.app.sharedPlan.getHref(plan.shareCode)}`}
                  className="share-input"
                />
                <button onClick={copyShareLink} className="share-copy" type="button">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handlePublish} disabled={publishing} className="share-publish-btn" type="button">
              <ShareIcon />
              {publishing ? 'Publishing…' : 'Share this plan'}
            </button>
          )
        )}

        {readiness && readiness.topicCount > 0 && (
          <div className="top-row">
            <div className="card readiness">
              <ReadinessRing score={readiness.readiness} />
              <div className="readiness-info">
                <h3>
                  Readiness Score
                  <Tooltip
                    content={
                      <>
                        <p className="font-semibold mb-1.5">How readiness is calculated</p>
                        <ul className="space-y-1 text-[11px]">
                          <li><span style={{ color: 'var(--teal)' }}>Topic mastery</span> — each topic adapts as you answer questions</li>
                          <li><span style={{ color: 'var(--teal)' }}>Recent performance</span> — recent answers weighted more</li>
                          <li><span style={{ color: 'var(--teal)' }}>Experience</span> — more questions = less impact per wrong answer</li>
                          <li><span style={{ color: 'var(--teal)' }}>Coverage</span> — average mastery across all topics</li>
                        </ul>
                      </>
                    }
                  >
                    <span className="info-trigger"><InfoIcon /></span>
                  </Tooltip>
                </h3>
                <p>Based on mastery across {readiness.topicCount} topic{readiness.topicCount !== 1 ? 's' : ''}</p>
                <div className="readiness-stats">
                  <div className="rs">
                    <span className="rs-val" style={{ color: 'var(--green)' }}>{readinessBuckets.mastered}</span>
                    <span className="rs-label">Mastered</span>
                  </div>
                  <div className="rs">
                    <span className="rs-val" style={{ color: '#ffb45a' }}>{readinessBuckets.inProgress}</span>
                    <span className="rs-label">In progress</span>
                  </div>
                  <div className="rs">
                    <span className="rs-val" style={{ color: 'var(--coral)' }}>{readinessBuckets.needsWork}</span>
                    <span className="rs-label">Needs work</span>
                  </div>
                </div>
              </div>
            </div>

            {kind === 'standard' && (
              <div className="card practice-card">
                <div className="practice-label">Practice</div>
                <div className="practice-main">
                  <div>
                    <h2>Start Practice Session</h2>
                    <p>{todayDay ? `Today's plan: ${todayDay.label}` : 'Pick topics and begin practicing'}</p>
                  </div>
                  <button onClick={openSessionSetup} className="practice-btn" type="button">
                    Start <ArrowIcon size={16} />
                  </button>
                </div>
                {todayTopicLabels.length > 0 && (
                  <div className="practice-today">
                    {todayTopicLabels.slice(0, 3).map((label) => (
                      <div key={label} className="practice-chip">
                        <span className="chip-dot" style={{ background: 'var(--teal)', boxShadow: '0 0 6px var(--teal)' }} />
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {kind === 'standard' && showSessionSetup && readiness && (
          <div className="card session-setup">
            <div className="session-setup-head">
              <div>
                <div className="session-setup-title">Select topics</div>
                <div className="session-setup-sub">
                  {todayTopicLabels.length > 0
                    ? "Today's recommended topics are preselected"
                    : 'Choose which topics to practice'}
                </div>
              </div>
              <button onClick={() => setShowSessionSetup(false)} className="session-close" aria-label="Close">×</button>
            </div>

            <div className="session-quick">
              <button type="button" onClick={() => setSelectedTopics(new Set(readiness.topics.map((t) => t.id)))}>
                Select all
              </button>
              <span className="sep">·</span>
              <button type="button" onClick={() => setSelectedTopics(new Set())}>
                Clear
              </button>
            </div>

            <div className="session-topic-grid">
              {readiness.topics.map((topic) => {
                const isSelected = selectedTopics.has(topic.id)
                const isRecommended = todayTopicLabels.includes(topic.label)
                return (
                  <button
                    key={topic.id}
                    onClick={() => toggleTopic(topic.id)}
                    className={`session-topic${isSelected ? ' selected' : ''}`}
                    type="button"
                  >
                    <span className="session-check">
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span className="session-topic-label">{topic.label}</span>
                    {isRecommended && <span className="session-today-tag">Today</span>}
                    <span className="session-mastery" style={{ color: masteryColor(topic.mastery) }}>{topic.mastery}</span>
                  </button>
                )
              })}
            </div>

            <button
              disabled={selectedTopics.size === 0}
              onClick={() => {
                const topicLabels = readiness.topics
                  .filter((t) => selectedTopics.has(t.id))
                  .map((t) => t.label)
                navigate(
                  `${paths.app.test.getHref()}?examCode=${identifier}&topics=${encodeURIComponent(topicLabels.join(','))}`,
                )
              }}
              className="practice-btn"
              style={{ width: '100%' }}
              type="button"
            >
              Start with {selectedTopics.size} topic{selectedTopics.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}

        {readiness && readiness.topicCount > 0 && (
          <>
            {roadmap.length === 0 && !plan?.examDate && (
              <Link to={settingsHref} className="empty-roadmap">
                Set an exam date in settings to generate your roadmap
              </Link>
            )}

            {roadmap.length > 0 && (
              <div className="roadmap-section">
                <div className="card">
                  <div className="roadmap-head">
                    <span className="roadmap-title">Study Roadmap</span>
                    {plan?.examDate && (
                      <button onClick={handleGenerateRoadmap} disabled={generatingRoadmap} className="regen-btn" type="button">
                        {generatingRoadmap ? 'Regenerating…' : 'Regenerate'}
                      </button>
                    )}
                  </div>
                  <div style={{ padding: '16px 24px 20px' }}>
                    <RoadmapTrack
                      days={roadmapDisplay}
                      selectedId={selectedDay?._id}
                      onSelect={(d) => {
                        const original = roadmap.find((r) => r._id === d.id)
                        if (original) setSelectedDay(original)
                      }}
                    />
                  </div>
                  <div className="rm-legend-row">
                    <span className="rm-leg"><i className="ld ld-study" /> Study</span>
                    <span className="rm-leg"><i className="ld ld-quiz" /> Quiz</span>
                    <span className="rm-leg"><i className="ld ld-review" /> Review</span>
                    <span className="rm-leg"><i className="ld ld-test" /> Full Test</span>
                  </div>
                </div>
              </div>
            )}

            {selectedDay && (
              <div className="card selected-day">
                <div className="sd-head">
                  <div className="sd-info">
                    <div className="sd-meta">
                      <span className={`sd-kind k-${roadmapKindFrom(selectedDay)}`} style={{ padding: '2px 6px', borderRadius: 4 }}>
                        Day {selectedDay.dayNumber} · {selectedDay.phase}
                      </span>
                      {selectedDay.completed && <span className="sd-done-chip">Done</span>}
                    </div>
                    <div className="sd-title">{selectedDay.label}</div>
                    <div className="sd-date">
                      {new Date(selectedDay.date).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'short', day: 'numeric',
                      })}
                    </div>
                  </div>
                  {!selectedDay.completed && (
                    <button onClick={() => handleMarkComplete(selectedDay.dayNumber)} className="sd-complete-btn" type="button">
                      Mark Complete
                    </button>
                  )}
                </div>
                {selectedDay.topicLabels && selectedDay.topicLabels.length > 0 && (
                  <div className="sd-topics">
                    {selectedDay.topicLabels.map((label) => (
                      <span key={label} className="sd-topic">{label}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="topics-section">
              <h2 className="topics-head">Topic Mastery</h2>
              <div className="topics-grid">
                {readiness.topics.map((topic) => {
                  const color = masteryColor(topic.mastery)
                  const hasQuestions = (topic.generatedQuestionCount ?? 0) > 0
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      className="topic-card topic-card-button"
                      onClick={() => openTopicDrawer(topic)}
                    >
                      <div className="topic-top">
                        <span className="topic-name">{topic.label}</span>
                        <span className="topic-pct" style={{ color }}>{topic.mastery}%</span>
                      </div>
                      <div className="topic-bar">
                        <div
                          className="topic-fill"
                          style={{
                            width: `${topic.mastery}%`,
                            background: color,
                            boxShadow: `0 0 10px ${color}44`,
                          }}
                        />
                      </div>
                      <div className="topic-meta">
                        {topic.questionsAnswered} answered
                        {hasQuestions && ` · ${topic.generatedQuestionCount} questions`}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {kind === 'custom' && readiness && readiness.topics.length === 0 && (
          <Link to={paths.app.customPlanSetup.getHref(identifier!)} className="empty-roadmap">
            No topics yet — upload materials to extract topics
          </Link>
        )}

        {kind === 'standard' && (officialTests.length > 0 || tests.length > 0 || questionBankAvailable) && (
          <div>
            <h2 className="section-head">Practice Tests</h2>
            <div className="row-list">
              {officialTests.map((test) => (
                <Link
                  key={test._id}
                  to={`${paths.app.test.getHref()}?testId=${test._id}&official=true`}
                  className="row-link official"
                >
                  <div className="row-info">
                    <div className="row-title-row">
                      <span className="row-title">{test.title}</span>
                      <span className="row-badge">Official</span>
                    </div>
                    <div className="row-sub">{test.questionCount} questions</div>
                  </div>
                  <span className="row-arrow">→</span>
                </Link>
              ))}

              {questionBankAvailable && (
                <Link to={`${paths.app.test.getHref()}?examCode=${identifier}&mode=bank`} className="row-link">
                  <div className="row-info">
                    <div className="row-title-row">
                      <span className="row-title">Question Bank</span>
                    </div>
                    <div className="row-sub">Individual questions from the official bank</div>
                  </div>
                  <span className="row-arrow">→</span>
                </Link>
              )}

              {tests.map((test) => (
                <Link key={test._id} to={`${paths.app.test.getHref()}?testId=${test._id}`} className="row-link">
                  <div className="row-info">
                    <div className="row-title-row">
                      <span className="row-title">{test.title}</span>
                      <span className="row-plays">{test.timesPlayed} plays</span>
                    </div>
                    <div className="row-sub">{test.questionCount} questions</div>
                  </div>
                  <span className="row-arrow">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ paddingBottom: 64 }}>
          <h2 className="section-head">Tools</h2>
          <div className="tools-grid">
            <Link to={flashcardsHref} className="row-link">
              <div className="row-info">
                <div className="row-title-row">
                  <span className="row-title">Flashcard Generator</span>
                </div>
                <div className="row-sub">Generate study flashcards from your materials</div>
              </div>
              <span className="row-arrow">→</span>
            </Link>
          </div>

          {kind === 'custom' && docs.length > 0 && (
            <>
              <h2 className="section-head">Uploaded Materials ({docs.length})</h2>
              <div className="row-list">
                {docs.map((doc) => (
                  <div key={doc._id} className="row-link" style={{ cursor: 'default' }}>
                    <div className="doc-chip">{doc.fileType.toUpperCase()}</div>
                    <div className="row-info">
                      <div className="row-title">{doc.fileName}</div>
                      <div className="row-sub">{(doc.fileSize / 1024).toFixed(0)} KB</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {drawerTopic && (
        <TopicDrawer
          topic={drawerTopic}
          count={drawerCount}
          setCount={setDrawerCount}
          difficulty={drawerDifficulty}
          setDifficulty={setDrawerDifficulty}
          instructions={drawerInstructions}
          setInstructions={setDrawerInstructions}
          allowedTypes={readiness?.allowedQuestionTypes ?? ['mcq']}
          typeWeights={drawerTypeWeights}
          setTypeWeights={setDrawerTypeWeights}
          generating={drawerGenerating}
          error={drawerError}
          canGenerate={drawerTopic.hasSourceExcerpts ?? false}
          onClose={closeTopicDrawer}
          onGenerate={handleGenerateQuestions}
          onPractice={() => {
            const t = drawerTopic
            closeTopicDrawer()
            startTopicPractice(t)
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// Topic Drawer
// ============================================================

interface TopicDrawerProps {
  topic: TopicData
  count: number
  setCount: (n: number) => void
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  setDifficulty: (d: 'easy' | 'medium' | 'hard' | 'mixed') => void
  instructions: string
  setInstructions: (s: string) => void
  allowedTypes: string[]
  typeWeights: Record<string, TypeWeight>
  setTypeWeights: (next: Record<string, TypeWeight>) => void
  generating: boolean
  error: string | null
  canGenerate: boolean
  onClose: () => void
  onGenerate: () => void
  onPractice: () => void
}

const TopicDrawer = ({
  topic,
  count,
  setCount,
  difficulty,
  setDifficulty,
  instructions,
  setInstructions,
  allowedTypes,
  typeWeights,
  setTypeWeights,
  generating,
  error,
  canGenerate,
  onClose,
  onGenerate,
  onPractice,
}: TopicDrawerProps) => {
  const cycleWeight = (type: string) => {
    const current = typeWeights[type] ?? 2
    const next: TypeWeight = ((current + 1) % 4) as TypeWeight
    setTypeWeights({ ...typeWeights, [type]: next })
  }
  const noTypesEnabled = allowedTypes.every((t) => (typeWeights[t] ?? 2) === 0)
  const hasQuestions = (topic.generatedQuestionCount ?? 0) > 0
  const masteryColor =
    topic.mastery >= 80
      ? 'var(--green)'
      : topic.mastery >= 60
      ? 'var(--teal)'
      : topic.mastery >= 40
      ? '#ffb45a'
      : 'var(--coral)'

  return (
    <div className="topic-drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="topic-drawer"
        role="dialog"
        aria-label={`${topic.label} — practice options`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="topic-drawer-head">
          <div>
            <div className="topic-drawer-eyebrow">Topic</div>
            <h2 className="topic-drawer-title">{topic.label}</h2>
            <div className="topic-drawer-meta">
              <span style={{ color: masteryColor }}>{topic.mastery}% mastery</span>
              <span className="topic-drawer-sep">·</span>
              <span>{topic.questionsAnswered} answered</span>
              {hasQuestions && (
                <>
                  <span className="topic-drawer-sep">·</span>
                  <span>{topic.generatedQuestionCount} generated questions</span>
                </>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="topic-drawer-close" aria-label="Close">
            ×
          </button>
        </div>

        {topic.description && <p className="topic-drawer-desc">{topic.description}</p>}

        {hasQuestions && (
          <div className="topic-drawer-section">
            <button type="button" onClick={onPractice} className="topic-drawer-practice">
              Practice {topic.generatedQuestionCount} question{topic.generatedQuestionCount === 1 ? '' : 's'} →
            </button>
          </div>
        )}

        <div className="topic-drawer-section">
          <div className="topic-drawer-section-head">
            {hasQuestions ? 'Generate more questions' : 'Generate practice questions'}
          </div>

          {!canGenerate && (
            <p className="topic-drawer-hint">
              This topic has no source material to generate from. Re-run topic extraction or upload more notes.
            </p>
          )}

          <div className="topic-drawer-row">
            <label className="topic-drawer-label">Count</label>
            <div className="topic-drawer-pills">
              {[5, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={`topic-drawer-pill${count === n ? ' is-active' : ''}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="topic-drawer-row">
            <label className="topic-drawer-label">Difficulty</label>
            <div className="topic-drawer-pills">
              {(['easy', 'medium', 'hard', 'mixed'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`topic-drawer-pill${difficulty === d ? ' is-active' : ''}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {allowedTypes.length > 1 && (
            <div className="topic-drawer-row topic-drawer-row-full">
              <label className="topic-drawer-label">
                Type mix <span className="topic-drawer-optional">(click to cycle: ✕ off → • light → •• normal → ••• heavy)</span>
              </label>
              <div className="topic-drawer-pills">
                {allowedTypes.map((t) => {
                  const weight = (typeWeights[t] ?? 2) as TypeWeight
                  const off = weight === 0
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => cycleWeight(t)}
                      className={`topic-drawer-pill topic-drawer-typepill${off ? ' is-off' : ' is-active'}`}
                      aria-label={`${ALL_TYPE_LABELS[t] ?? t} weight: ${WEIGHT_LABELS[weight]}`}
                    >
                      <span className="typepill-label">{ALL_TYPE_LABELS[t] ?? t}</span>
                      <span className="typepill-weight">{WEIGHT_LABELS[weight]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="topic-drawer-row topic-drawer-row-full">
            <label className="topic-drawer-label" htmlFor="topic-drawer-instructions">
              Custom instructions <span className="topic-drawer-optional">(optional)</span>
            </label>
            <textarea
              id="topic-drawer-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Focus on dose calculations and contraindications"
              rows={3}
              className="topic-drawer-textarea"
            />
          </div>

          {error && <div className="topic-drawer-error">{error}</div>}

          {noTypesEnabled && (
            <div className="topic-drawer-hint">
              All question types are turned off. Toggle at least one above before generating.
            </div>
          )}

          <button
            type="button"
            onClick={onGenerate}
            disabled={generating || !canGenerate || noTypesEnabled}
            className="topic-drawer-generate"
          >
            {generating ? 'Writing questions…' : `Generate ${count} question${count === 1 ? '' : 's'}`}
          </button>
        </div>
      </aside>
    </div>
  )
}

// ============================================================
// Readiness Ring
// ============================================================

const ReadinessRing = ({ score }: { score: number }) => {
  const r = 42
  const circ = 2 * Math.PI * r
  const pct = Math.min(Math.max(score, 0), 100) / 100
  const color = readinessRingColor(score)

  return (
    <div className="readiness-ring">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} className="ring-bg" />
        <circle
          cx="50"
          cy="50"
          r={r}
          className="ring-fill"
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
        />
      </svg>
      <div className="readiness-val" style={{ color }}>{score}</div>
    </div>
  )
}

// ============================================================
// Icons
// ============================================================

const ArrowIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const InfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
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
