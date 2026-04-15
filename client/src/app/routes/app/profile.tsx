import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router'
import { authClient } from '@/lib/auth-client'
import { useUser, UserAvatar } from '@/features/auth'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'

export const Profile = () => {
  const { user } = useUser()
  const navigate = useNavigate()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    apiFetch('/api/user/me')
      .then((r) => r.json())
      .then((u) => { if (u.role === 'admin') setIsAdmin(true) })
      .catch(() => {})
  }, [])

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
    <div className="p-8">
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
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 flex items-center gap-5">
          <UserAvatar name={user.name} size="lg" />
          <div className="space-y-1">
            <p className="text-lg font-semibold text-[#e8e6f0]">{user.name}</p>
            <p className="text-sm text-[#888]">{user.email}</p>
          </div>
        </div>

        {/* Admin */}
        {isAdmin && (
          <Link
            to={paths.app.admin.getHref()}
            className="flex items-center justify-between rounded-2xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/5 p-5 hover:border-[#8b5cf6]/40 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center">
                <ShieldIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#ddd]">Admin Dashboard</p>
                <p className="text-xs text-[#888]">Manage platform, users, and plans</p>
              </div>
            </div>
            <span className="text-xs text-[#555]">&rarr;</span>
          </Link>
        )}

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
              className="px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-[#555] cursor-not-allowed"
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
                  className="px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-[#ddd] hover:border-[#4f8ef7]/30 hover:text-[#4f8ef7] transition-all"
                >
                  Sign out
                </button>
              }
            />
            <div className="border-t border-white/[0.06]" />
            <ActionRow
              label="Export data"
              description="Download all your test history and profile data"
              button={
                <button
                  disabled
                  className="px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-[#555] cursor-not-allowed"
                >
                  Coming soon
                </button>
              }
            />
            <div className="border-t border-white/[0.06]" />
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
                      className="px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-[#888] hover:text-[#ddd] transition-all"
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
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
      {children}
    </div>
  </div>
)

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
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
