import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'

interface ExamData {
  _id: string
  code: string
  label: string
  category: string
  description: string
  active: boolean
  visibility: 'hidden' | 'coming-soon' | 'live'
  topics: string[]
  aiReferenceText: string
  aiReferenceFileName: string | null
}

interface OfficialTestEntry {
  _id: string
  title: string
  questionCount: number
  createdAt: string
}

interface QuestionBankEntry {
  _id: string
  stem: string
  type: string
  topics: string[]
}

export const AdminExamEditor = () => {
  const { code } = useParams()
  const [exam, setExam] = useState<ExamData | null>(null)
  const [officialTests, setOfficialTests] = useState<OfficialTestEntry[]>([])
  const [questions, setQuestions] = useState<QuestionBankEntry[]>([])
  const [ready, setReady] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newTopic, setNewTopic] = useState('')

  useEffect(() => {
    if (!code) return
    Promise.all([
      apiFetch(`/api/admin/exams/${code}`)
        .then((r) => { if (!r.ok) { setNotFound(true); return null } return r.json() })
        .then((data) => { if (data) setExam(data) })
        .catch(() => setNotFound(true)),
      apiFetch(`/api/admin/exams/${code}/official-tests`)
        .then((r) => r.ok ? r.json() : [])
        .then(setOfficialTests)
        .catch(() => {}),
      apiFetch(`/api/admin/exams/${code}/questions`)
        .then((r) => r.ok ? r.json() : [])
        .then(setQuestions)
        .catch(() => {}),
    ]).finally(() => setReady(true))
  }, [code])

  const save = useCallback(async (updates: Record<string, unknown>) => {
    if (!code) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await apiFetch(`/api/admin/exams/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updated = await res.json()
        setExam(updated)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }, [code])

  const downloadJson = useCallback((data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const downloadTestSchema = useCallback(() => {
    if (!exam) return
    const schema = {
      _comment: `Test schema for ${exam.label}. Fill in questions and upload this file.`,
      title: `${exam.label} Practice Test 1`,
      description: 'A comprehensive practice exam',
      timeLimit: 90,
      questions: [
        {
          type: 'mcq',
          stem: 'Replace with question text',
          options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
          answer: ['A'],
          explanation: 'Explanation of why A is correct',
          topics: exam.topics.length > 0 ? [exam.topics[0]] : ['Topic Name'],
          difficulty: 'medium',
        },
        {
          type: 'sata',
          stem: 'Select all that apply question',
          options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
          answer: ['A', 'C'],
          explanation: 'A and C are correct because...',
          topics: exam.topics.length > 1 ? [exam.topics[1]] : ['Topic Name'],
          difficulty: 'hard',
        },
      ],
      _valid_types: ['mcq', 'sata', 'ordered'],
      _valid_difficulties: ['easy', 'medium', 'hard'],
      _available_topics: exam.topics,
    }
    downloadJson(schema, `${exam.code}-test-schema.json`)
  }, [exam, downloadJson])

  const downloadQuestionSchema = useCallback(() => {
    if (!exam) return
    const schema = {
      _comment: `Question bank schema for ${exam.label}. Add questions and upload this file.`,
      questions: [
        {
          type: 'mcq',
          stem: 'Replace with question text',
          options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
          answer: ['A'],
          explanation: 'Explanation of why A is correct',
          topics: exam.topics.length > 0 ? [exam.topics[0]] : ['Topic Name'],
          difficulty: 'medium',
        },
        {
          type: 'sata',
          stem: 'Select all that apply question',
          options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
          answer: ['A', 'C'],
          explanation: 'A and C are correct because...',
          topics: exam.topics.length > 1 ? [exam.topics[1]] : ['Topic Name'],
          difficulty: 'easy',
        },
      ],
      _valid_types: ['mcq', 'sata', 'ordered'],
      _valid_difficulties: ['easy', 'medium', 'hard'],
      _available_topics: exam.topics,
    }
    downloadJson(schema, `${exam.code}-question-schema.json`)
  }, [exam, downloadJson])

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDeleteExam = useCallback(async () => {
    if (!code) return
    const res = await apiFetch(`/api/admin/exams/${code}`, { method: 'DELETE' })
    if (res.ok) {
      const { useNavigate } = await import('react-router')
      window.location.href = paths.app.admin.getHref()
    }
  }, [code])

  const addTopic = () => {
    if (!newTopic.trim() || !exam) return
    const updated = [...exam.topics, newTopic.trim()]
    setNewTopic('')
    save({ topics: updated })
  }

  const removeTopic = (index: number) => {
    if (!exam) return
    const updated = exam.topics.filter((_, i) => i !== index)
    save({ topics: updated })
  }

  if (!ready) return <PageLoader />

  if (notFound || !exam) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center space-y-4 py-16">
          <p className="text-sm text-[#888]">Exam not found</p>
          <Link to={paths.app.admin.getHref()} className="text-xs text-[#4f8ef7] hover:underline">
            Back to admin
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#555]">
          <Link to={paths.app.admin.getHref()} className="hover:text-[#888] transition-colors">Admin</Link>
          <span>/</span>
          <span className="text-[#888]">{exam.label}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
                {exam.label}
              </h1>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                exam.active
                  ? 'bg-[#10b981]/10 text-[#10b981]'
                  : 'bg-white/[0.04] text-[#555]'
              }`}>
                {exam.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-[#555] font-mono">{exam.code}</p>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-[#888]">Saving...</span>}
            {saved && <span className="text-xs text-[#10b981]">Saved</span>}
          </div>
        </div>

        {/* General */}
        <Section title="General">
          <div className="space-y-4">
            <Field label="Label">
              <input
                type="text"
                value={exam.label}
                onChange={(e) => setExam({ ...exam, label: e.target.value })}
                onBlur={() => save({ label: exam.label })}
                className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-[#ddd] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40"
              />
            </Field>
            <Field label="Category">
              <input
                type="text"
                value={exam.category}
                onChange={(e) => setExam({ ...exam, category: e.target.value })}
                onBlur={() => save({ category: exam.category })}
                className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-[#ddd] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40"
              />
            </Field>
            <Field label="Description">
              <input
                type="text"
                value={exam.description}
                onChange={(e) => setExam({ ...exam, description: e.target.value })}
                onBlur={() => save({ description: exam.description })}
                className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-[#ddd] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40"
              />
            </Field>
            <Field label="Visibility">
              <div className="flex items-center gap-2">
                {(['hidden', 'coming-soon', 'live'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => save({ visibility: v, active: v === 'live' })}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      exam.visibility === v
                        ? v === 'live'
                          ? 'border border-[#10b981]/30 bg-[#10b981]/5 text-[#10b981]'
                          : v === 'coming-soon'
                            ? 'border border-[#eab308]/30 bg-[#eab308]/5 text-[#eab308]'
                            : 'border border-white/[0.15] bg-white/[0.06] text-[#888]'
                        : 'border border-white/[0.08] bg-white/[0.03] text-[#555] hover:text-[#888]'
                    }`}
                  >
                    {v === 'hidden' ? 'Hidden' : v === 'coming-soon' ? 'Coming Soon' : 'Live'}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Section>

        {/* Topics */}
        <Section title={`Topics (${exam.topics.length})`}>
          <div className="space-y-3">
            {exam.topics.map((topic, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2"
              >
                <span className="text-sm text-[#ddd]">{topic}</span>
                <button
                  onClick={() => removeTopic(i)}
                  className="text-[#555] hover:text-[#ef4444] transition-colors text-lg leading-none"
                >
                  &times;
                </button>
              </div>
            ))}

            <div className="flex gap-2">
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                placeholder="Add a topic..."
                className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-[#ddd] placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40"
              />
              <button
                onClick={addTopic}
                disabled={!newTopic.trim()}
                className="px-4 py-2 rounded-lg border border-[#4f8ef7]/30 bg-[#4f8ef7]/5 text-xs font-semibold text-[#4f8ef7] hover:border-[#4f8ef7]/60 transition-all disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </Section>

        {/* AI Reference */}
        <Section title="AI Reference File">
          <div className="space-y-3">
            <p className="text-xs text-[#555]">
              Upload a markdown file that gets appended to the AI system prompt when generating flashcards or questions for this exam.
            </p>

            {exam.aiReferenceFileName ? (
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#4f8ef7]/10 border border-[#4f8ef7]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#4f8ef7]">MD</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#ddd] truncate">{exam.aiReferenceFileName}</p>
                    <p className="text-[10px] text-[#555]">{exam.aiReferenceText.length.toLocaleString()} characters</p>
                  </div>
                </div>
                <button
                  onClick={() => save({ aiReferenceText: '', aiReferenceFileName: null })}
                  className="px-3 py-1.5 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 text-xs font-semibold text-[#ef4444] hover:border-[#ef4444]/60 transition-all flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="block cursor-pointer">
                <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] p-8 hover:border-[#4f8ef7]/30 transition-all">
                  <UploadIcon />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#ddd]">Drop a markdown file here</p>
                    <p className="text-xs text-[#555] mt-1">.md or .txt</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".md,.txt,.markdown"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const text = await file.text()
                    save({ aiReferenceText: text, aiReferenceFileName: file.name })
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>
        </Section>

        {/* Official Tests */}
        <SectionWithAction
          title={`Official Tests (${officialTests.length})`}
          action={
            <button onClick={downloadTestSchema} className="text-[10px] font-semibold text-[#4f8ef7] hover:underline">
              Download schema
            </button>
          }
        >
          <div className="space-y-3">
            {officialTests.map((test) => (
              <div key={test._id} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-[#ddd] truncate">{test.title}</p>
                  <p className="text-[10px] text-[#555]">{test.questionCount} questions</p>
                </div>
                <button
                  onClick={async () => {
                    const res = await apiFetch(`/api/admin/official-tests/${test._id}`, { method: 'DELETE' })
                    if (res.ok) setOfficialTests((prev) => prev.filter((t) => t._id !== test._id))
                  }}
                  className="text-[#555] hover:text-[#ef4444] transition-colors text-lg leading-none px-1 flex-shrink-0"
                >
                  &times;
                </button>
              </div>
            ))}

            <label className="block cursor-pointer">
              <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] p-6 hover:border-[#4f8ef7]/30 transition-all">
                <UploadIcon />
                <p className="text-xs text-[#ddd]">Upload test JSON</p>
                <p className="text-[10px] text-[#555]">{"{ title, questions: [{ stem, options, answer, topics?, explanation? }] }"}</p>
              </div>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !code) return
                  try {
                    const text = await file.text()
                    const data = JSON.parse(text)
                    const res = await apiFetch(`/api/admin/exams/${code}/official-tests`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data),
                    })
                    if (res.ok) {
                      const created = await res.json()
                      setOfficialTests((prev) => [created, ...prev])
                    }
                  } catch { /* invalid JSON */ }
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </SectionWithAction>

        {/* Question Bank */}
        <SectionWithAction
          title={`Question Bank (${questions.length})`}
          action={
            <button onClick={downloadQuestionSchema} className="text-[10px] font-semibold text-[#4f8ef7] hover:underline">
              Download schema
            </button>
          }
        >
          <div className="space-y-3">
            {questions.slice(0, 20).map((q) => (
              <div key={q._id} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#ddd] truncate">{q.stem}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#555]">{q.type}</span>
                    {q.topics.slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px] text-[#4f8ef7] bg-[#4f8ef7]/10 px-1 rounded">{t}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const res = await apiFetch(`/api/admin/questions/${q._id}`, { method: 'DELETE' })
                    if (res.ok) setQuestions((prev) => prev.filter((x) => x._id !== q._id))
                  }}
                  className="text-[#555] hover:text-[#ef4444] transition-colors text-lg leading-none px-1 flex-shrink-0"
                >
                  &times;
                </button>
              </div>
            ))}
            {questions.length > 20 && (
              <p className="text-xs text-[#555] text-center">Showing 20 of {questions.length}</p>
            )}

            <label className="block cursor-pointer">
              <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] p-6 hover:border-[#4f8ef7]/30 transition-all">
                <UploadIcon />
                <p className="text-xs text-[#ddd]">Upload questions JSON</p>
                <p className="text-[10px] text-[#555]">{"{ questions: [{ stem, options, answer, topics?, explanation? }] }"}</p>
              </div>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !code) return
                  try {
                    const text = await file.text()
                    const data = JSON.parse(text)
                    const res = await apiFetch(`/api/admin/exams/${code}/questions/bulk`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data),
                    })
                    if (res.ok) {
                      // Reload questions
                      const refreshed = await apiFetch(`/api/admin/exams/${code}/questions`)
                      if (refreshed.ok) setQuestions(await refreshed.json())
                    }
                  } catch { /* invalid JSON */ }
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </SectionWithAction>

        {/* Danger Zone */}
        <Section title="Danger zone">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#ddd]">Delete exam</p>
              <p className="text-xs text-[#888] mt-0.5">Permanently remove this exam and all associated data</p>
            </div>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 text-xs font-semibold text-[#ef4444] hover:border-[#ef4444]/60 transition-all flex-shrink-0"
              >
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-[#888] hover:text-[#ddd] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteExam}
                  className="px-3 py-2 rounded-lg bg-[#ef4444] text-xs font-semibold text-white hover:bg-[#ef4444]/90 transition-all"
                >
                  Confirm delete
                </button>
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  )
}

const SectionWithAction = ({ title, action, children }: { title: string; action: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-[#bbb]">{title}</h2>
      {action}
    </div>
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
      {children}
    </div>
  </div>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <h2 className="text-sm font-semibold text-[#bbb]">{title}</h2>
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
      {children}
    </div>
  </div>
)

const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-[#888]">{label}</label>
    <div>{children}</div>
  </div>
)
