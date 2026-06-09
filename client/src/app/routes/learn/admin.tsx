import { useState, useCallback } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { isOfficialPlanProgramPhaseAtLeast } from '@/config/feature-flags'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import {
  useGetAdminStats,
  useListAdminUsers,
  useListAdminExams,
  useListFlaggedQuestions,
  useDeleteAdminUser,
  useCreateAdminExam,
  useDeleteAdminQuestion,
  useDeleteOfficialTest,
  type AdminUser as UserEntry,
  type AdminExam as ExamEntry,
  type AdminStats as Stats,
  type FlaggedQuestion,
} from '@/features/learn/admin'

type Tab = 'overview' | 'exams' | 'users' | 'flagged'

export const AdminDashboard = () => {
  const [tab, setTab] = useState<Tab>('overview')
  const { data: stats = null, isLoading: statsLoading } = useGetAdminStats()
  const { data: users = [], isLoading: usersLoading } = useListAdminUsers()
  const { data: exams = [], isLoading: examsLoading } = useListAdminExams()
  const { data: flagged = [], isLoading: flaggedLoading } = useListFlaggedQuestions()
  const deleteUserMutation = useDeleteAdminUser()
  const createExamMutation = useCreateAdminExam()
  const deleteQuestionMutation = useDeleteAdminQuestion()
  const deleteOfficialTestMutation = useDeleteOfficialTest()
  const [deletingUser, setDeletingUser] = useState<string | null>(null)

  const ready = !statsLoading && !usersLoading && !examsLoading && !flaggedLoading

  const handleDeleteUser = useCallback(async (userId: string) => {
    await deleteUserMutation.mutateAsync(userId)
    setDeletingUser(null)
  }, [deleteUserMutation])

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
          {isOfficialPlanProgramPhaseAtLeast(1) && (
            <div className="flex items-center gap-3 pt-2 text-[11px]">
              <Link
                to={paths.app.adminCorpus.getHref()}
                className="text-[#4f8ef7] font-semibold hover:underline"
              >
                Corpus
              </Link>
              <span className="text-[#333]">·</span>
              <Link
                to={paths.app.adminGeneration.getHref()}
                className="text-[#4f8ef7] font-semibold hover:underline"
              >
                Generation
              </Link>
              {isOfficialPlanProgramPhaseAtLeast(2) && (
                <>
                  <span className="text-[#333]">·</span>
                  <Link
                    to={paths.app.adminContributors.getHref()}
                    className="text-[#4f8ef7] font-semibold hover:underline"
                  >
                    Contributors
                  </Link>
                </>
              )}
              {isOfficialPlanProgramPhaseAtLeast(3) && (
                <>
                  <span className="text-[#333]">·</span>
                  <Link
                    to={paths.app.adminReleases.getHref()}
                    className="text-[#4f8ef7] font-semibold hover:underline"
                  >
                    Releases
                  </Link>
                </>
              )}
            </div>
          )}
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
                  await createExamMutation.mutateAsync({
                    code: code.trim(),
                    label: label.trim(),
                    category: category.trim(),
                    description: '',
                  })
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
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
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
                        if (q.source === 'question-bank') {
                          await deleteQuestionMutation.mutateAsync(q._id)
                        } else if (q.testId) {
                          await deleteOfficialTestMutation.mutateAsync(q.testId)
                        }
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
