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
type CreatedInvite = { email: string; acceptUrl: string }

const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`

const buildAcceptUrl = (token: string) =>
  `${window.location.origin}${paths.app.contribute.accept.getHref(token)}`

export const AdminContributors = () => {
  const { data: exams = [], isLoading: examsLoading } = useListAdminExams()
  const { data: contributors = [], isLoading: contribLoading } = useListContributors()
  const { data: invites = [] } = useListContributorInvites()

  const [email, setEmail] = useState('')
  const [dailyCap, setDailyCap] = useState<number>(200)
  const [scopes, setScopes] = useState<ScopeDraft[]>([])
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedInvite | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const create = useCreateContributorInvite()
  const remove = useDeleteContributorInvite()

  const copyLink = async (key: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedKey(key)
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current))
      }, 1500)
    } catch {
      window.prompt('Copy this link:', url)
    }
  }

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
    setError(null)
    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    if (scopes.length === 0) {
      setError('At least one scope is required.')
      return
    }
    try {
      const result = await create.mutateAsync({
        email: email.trim(),
        scopes,
        dailyCap,
      })
      setCreated({ email: result.email, acceptUrl: result.acceptUrl })
      setEmail('')
      setScopes([])
    } catch (err) {
      setError(`Invite failed: ${(err as Error).message}`)
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
            Subject-matter experts who review pending questions. Generate an invite link tied to
            their email and send it however you like — no email is sent from here.
          </p>
        </div>

        <section className="space-y-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-[#bbb]">Create invite link</h2>

          <Row label="Email">
            <div className="flex-1 max-w-md space-y-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sme@example.com"
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-[#ddd]"
              />
              <p className="text-[10px] text-[#555]">
                Used to verify identity when they accept — invitee must sign in with this email.
              </p>
            </div>
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
              {create.isPending ? 'Creating…' : 'Create invite link'}
            </button>
            {error && <span className="text-[10px] text-[#ef4444]">{error}</span>}
          </div>

          {created && (
            <div className="rounded-md border border-[#4f8ef7]/40 bg-[#4f8ef7]/[0.06] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-[#4f8ef7]">
                  Invite ready
                </span>
                <span className="text-[10px] text-[#888]">for {created.email}</span>
                <button
                  onClick={() => setCreated(null)}
                  className="ml-auto text-[10px] text-[#555] hover:text-[#888]"
                  aria-label="Dismiss"
                >
                  Dismiss
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={created.acceptUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 bg-black/30 border border-white/[0.06] rounded-md px-3 py-1.5 text-xs font-mono text-[#ddd]"
                />
                <button
                  onClick={() => copyLink('created', created.acceptUrl)}
                  className="px-3 py-1.5 rounded-md bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-[#ddd]"
                >
                  {copiedKey === 'created' ? 'Copied' : 'Copy link'}
                </button>
              </div>
              <p className="text-[10px] text-[#888]">
                Send this link to {created.email} however you like (DM, text, etc.). It expires in
                14 days and can only be accepted by someone signed in with that email.
              </p>
            </div>
          )}
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
                    <>
                      <button
                        onClick={() => copyLink(inv._id, buildAcceptUrl(inv.token))}
                        className="text-[10px] text-[#4f8ef7] hover:underline"
                      >
                        {copiedKey === inv._id ? 'Copied' : 'Copy link'}
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Revoke invite to ${inv.email}?`)) return
                          await remove.mutateAsync(inv._id)
                        }}
                        className="text-[10px] text-[#ef4444] hover:underline"
                      >
                        Revoke
                      </button>
                    </>
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
