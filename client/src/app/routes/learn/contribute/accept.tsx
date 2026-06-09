import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { paths } from '@/config/paths'
import { PageLoader } from '@/features/shared/ui/PageLoader'
import { useAcceptInvite, useGetInviteDetails } from '@/features/learn/contribute'

const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`

export const ContributorAccept = () => {
  const { token } = useParams<{ token: string }>()
  const { data: invite, isLoading, error } = useGetInviteDetails(token)
  const accept = useAcceptInvite()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  if (isLoading) return <PageLoader />

  if (error || !invite) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 p-6 text-sm text-[#ef4444]">
          {(error as Error | null)?.message ?? 'Invite not found.'}
        </div>
      </div>
    )
  }

  const handleAccept = async () => {
    if (!token) return
    setSubmitting(true)
    setErrMsg(null)
    try {
      await accept.mutateAsync(token)
      navigate(paths.app.contribute.queue.getHref(), { replace: true })
    } catch (err) {
      setErrMsg((err as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-md mx-auto rounded-lg border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
        <header className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-[#e8e6f0]">
            Contributor invite
          </h1>
          <p className="text-xs text-[#888]">For {invite.email}</p>
        </header>

        <div className="space-y-2 text-xs">
          <Row label="Scopes">
            <ul className="space-y-0.5">
              {invite.scopes.map((s) => (
                <li key={s.examCode} className="text-[#ddd]">
                  {s.examCode}{' '}
                  <span className="text-[#888]">({fmtUsd(s.rateCents)} / review)</span>
                </li>
              ))}
            </ul>
          </Row>
          <Row label="Daily cap">
            <span className="text-[#ddd]">{invite.dailyCap} reviews</span>
          </Row>
          <Row label="Expires">
            <span className="text-[#ddd]">{new Date(invite.expiresAt).toLocaleString()}</span>
          </Row>
        </div>

        {errMsg && (
          <div className="rounded-md bg-[#ef4444]/10 text-[#ef4444] text-xs px-3 py-2">
            {errMsg}
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={submitting}
          className="w-full px-4 py-2.5 rounded-md bg-[#4f8ef7] text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Accepting…' : 'Accept invite'}
        </button>

        <p className="text-[10px] text-[#555] text-center">
          You must be signed in as {invite.email} to accept.
        </p>
      </div>
    </div>
  )
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex gap-4">
    <span className="text-[#888] w-20 flex-shrink-0">{label}</span>
    <div className="flex-1">{children}</div>
  </div>
)
