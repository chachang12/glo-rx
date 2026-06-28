import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { authClient } from '@/lib/auth-client'
import { useUser } from '@/features/shared/auth'
import { paths } from '@/config/paths'
import { useGetMe, useGetMyStats, useDeleteMe } from '@/features/shared/user'
import { useGetSubscription } from '@/features/shared/billing'
import { useTheme } from '@/components/theme-provider'
import './profile.css'

export const Profile = () => {
  const { user } = useUser()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { data: stats = null } = useGetMyStats()
  const { data: appUser } = useGetMe()
  const { data: subscription } = useGetSubscription()
  const deleteMeMutation = useDeleteMe()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isAdmin = appUser?.role === 'admin'
  const isContributor = appUser?.role === 'contributor' && !!appUser.contributor
  const isPro = subscription?.tier === 'pro'

  const handleSignOut = async () => {
    await authClient.signOut()
    navigate(paths.home.getHref())
  }

  const handleDeleteAccount = async () => {
    setDeleteError(null)
    try {
      await deleteMeMutation.mutateAsync()
    } catch {
      setDeleteError('Could not delete your account. Please try again.')
      return
    }
    try {
      await authClient.signOut()
    } catch {
      // Account is already deleted server-side; force the user back to a
      // signed-out state rather than leaving stale auth in place.
    }
    navigate(paths.home.getHref())
  }

  if (!user) return null

  const initials = getInitials(user.name)
  const streak = stats?.streak ?? 0
  const accuracy = stats?.accuracy
  const totalQuestions = stats?.totalQuestions ?? 0
  const planLabel = stats?.nextExamLabel ?? 'No active plan'

  return (
    <div className="axeous-profile">
      <div className="wrap page-bottom">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to={paths.app.dashboard.getHref()}>← Back to dashboard</Link>
        </nav>
        <h1 className="page-title">Profile</h1>
        <p className="page-sub">Manage your account and preferences</p>

        {/* HERO */}
        <div className="card profile-hero">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-info">
            <h2 className="profile-name">{user.name ?? 'Axeous user'}</h2>
            <p className="profile-email">{user.email ?? ''}</p>
            <div className="profile-badges">
              <div className="profile-badge" style={{ color: 'var(--green)' }}>Active</div>
              {isAdmin && (
                <div className="profile-badge" style={{ color: 'var(--violet)' }}>Admin</div>
              )}
              {isContributor && (
                <div className="profile-badge" style={{ color: 'var(--blue)' }}>Contributor</div>
              )}
              {stats?.nextExamLabel && (
                <div className="profile-badge">{planLabel}</div>
              )}
              {streak > 0 && (
                <div className="profile-badge">{streak}d streak</div>
              )}
            </div>
          </div>
          <Link to={paths.app.settings.getHref()} className="edit-btn">
            Edit profile
          </Link>
        </div>

        {/* STATS */}
        <div className="stats-strip">
          <div className="card stat-mini">
            <div className="stat-mini-val" style={{ color: 'var(--teal)' }}>{totalQuestions}</div>
            <div className="stat-mini-label">Questions</div>
          </div>
          <div className="card stat-mini">
            <div className="stat-mini-val" style={{ color: 'var(--green)' }}>
              {accuracy != null ? `${accuracy}%` : '—'}
            </div>
            <div className="stat-mini-label">Accuracy</div>
          </div>
          <div className="card stat-mini">
            <div className="stat-mini-val">{streak}d</div>
            <div className="stat-mini-label">Streak</div>
          </div>
          <div className="card stat-mini">
            <div className="stat-mini-val" style={{ color: 'var(--violet)' }}>—</div>
            <div className="stat-mini-label">Rank</div>
          </div>
        </div>

        {/* SUBSCRIPTION */}
        <h3 className="section-title">Subscription</h3>
        <div className="card section-card">
          <Link to={paths.app.billing.getHref()} className="row-item">
            <div
              className="row-icon"
              style={{
                background: 'rgba(74,198,138,0.12)',
                border: '1px solid rgba(74,198,138,0.2)',
              }}
            >
              <BoltIcon color="var(--green)" />
            </div>
            <div className="row-info">
              <div className="row-title">{isPro ? 'Axeous Pro' : 'Free plan'}</div>
              <div className="row-sub">
                {isPro
                  ? 'Pro is active — manage your subscription'
                  : 'Upgrade to lift your daily AI limit and unlock more'}
              </div>
            </div>
            <span className="row-action">{isPro ? 'Manage' : 'Upgrade'} →</span>
          </Link>
        </div>

        {isAdmin && (
          <>
            <h3 className="section-title">Admin</h3>
            <div className="card section-card">
              <Link to={paths.app.admin.getHref()} className="row-item">
                <div
                  className="row-icon"
                  style={{
                    background: 'rgba(167,139,250,0.12)',
                    border: '1px solid rgba(167,139,250,0.2)',
                  }}
                >
                  <GearIcon color="var(--violet)" />
                </div>
                <div className="row-info">
                  <div className="row-title">Admin Dashboard</div>
                  <div className="row-sub">Manage platform, users, and plans</div>
                </div>
                <span className="row-action">Open →</span>
              </Link>
            </div>
          </>
        )}

        {/* PREFERENCES */}
        <h3 className="section-title">Preferences</h3>
        <div className="card section-card">
          <div className="row-item">
            <div
              className="row-icon"
              style={{
                background: 'rgba(106,168,255,0.12)',
                border: '1px solid rgba(106,168,255,0.2)',
              }}
            >
              {theme === 'dark' ? <MoonIcon color="var(--blue)" /> : <SunIcon color="var(--blue)" />}
            </div>
            <div className="row-info">
              <div className="row-title">Appearance</div>
              <div className="row-sub">
                {theme === 'dark' ? 'Dark' : 'Light'} mode is currently enabled
              </div>
            </div>
            <Link
              to={paths.app.settings.getHref()}
              className="row-action row-action-link"
            >
              Change
            </Link>
          </div>
        </div>

        {/* ACCOUNT */}
        <h3 className="section-title">Account</h3>
        <div className="card section-card">
          <div className="row-item">
            <div
              className="row-icon"
              style={{ background: 'var(--glass)', border: '1px solid var(--line)' }}
            >
              <SignOutIcon color="var(--ink-dim)" />
            </div>
            <div className="row-info">
              <div className="row-title">Sign out</div>
              <div className="row-sub">Sign out of your account on this device</div>
            </div>
            <button onClick={handleSignOut} className="row-action" type="button">
              Sign out
            </button>
          </div>
        </div>

        {/* DANGER */}
        <h3 className="section-title danger">Danger zone</h3>
        <div className="card section-card">
          <div className="row-item danger-row">
            <div
              className="row-icon"
              style={{
                background: 'rgba(255,72,88,0.08)',
                border: '1px solid rgba(255,72,88,0.2)',
              }}
            >
              <TrashIcon color="var(--coral)" />
            </div>
            <div className="row-info">
              <div className="row-title">Delete account</div>
              <div className="row-sub">
                Permanently delete your account and all data
              </div>
            </div>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="danger-action"
                type="button"
              >
                Delete account
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteError(null)
                  }}
                  className="row-action"
                  type="button"
                  disabled={deleteMeMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="danger-confirm"
                  type="button"
                  disabled={deleteMeMutation.isPending}
                >
                  {deleteMeMutation.isPending ? 'Deleting…' : 'Confirm delete'}
                </button>
              </div>
            )}
          </div>
          {deleteError && (
            <p className="danger-error" role="alert">
              {deleteError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ============================================================
// Icons
// ============================================================

const BoltIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
  </svg>
)

const GearIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const SunIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.6" />
  </svg>
)

const MoonIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
      stroke={color}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
)

const SignOutIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
)

const TrashIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </svg>
)
