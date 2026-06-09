import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import {
  useCreateContributorInvite,
  useDeleteContributorInvite,
  useListAdminExams,
  useListContributorInvites,
  useListContributors,
} from '@/features/learn/admin'

type ScopeDraft = { examCode: string; rateCents: number }

const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`

export const AdminContributors = () => {
  const { data: exams = [], isLoading: examsLoading } = useListAdminExams()
  const { data: contributors = [], isLoading: contribLoading } = useListContributors()
  const { data: invites = [] } = useListContributorInvites()

  const [email, setEmail] = useState('')
  const [dailyCap, setDailyCap] = useState<number>(200)
  const [scopes, setScopes] = useState<ScopeDraft[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)

  const create = useCreateContributorInvite()
  const remove = useDeleteContributorInvite()

  const availableExams = useMemo(
    () => exams.filter((e) => !scopes.some((s) => s.examCode === e.code)),
    [exams, scopes]
  )

  const addScope = (examCode: string) => {
    setScopes((prev) => [...prev, { examCode, rateCents: 100 }])
  }
  const updateScope = (i: number, rateCents: number) => {
    setScopes((prev) => prev.map((s, idx) => (idx === i ? { ...s, rateCents } : s)))
  }
  const removeScope = (i: number) => {
    setScopes((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleInvite = async () => {
    setFeedback(null)
    if (!email.trim()) {
      setFeedback('Email is required.')
      return
    }
    if (scopes.length === 0) {
      setFeedback('At least one scope is required.')
      return
    }
    try {
      const result = await create.mutateAsync({
        email: email.trim(),
        scopes,
        dailyCap,
      })
      setFeedback(`Invite sent. Accept URL: ${result.acceptUrl}`)
      setEmail('')
      setScopes([])
    } catch (err) {
      setFeedback(`Invite failed: ${(err as Error).message}`)
    }
  }

  if (examsLoading || contribLoading) return <PageLoader />

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <Link to={paths.app.admin.getHref()} className="hover:text-[#888]">
              Admin
            </Link>
            <span>/</span>
            <span className="text-[#888]">Contributors</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">Contributors</h1>
          <p className="text-xs text-[#555]">
            Subject-matter experts who review pending questions. Invite by email with one or more
            scopes (exam + per-review rate).
          </p>
        </div>

        <section className="space-y-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-[#bbb]">Invite</h2>

          <Row label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sme@example.com"
              className="flex-1 max-w-md bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-[#ddd]"
            />
          </Row>

          <Row label="Daily cap">
            <input
              type="number"
              min={0}
              max={1000}
              value={dailyCap}
              onChange={(e) => setDailyCap(Math.max(0, Number(e.target.value) || 0))}
              className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-[#ddd] w-24"
            />
            <span className="text-[10px] text-[#555] ml-2">billable reviews / 24h</span>
          </Row>

          <Row label="Scopes">
            <div className="flex-1 space-y-2">
              {scopes.length === 0 && (
                <p className="text-[10px] text-[#555]">No scopes yet — add one below.</p>
              )}
              {scopes.map((s, i) => (
                <div key={s.examCode} className="flex items-center gap-2 text-xs">
                  <span className="font-mono uppercase text-[#ddd] w-20">{s.examCode}</span>
                  <span className="text-[#555]">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={(s.rateCents / 100).toFixed(2)}
                    onChange={(e) =>
                      updateScope(i, Math.round(Number(e.target.value) * 100) || 0)
                    }
                    className="bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-1 text-xs text-[#ddd] w-20"
                  />
                  <span className="text-[10px] text-[#555]">per review</span>
                  <button
                    onClick={() => removeScope(i)}
                    className="ml-auto text-[10px] text-[#ef4444] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {availableExams.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addScope(e.target.value)
                      e.currentTarget.value = ''
                    }
                  }}
                  className="bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-1 text-xs text-[#888]"
                >
                  <option value="">+ Add exam scope</option>
                  {availableExams.map((exam) => (
                    <option key={exam._id} value={exam.code}>
                      {exam.label} ({exam.code})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </Row>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleInvite}
              disabled={create.isPending}
              className="px-4 py-2 rounded-md bg-[#4f8ef7] text-xs font-semibold text-white disabled:opacity-50"
            >
              {create.isPending ? 'Sending…' : 'Send invite'}
            </button>
            {feedback && (
              <span className="text-[10px] text-[#888] break-all">{feedback}</span>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#bbb]">
            Open invites ({invites.filter((i) => !i.acceptedAt).length})
          </h2>
          {invites.length === 0 ? (
            <p className="text-xs text-[#555]">No invites.</p>
          ) : (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
              {invites.map((inv) => (
                <div key={inv._id} className="px-4 py-3 text-xs flex items-center gap-3">
                  <span className="text-[#ddd]">{inv.email}</span>
                  <span className="text-[10px] text-[#555]">
                    {inv.scopes.map((s) => s.examCode).join(', ')}
                  </span>
                  {inv.acceptedAt ? (
                    <span className="text-[10px] text-[#10b981] uppercase">Accepted</span>
                  ) : (
                    <span className="text-[10px] text-[#facc15] uppercase">Pending</span>
                  )}
                  <span className="ml-auto text-[10px] text-[#555]">
                    Exp {new Date(inv.expiresAt).toLocaleDateString()}
                  </span>
                  {!inv.acceptedAt && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Revoke invite to ${inv.email}?`)) return
                        await remove.mutateAsync(inv._id)
                      }}
                      className="text-[10px] text-[#ef4444] hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#bbb]">
            Active contributors ({contributors.length})
          </h2>
          {contributors.length === 0 ? (
            <p className="text-xs text-[#555]">No contributors yet.</p>
          ) : (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
              {contributors.map((c) => (
                <div key={c._id} className="px-4 py-3 text-xs grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                  <div>
                    <div className="text-[#ddd]">
                      {c.firstName} {c.lastName}{' '}
                      {c.username && <span className="text-[#888]">@{c.username}</span>}
                    </div>
                    <div className="text-[10px] text-[#555] mt-0.5">
                      {(c.contributor?.scopes ?? [])
                        .map((s) => `${s.examCode} (${fmtUsd(s.rateCents)})`)
                        .join(' · ') || 'No scopes'}
                    </div>
                  </div>
                  <span className="text-[10px] text-[#888]">
                    Cap {c.contributor?.dailyCap ?? '—'}
                  </span>
                  <span className="text-[10px] text-[#888] tabular-nums">
                    {c.contributor
                      ? `${(c.contributor.reliabilityScore * 100).toFixed(0)}% rel`
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-4">
    <span className="text-xs font-semibold text-[#888] w-32 flex-shrink-0 pt-1">{label}</span>
    <div className="flex-1 flex items-center flex-wrap gap-2">{children}</div>
  </div>
)
