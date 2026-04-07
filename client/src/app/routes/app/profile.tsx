import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { authClient } from '@/lib/auth-client'
import { useUser, UserAvatar } from '@/features/auth'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'

export const Profile = () => {
  const { user } = useUser()
  const navigate = useNavigate()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSignOut = async () => {
    await authClient.signOut()
    navigate(paths.home.getHref())
  }

  const handleDeleteAccount = async () => {
    await apiFetch('/api/user/me', { method: 'DELETE' })
    await authClient.signOut()
    navigate(paths.home.getHref())
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-8">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Header */}
        <div className="space-y-3">
          <Link
            to={paths.app.dashboard.getHref()}
            className="inline-flex items-center gap-1.5 text-xs text-[#888] hover:text-[#4f8ef7] transition-colors"
          >
            &larr; Back to dashboard
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
              Profile
            </h1>
            <p className="text-sm text-[#888]">
              Manage your account and preferences
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-6 flex items-center gap-5">
          <UserAvatar name={user.name} size="lg" />
          <div className="space-y-1">
            <p className="text-lg font-semibold text-[#e8e6f0]">{user.name}</p>
            <p className="text-sm text-[#888]">{user.email}</p>
          </div>
        </div>

        {/* Subscription */}
        <Section title="Subscription">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#ddd]">Free Plan</p>
              <p className="text-xs text-[#888] mt-0.5">
                Upgrade for unlimited practice tests and advanced analytics
              </p>
            </div>
            <button
              disabled
              className="px-4 py-2 rounded-lg border border-[#1e1e2e] bg-[#13131f] text-xs font-semibold text-[#555] cursor-not-allowed"
            >
              Coming soon
            </button>
          </div>
        </Section>

        {/* Account Actions */}
        <Section title="Account">
          <div className="space-y-3">
            <ActionRow
              label="Sign out"
              description="Sign out of your account on this device"
              button={
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-lg border border-[#1e1e2e] bg-[#13131f] text-xs font-semibold text-[#ddd] hover:border-[#4f8ef7]/40 hover:text-[#4f8ef7] transition-all"
                >
                  Sign out
                </button>
              }
            />
            <div className="border-t border-[#1e1e2e]" />
            <ActionRow
              label="Export data"
              description="Download all your test history and profile data"
              button={
                <button
                  disabled
                  className="px-4 py-2 rounded-lg border border-[#1e1e2e] bg-[#13131f] text-xs font-semibold text-[#555] cursor-not-allowed"
                >
                  Coming soon
                </button>
              }
            />
            <div className="border-t border-[#1e1e2e]" />
            <ActionRow
              label="Delete account"
              description="Permanently delete your account and all associated data"
              button={
                !showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 text-xs font-semibold text-[#ef4444] hover:border-[#ef4444]/60 transition-all"
                  >
                    Delete
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-2 rounded-lg border border-[#1e1e2e] bg-[#13131f] text-xs font-semibold text-[#888] hover:text-[#ddd] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="px-3 py-2 rounded-lg bg-[#ef4444] text-xs font-semibold text-white hover:bg-[#ef4444]/90 transition-all"
                    >
                      Confirm delete
                    </button>
                  </div>
                )
              }
            />
          </div>
        </Section>
      </div>
    </div>
  )
}

const Section = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <div className="space-y-4">
    <h2 className="text-sm font-semibold text-[#bbb]">{title}</h2>
    <div className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-5">
      {children}
    </div>
  </div>
)

const ActionRow = ({
  label,
  description,
  button,
}: {
  label: string
  description: string
  button: React.ReactNode
}) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-semibold text-[#ddd]">{label}</p>
      <p className="text-xs text-[#888] mt-0.5">{description}</p>
    </div>
    {button}
  </div>
)
