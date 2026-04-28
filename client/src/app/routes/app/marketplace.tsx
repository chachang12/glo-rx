import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'
import './marketplace.css'

// ============================================================
// Types
// ============================================================

interface Exam {
  code: string
  label: string
  category: string
  description: string
  active: boolean
  visibility?: 'hidden' | 'coming-soon' | 'live'
  featured?: boolean
}

interface Plan {
  examCode: string
  status: string
}

type FilterMode = 'all' | 'enrolled' | 'available'
type ExamTag = 'enrolled' | 'soon' | 'available'

interface ExamMeta {
  topicList?: string[]
  glow?: string
}

// ============================================================
// Static catalogue enrichments (descriptive only — no fabricated stats)
// ============================================================

const EXAM_META: Record<string, ExamMeta> = {
  'nclex-rn': {
    topicList: ['Pharmacology', 'Med-Surg', 'Pediatrics', 'OB', 'Psych', 'Fundamentals'],
    glow: 'radial-gradient(300px 150px at 90% -20%, rgba(110,156,199,0.14), transparent 60%)',
  },
  'nclex-pn': {
    topicList: ['Pharmacology', 'Safe Care', 'Health Promo'],
    glow: 'radial-gradient(300px 150px at 90% -20%, rgba(110,156,199,0.10), transparent 60%)',
  },
  'teas-7': {
    topicList: ['Reading', 'Math', 'Science', 'English'],
    glow: 'radial-gradient(300px 150px at 90% -20%, rgba(106,168,255,0.10), transparent 60%)',
  },
  vtne: {
    topicList: ['Pharmacology', 'Surgical', 'Anesthesia', 'Lab'],
    glow: 'radial-gradient(300px 150px at 90% -20%, rgba(167,139,250,0.14), transparent 60%)',
  },
  dat: {
    topicList: ['Biology', 'Gen Chem', 'Orgo', 'PAT', 'Reading'],
    glow: 'radial-gradient(300px 150px at 90% -20%, rgba(255,180,90,0.10), transparent 60%)',
  },
  mcat: {
    topicList: ['Bio/Biochem', 'Chem/Phys', 'CARS', 'Psych/Soc'],
    glow: 'radial-gradient(300px 150px at 90% -20%, rgba(255,72,88,0.10), transparent 60%)',
  },
  'usmle-step-1': {
    topicList: ['Anatomy', 'Pathology', 'Pharmacology', 'Biochem'],
    glow: 'radial-gradient(300px 150px at 90% -20%, rgba(255,72,88,0.08), transparent 60%)',
  },
  gre: {
    topicList: ['Verbal', 'Quant', 'Writing'],
    glow: 'radial-gradient(300px 150px at 90% -20%, rgba(106,168,255,0.12), transparent 60%)',
  },
  gmat: {
    topicList: ['Quant', 'Verbal', 'IR', 'AWA'],
    glow: 'radial-gradient(300px 150px at 90% -20%, rgba(106,168,255,0.08), transparent 60%)',
  },
}

const CATEGORY_COLORS: Record<string, string> = {
  nursing: 'var(--teal)',
  veterinary: 'var(--violet)',
  dental: '#ffb45a',
  medical: 'var(--coral)',
  graduate: 'var(--blue)',
  law: 'var(--violet)',
  accounting: '#ffb45a',
}

const CATEGORY_LABELS: Record<string, string> = {
  nursing: 'Nursing',
  veterinary: 'Veterinary',
  dental: 'Dental',
  medical: 'Medical',
  graduate: 'Graduate',
  law: 'Law',
  accounting: 'Accounting',
}

// Fixed category order so grouping is stable across reloads.
const CATEGORY_ORDER = [
  'nursing',
  'medical',
  'veterinary',
  'dental',
  'graduate',
  'law',
  'accounting',
]

// ============================================================
// Helpers
// ============================================================

function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? 'var(--blue)'
}

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1)
}

function resolveTag(exam: Exam, isEnrolled: boolean): ExamTag {
  if (isEnrolled) return 'enrolled'
  if (exam.visibility === 'coming-soon') return 'soon'
  return 'available'
}

function tagLabel(tag: ExamTag): string {
  switch (tag) {
    case 'enrolled': return 'Enrolled'
    case 'soon': return 'Coming soon'
    case 'available': return 'Available'
  }
}

// ============================================================
// Main component
// ============================================================

export const Marketplace = () => {
  const [exams, setExams] = useState<Exam[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      apiFetch('/api/exams').then((r) => r.json()).then(setExams).catch(() => {}),
      apiFetch('/api/plans').then((r) => r.json()).then(setPlans).catch(() => {}),
    ]).finally(() => setReady(true))
  }, [])

  const enrolledCodes = useMemo(
    () => new Set(plans.map((p) => p.examCode)),
    [plans],
  )

  const handleEnroll = useCallback(
    async (examCode: string) => {
      setEnrolling(examCode)
      try {
        const res = await apiFetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examCode }),
        })
        if (res.ok) {
          const plan = await res.json()
          setPlans((prev) => [...prev, plan])
          navigate(paths.app.plan.getHref(examCode))
        }
      } finally {
        setEnrolling(null)
      }
    },
    [navigate],
  )

  // Apply search + filter
  const matchingExams = useMemo(() => {
    const q = search.trim().toLowerCase()
    return exams.filter((e) => {
      const isEnrolled = enrolledCodes.has(e.code)
      const isComingSoon = e.visibility === 'coming-soon'

      if (filter === 'enrolled' && !isEnrolled) return false
      if (filter === 'available' && (isEnrolled || isComingSoon)) return false

      if (q) {
        const meta = EXAM_META[e.code]
        const haystack = [
          e.label,
          e.description,
          e.category,
          categoryLabel(e.category),
          ...(meta?.topicList ?? []),
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [exams, enrolledCodes, filter, search])

  // Group by category, preserving fixed order then alpha for unknowns.
  const grouped = useMemo(() => {
    const map = new Map<string, Exam[]>()
    for (const e of matchingExams) {
      if (!map.has(e.category)) map.set(e.category, [])
      map.get(e.category)!.push(e)
    }
    const ordered: Array<{ category: string; exams: Exam[] }> = []
    for (const cat of CATEGORY_ORDER) {
      const list = map.get(cat)
      if (list?.length) {
        ordered.push({ category: cat, exams: list })
        map.delete(cat)
      }
    }
    for (const [category, list] of [...map.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      ordered.push({ category, exams: list })
    }
    return ordered
  }, [matchingExams])

  // Pick the featured exam (admin-controlled via `featured` on the Exam schema).
  // Hidden when searching/filtering, or when the featured exam isn't live yet.
  // The CTA adapts to enrollment state, so admins can still verify their own change.
  const featured = useMemo(() => {
    if (filter !== 'all' || search.trim()) return null
    for (const exam of exams) {
      if (!exam.featured) continue
      if (exam.visibility === 'coming-soon') continue
      return { exam, meta: EXAM_META[exam.code] ?? {} }
    }
    return null
  }, [exams, filter, search])

  if (!ready) return <PageLoader />

  return (
    <div className="axeous-marketplace">
      <div className="wrap page-bottom">
        <header className="page-header">
          <div>
            <h1>Marketplace</h1>
            <p>Browse available exam prep plans. Add them to your study dashboard.</p>
          </div>
        </header>

        <div className="search-bar">
          <SearchIcon />
          <input
            className="search-input"
            placeholder="Search exams, topics, or categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="filter-pills">
            {(['all', 'enrolled', 'available'] as FilterMode[]).map((f) => (
              <button
                key={f}
                type="button"
                className={`filter-pill${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'enrolled' ? 'Enrolled' : 'Available'}
              </button>
            ))}
          </div>
        </div>

        {featured && (
          <FeaturedCard
            exam={featured.exam}
            meta={featured.meta}
            isEnrolled={enrolledCodes.has(featured.exam.code)}
            onEnroll={() => handleEnroll(featured.exam.code)}
            enrolling={enrolling === featured.exam.code}
          />
        )}

        {grouped.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No exams match</div>
            <div className="empty-sub">
              {search ? `Try a different search term.` : `Try switching the filter above.`}
            </div>
          </div>
        ) : (
          grouped.map(({ category, exams: catExams }) => (
            <div key={category} className="category">
              <div className="cat-head">
                <div
                  className="cat-dot"
                  style={{
                    background: categoryColor(category),
                    boxShadow: `0 0 8px ${categoryColor(category)}`,
                  }}
                />
                <span className="cat-name">{categoryLabel(category)}</span>
                <span className="cat-count">
                  {catExams.length} exam{catExams.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="exam-grid">
                {catExams.map((exam) => (
                  <ExamCard
                    key={exam.code}
                    exam={exam}
                    isEnrolled={enrolledCodes.has(exam.code)}
                    enrolling={enrolling === exam.code}
                    onEnroll={() => handleEnroll(exam.code)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ============================================================
// Featured card
// ============================================================

const FeaturedCard = ({
  exam,
  meta,
  isEnrolled,
  onEnroll,
  enrolling,
}: {
  exam: Exam
  meta: ExamMeta
  isEnrolled: boolean
  onEnroll: () => void
  enrolling: boolean
}) => (
  <div className="card featured-card">
    <div className="featured-badge">
      <span className="fb-star">★</span> Featured exam
    </div>
    <h2 className="featured-title">{exam.label}</h2>
    <p className="featured-desc">{exam.description}</p>
    {meta.topicList && meta.topicList.length > 0 && (
      <div className="exam-topics" style={{ marginBottom: 20 }}>
        {meta.topicList.map((t) => (
          <span key={t} className="exam-topic">{t}</span>
        ))}
      </div>
    )}
    {isEnrolled ? (
      <Link to={paths.app.plan.getHref(exam.code)} className="exam-btn enroll">
        View my plan <ArrowIcon size={13} />
      </Link>
    ) : (
      <button
        type="button"
        className="exam-btn enroll"
        onClick={onEnroll}
        disabled={enrolling}
      >
        {enrolling ? 'Adding…' : `Start ${exam.label} prep`} <ArrowIcon size={13} />
      </button>
    )}
  </div>
)

// ============================================================
// Exam card
// ============================================================

const ExamCard = ({
  exam,
  isEnrolled,
  enrolling,
  onEnroll,
}: {
  exam: Exam
  isEnrolled: boolean
  enrolling: boolean
  onEnroll: () => void
}) => {
  const meta = EXAM_META[exam.code]
  const tag = resolveTag(exam, isEnrolled)
  const style: CSSProperties = meta?.glow ? { ['--exam-glow' as string]: meta.glow } : {}

  return (
    <div className="card exam-card" style={style}>
      <div className="exam-top">
        <span className="exam-name">{exam.label}</span>
        <span className={`exam-tag tag-${tag}`}>{tagLabel(tag)}</span>
      </div>
      <p className="exam-desc">{exam.description}</p>

      {meta?.topicList && meta.topicList.length > 0 && (
        <div className="exam-topics">
          {meta.topicList.map((t) => (
            <span key={t} className="exam-topic">{t}</span>
          ))}
        </div>
      )}

      <div className="exam-actions">
        {isEnrolled ? (
          <>
            <button type="button" className="exam-btn enrolled" disabled>
              Enrolled <CheckIcon />
            </button>
            <Link to={paths.app.plan.getHref(exam.code)} className="exam-btn view">
              View plan <ArrowIcon size={12} />
            </Link>
          </>
        ) : tag === 'soon' ? (
          <button type="button" className="exam-btn soon" disabled>
            Coming soon
          </button>
        ) : (
          <button
            type="button"
            className="exam-btn enroll"
            onClick={onEnroll}
            disabled={enrolling}
          >
            {enrolling ? 'Adding…' : 'Enroll'} <ArrowIcon size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Icons
// ============================================================

const SearchIcon = () => (
  <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6" />
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const ArrowIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12h14M13 5l7 7-7 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

