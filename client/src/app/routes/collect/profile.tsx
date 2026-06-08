import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { authClient } from '@/lib/auth-client'
import { useUser } from '@/features/shared/auth'
import { paths } from '@/config/paths'
import { useGetMe, useDeleteMe } from '@/features/shared/user'
import { useGetEbayQuota } from '@/features/collect/ebay'
import { TelegramRow } from '@/features/collect/telegram'
import { AdvancedModeRow } from '@/features/collect/advanced'
import './profile.css'

export const CollectProfile = () => {
  const { user } = useUser()
  const navigate = useNavigate()
  const { data: appUser } = useGetMe()
  const { data: quota } = useGetEbayQuota()
  const deleteMeMutation = useDeleteMe()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isAdmin = appUser?.role === 'admin'

  const handleSignOut = async () => {
    await authClient.signOut()
    navigate(paths.home.getHref())
  }

  const handleDeleteAccount = async () => {
    await deleteMeMutation.mutateAsync()
    await authClient.signOut()
    navigate(paths.home.getHref())
  }

  if (!user) return null

  const initials = getInitials(user.name)

  return (
    <div className="axeous-collect-profile">
      <div className="wrap page-bottom">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to={paths.app.collect.dashboard.getHref()}>← Back to Collect</Link>
        </nav>
        <h1 className="page-title">Profile</h1>
        <p className="page-sub">Your Collect account, usage, and metrics.</p>

        {/* HERO */}
        <div className="card profile-hero">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-info">
            <h2 className="profile-name">{user.name ?? 'Axeous user'}</h2>
            <p className="profile-email">{user.email ?? ''}</p>
            <div className="profile-badges">
              <div className="profile-badge">
                <span
                  className="badge-dot"
                  style={{ background: 'var(--amber)', boxShadow: '0 0 6px var(--amber)' }}
                />
                Collect Beta
              </div>
              {appUser?.advancedCollectMode && (
                <div className="profile-badge">
                  <span
                    className="badge-dot"
                    style={{ background: 'var(--amber)', boxShadow: '0 0 6px var(--amber)' }}
                  />
                  Advanced
                </div>
              )}
              {isAdmin && (
                <div className="profile-badge">
                  <span
                    className="badge-dot"
                    style={{ background: 'var(--violet)', boxShadow: '0 0 6px var(--violet)' }}
                  />
                  Admin
                </div>
              )}
            </div>
          </div>
        </div>

        {/* USAGE */}
        <h3 className="section-title">Usage</h3>
        <div className="stats-strip">
          <div className="card stat-mini">
            <div className="stat-mini-val amber">
              {quota ? quota.dailyCalls.toLocaleString() : '—'}
            </div>
            <div className="stat-mini-label">API calls today</div>
            <div className="stat-mini-soon">
              {quota ? `of ${quota.limit.toLocaleString()}` : 'Loading…'}
            </div>
          </div>
          <div className="card stat-mini">
            <div className="stat-mini-val">{quota ? quota.activeWatches : '—'}</div>
            <div className="stat-mini-label">Active watches</div>
            <div className="stat-mini-soon">across all sessions</div>
          </div>
          <div className="card stat-mini">
            <div className="stat-mini-val muted">—</div>
            <div className="stat-mini-label">Earnings</div>
            <div className="stat-mini-soon">EPN attribution coming</div>
          </div>
          <div className="card stat-mini">
            <div className="stat-mini-val muted">—</div>
            <div className="stat-mini-label">Items clicked</div>
            <div className="stat-mini-soon">click tracking coming</div>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <h3 className="section-title">Notifications</h3>
        <div className="card section-card">
          <TelegramRow />
        </div>

        {/* SETTINGS */}
        <h3 className="section-title">Settings</h3>
        <div className="card section-card">
          <AdvancedModeRow />
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
                Permanently delete your account and all data across Axeous
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
                  onClick={() => setShowDeleteConfirm(false)}
                  className="row-action"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="danger-confirm"
                  type="button"
                >
                  Confirm delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

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
