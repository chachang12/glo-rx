import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'

interface Stats {
  users: number
  plans: number
  sessions: number
  exams: number
}

interface UserEntry {
  _id: string
  authId: string
  firstName: string
  lastName: string
  username: string | null
  role: string
  licenses: { aiGeneration: boolean; customPlans: boolean }
  createdAt: string
}

interface ExamEntry {
  _id: string
  code: string
  label: string
  category: string
  description: string
  active: boolean
  visibility?: 'hidden' | 'coming-soon' | 'live'
  topics: string[]
}

interface FlaggedQuestion {
  _id: string
  testId: string | null
  testTitle: string | null
  examCode: string
  type: string
  stem: string
  reportCount: number
  source: 'question-bank' | 'official-test'
}

type Tab = 'overview' | 'exams' | 'users' | 'flagged'

export const AdminDashboard = () => {
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserEntry[]>([])
  const [exams, setExams] = useState<ExamEntry[]>([])
  const [flagged, setFlagged] = useState<FlaggedQuestion[]>([])
  const [ready, setReady] = useState(false)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      apiFetch('/api/admin/stats').then((r) => r.json()).then(setStats).catch(() => {}),
      apiFetch('/api/admin/users').then((r) => r.json()).then(setUsers).catch(() => {}),
      apiFetch('/api/admin/exams').then((r) => r.json()).then(setExams).catch(() => {}),
      apiFetch('/api/admin/flagged-questions').then((r) => r.ok ? r.json() : []).then(setFlagged).catch(() => {}),
    ]).finally(() => setReady(true))
  }, [])

  const handleDeleteUser = useCallback(async (userId: string) => {
    const res = await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u._id !== userId))
      setDeletingUser(null)
    }
  }, [])

  if (!ready) return <PageLoader />

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <Link to={paths.app.profile.getHref()} className="hover:text-[#888] transition-colors">Profile</Link>
            <span>/</span>
            <span className="text-[#888]">Admin</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
            Admin Dashboard
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1 w-fit">
          {(['overview', 'exams', 'users', 'flagged'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                tab === t
                  ? 'bg-[#4f8ef7]/10 text-[#4f8ef7]'
                  : 'text-[#555] hover:text-[#888]'
              }`}
            >
              {t === 'flagged' ? 'Flagged' : t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'flagged' && flagged.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#ef4444] text-[9px] font-bold text-white leading-none">
                  {flagged.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Users" value={stats.users} />
            <StatCard label="Plans" value={stats.plans} />
            <StatCard label="Sessions" value={stats.sessions} />
            <StatCard label="Exams" value={stats.exams} />
          </div>
        )}

        {/* Exams */}
        {tab === 'exams' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#bbb]">Official Exams ({exams.length})</h2>
              <button
                onClick={async () => {
                  const code = prompt('Exam code (e.g. dat):')
                  if (!code?.trim()) return
                  const label = prompt('Exam label (e.g. DAT):')
                  if (!label?.trim()) return
                  const category = prompt('Category (e.g. dental):')
                  if (!category?.trim()) return
                  const res = await apiFetch('/api/admin/exams', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: code.trim(), label: label.trim(), category: category.trim(), description: '' }),
                  })
                  if (res.ok) {
                    const created = await res.json()
                    setExams((prev) => [...prev, created])
                  }
                }}
                className="text-[10px] font-semibold text-[#4f8ef7] hover:underline"
              >
                + Create exam
              </button>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
              {exams.map((exam, i) => (
                <Link
                  key={exam._id}
                  to={paths.app.adminExam.getHref(exam.code)}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-all ${
                    i > 0 ? 'border-t border-white/[0.04]' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#e8e6f0]">{exam.label}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        exam.visibility === 'live'
                          ? 'bg-[#10b981]/10 text-[#10b981]'
                          : exam.visibility === 'coming-soon'
                            ? 'bg-[#eab308]/10 text-[#eab308]'
                            : 'bg-white/[0.04] text-[#555]'
                      }`}>
                        {exam.visibility === 'live' ? 'Live' : exam.visibility === 'coming-soon' ? 'Coming Soon' : 'Hidden'}
                      </span>
                    </div>
                    <p className="text-xs text-[#555] mt-0.5">
                      {exam.category} — {exam.topics.length} topics — {exam.description}
                    </p>
                  </div>
                  <span className="text-xs text-[#555]">&rarr;</span>
                </Link>
              ))}
              {exams.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-[#555]">No exams found</div>
              )}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#bbb]">Users ({users.length})</h2>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-widest text-[#555]">
                <span>Name</span>
                <span>Role</span>
                <span>Licenses</span>
                <span>Joined</span>
                <span></span>
              </div>

              {users.map((user) => (
                <div
                  key={user._id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-t border-white/[0.04] hover:bg-white/[0.02] transition-all items-center"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#e8e6f0] truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    {user.username && <p className="text-xs text-[#555]">@{user.username}</p>}
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    user.role === 'admin'
                      ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]'
                      : 'bg-white/[0.04] text-[#555]'
                  }`}>
                    {user.role}
                  </span>

                  <div className="flex items-center gap-1">
                    {user.licenses?.aiGeneration && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#4f8ef7]/10 text-[#4f8ef7]">AI</span>
                    )}
                    {user.licenses?.customPlans && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#10b981]/10 text-[#10b981]">Plans</span>
                    )}
                    {!user.licenses?.aiGeneration && !user.licenses?.customPlans && (
                      <span className="text-[10px] text-[#555]">—</span>
                    )}
                  </div>

                  <span className="text-xs text-[#555] tabular-nums">
                    {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>

                  <div>
                    {user.role !== 'admin' && (
                      deletingUser === user._id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDeletingUser(null)}
                            className="px-2 py-1 rounded text-[10px] font-semibold text-[#888] hover:text-[#ddd]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="px-2 py-1 rounded bg-[#ef4444] text-[10px] font-semibold text-white"
                          >
                            Confirm
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingUser(user._id)}
                          className="px-2 py-1 rounded text-[10px] font-semibold text-[#555] hover:text-[#ef4444] transition-colors"
                        >
                          Delete
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flagged Questions */}
        {tab === 'flagged' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#bbb]">
              Reported Questions ({flagged.length})
            </h2>
            {flagged.length > 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                {flagged.map((q, i) => (
                  <div
                    key={`${q.source}-${q._id}`}
                    className={`flex items-start gap-4 px-5 py-4 ${i > 0 ? 'border-t border-white/[0.04]' : ''}`}
                  >
                    <div className="flex-shrink-0 pt-0.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ef4444]/10 text-[11px] font-bold text-[#ef4444] tabular-nums">
                        {q.reportCount}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm text-[#ddd] line-clamp-2">{q.stem}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.04] text-[#555]">
                          {q.type}
                        </span>
                        <span className="text-[10px] text-[#555]">{q.examCode}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          q.source === 'official-test'
                            ? 'bg-[#4f8ef7]/10 text-[#4f8ef7]'
                            : 'bg-[#8b5cf6]/10 text-[#8b5cf6]'
                        }`}>
                          {q.source === 'official-test' ? `Test: ${q.testTitle}` : 'Question Bank'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const endpoint = q.source === 'question-bank'
                          ? `/api/admin/questions/${q._id}`
                          : `/api/admin/official-tests/${q.testId}`
                        const res = await apiFetch(endpoint, { method: 'DELETE' })
                        if (res.ok) setFlagged((prev) => prev.filter((f) => f._id !== q._id))
                      }}
                      className="px-2 py-1 rounded text-[10px] font-semibold text-[#555] hover:text-[#ef4444] transition-colors flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] p-8 text-center">
                <p className="text-sm text-[#888]">No flagged questions</p>
                <p className="text-xs text-[#555] mt-1">Questions reported by 5+ users will appear here</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 space-y-1">
    <p className="text-2xl font-bold text-[#e8e6f0] tabular-nums">{value}</p>
    <p className="text-xs text-[#555]">{label}</p>
  </div>
)
