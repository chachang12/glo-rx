import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'
import './leaderboard.css'

// ============================================================
// Types
// ============================================================

interface LeaderboardEntry {
  authId: string
  username: string | null
  firstName: string
  lastName: string
  isMe: boolean
  streak: number
  totalQuestions: number
  accuracy?: number | null
}

interface SearchResult {
  authId: string
  username: string | null
  firstName: string
  lastName: string
}

interface FriendRequest {
  friendshipId: string
  from: string
  sentAt: string
}

type SortMode = 'streak' | 'questions'

// Exported so the navbar can fetch the request count
export async function fetchIncomingRequestCount(): Promise<number> {
  try {
    const res = await apiFetch('/api/friends/requests/incoming')
    if (!res.ok) return 0
    const data = await res.json()
    return data.length
  } catch {
    return 0
  }
}

// ============================================================
// Avatar palette — deterministic per user
// ============================================================

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #a78bfa, #7c5cbf)',
  'linear-gradient(135deg, #ff7a87, #d64050)',
  'linear-gradient(135deg, #5bf08a, #3ab860)',
  'linear-gradient(135deg, #ffb45a, #d4903a)',
  'linear-gradient(135deg, #6aa8ff, #4a88d4)',
  'linear-gradient(135deg, #a7adbd, #7a8090)',
]
const GOLD_GRADIENT = 'linear-gradient(135deg, #ffd700, #f0a500)'
const SILVER_GRADIENT = 'linear-gradient(135deg, #c0c0c0, #8a8a8a)'
const BRONZE_GRADIENT = 'linear-gradient(135deg, #cd7f32, #a0622e)'
const YOU_GRADIENT = 'linear-gradient(135deg, var(--teal), var(--blue))'

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function avatarColor(entry: LeaderboardEntry, rank: number): string {
  if (entry.isMe) return YOU_GRADIENT
  if (rank === 1) return GOLD_GRADIENT
  if (rank === 2) return SILVER_GRADIENT
  if (rank === 3) return BRONZE_GRADIENT
  return AVATAR_GRADIENTS[hashString(entry.authId) % AVATAR_GRADIENTS.length]
}

// ============================================================
// Main component
// ============================================================

export const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [ready, setReady] = useState(false)
  const [sort, setSort] = useState<SortMode>('streak')

  const loadData = useCallback(() => {
    return Promise.all([
      apiFetch('/api/user/leaderboard').then((r) => r.json()).then(setEntries).catch(() => {}),
      apiFetch('/api/friends/requests/incoming').then((r) => r.json()).then(setRequests).catch(() => {}),
    ])
  }, [])

  useEffect(() => { loadData().finally(() => setReady(true)) }, [loadData])

  const handleAccept = async (requesterId: string) => {
    const res = await apiFetch('/api/friends/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterId }),
    })
    if (res.ok) loadData()
  }

  const handleDecline = async (requesterId: string) => {
    const res = await apiFetch('/api/friends/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterId }),
    })
    if (res.ok) setRequests((prev) => prev.filter((r) => r.from !== requesterId))
  }

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (sort === 'questions') return b.totalQuestions - a.totalQuestions
      return b.streak - a.streak
    })
  }, [entries, sort])

  const me = sortedEntries.find((e) => e.isMe)
  const myRank = me ? sortedEntries.indexOf(me) + 1 : null
  const top3 = sortedEntries.slice(0, 3)

  if (!ready) return <PageLoader />

  return (
    <div className="axeous-leaderboard">
      <div className="wrap">
        <header className="page-header">
          <div>
            <h1>Leaderboard</h1>
            <p>
              You and your friends, ranked by{' '}
              {sort === 'streak' ? 'study streak' : 'questions answered'}.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowAddDialog(true)} type="button">
            <PlusIcon /> Add friend
          </button>
        </header>

        {requests.length > 0 && (
          <section className="requests-section">
            <h2 className="requests-title">
              Friend Requests
              <span className="requests-count">{requests.length}</span>
            </h2>
            {requests.map((req) => (
              <div key={req.friendshipId} className="request-row">
                <div className="request-icon">?</div>
                <div className="request-info">
                  <div className="request-name">{req.from}</div>
                  <div className="request-sub">wants to be your friend</div>
                </div>
                <button
                  onClick={() => handleAccept(req.from)}
                  className="req-btn accept"
                  type="button"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(req.from)}
                  className="req-btn decline"
                  type="button"
                >
                  Decline
                </button>
              </div>
            ))}
          </section>
        )}

        {top3.length >= 3 && (
          <section className="podium-section">
            <div className="card podium-card">
              <div className="podium">
                <PodiumSlot entry={top3[1]} place={2} sort={sort} />
                <PodiumSlot entry={top3[0]} place={1} sort={sort} crown />
                <PodiumSlot entry={top3[2]} place={3} sort={sort} />
              </div>
            </div>
          </section>
        )}

        <div className="filter-bar">
          <button
            className={`filter-tab${sort === 'streak' ? ' active' : ''}`}
            onClick={() => setSort('streak')}
            type="button"
          >
            Study Streak
          </button>
          <button
            className={`filter-tab${sort === 'questions' ? ' active' : ''}`}
            onClick={() => setSort('questions')}
            type="button"
          >
            Questions Answered
          </button>
        </div>

        <div className="card lb-table">
          <div className="lb-header">
            <span>Rank</span>
            <span />
            <span>Name</span>
            <span>Streak</span>
            <span>Questions</span>
            <span>Accuracy</span>
          </div>
          {sortedEntries.length === 0 ? (
            <div className="lb-empty">
              <div className="lb-empty-title">No data yet</div>
              <div className="lb-empty-sub">
                Complete a practice session to appear on the leaderboard
              </div>
            </div>
          ) : (
            sortedEntries.map((entry, i) => {
              const rank = i + 1
              const rankClass = rank <= 3 ? `r${rank}` : ''
              const displayName = entry.username ?? (`${entry.firstName} ${entry.lastName}`.trim() || '—')
              return (
                <div
                  key={entry.authId}
                  className={`lb-row${entry.isMe ? ' is-you' : ''}`}
                >
                  <div className={`lb-rank ${rankClass}`}>{rank}</div>
                  <div
                    className="lb-avatar"
                    style={{ background: avatarColor(entry, rank) }}
                  >
                    {getInitials(entry.firstName, entry.lastName)}
                  </div>
                  <div className="lb-name">
                    {displayName}
                    {entry.isMe && <span className="lb-you-tag">you</span>}
                  </div>
                  <div className="lb-streak">
                    <span className="lb-streak-val">{entry.streak}</span>
                    <span className="lb-streak-unit">days</span>
                  </div>
                  <div className="lb-questions">
                    {entry.totalQuestions.toLocaleString()}
                  </div>
                  <div className="lb-accuracy">
                    {entry.accuracy != null ? `${entry.accuracy}%` : '—'}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {me && (
          <div className="your-stats">
            <div className="card stat-card">
              <div className="stat-val" style={{ color: 'var(--teal)' }}>
                {myRank != null ? `#${myRank}` : '—'}
              </div>
              <div className="stat-label">Your rank</div>
            </div>
            <div className="card stat-card">
              <div className="stat-val">{me.streak}d</div>
              <div className="stat-label">Current streak</div>
            </div>
            <div className="card stat-card">
              <div className="stat-val">{me.totalQuestions.toLocaleString()}</div>
              <div className="stat-label">Questions</div>
            </div>
            <div className="card stat-card">
              <div className="stat-val" style={{ color: 'var(--green)' }}>
                {me.accuracy != null ? `${me.accuracy}%` : '—'}
              </div>
              <div className="stat-label">Accuracy</div>
            </div>
          </div>
        )}
      </div>

      {showAddDialog && <AddFriendDialog onClose={() => setShowAddDialog(false)} />}
    </div>
  )
}

// ============================================================
// Podium slot
// ============================================================

const PodiumSlot = ({
  entry,
  place,
  sort,
  crown = false,
}: {
  entry: LeaderboardEntry
  place: 1 | 2 | 3
  sort: SortMode
  crown?: boolean
}) => {
  const displayName = entry.username ?? (`${entry.firstName} ${entry.lastName}`.trim() || '—')
  const value = sort === 'streak' ? entry.streak : entry.totalQuestions
  const unit = sort === 'streak' ? 'd' : ''
  const label = sort === 'streak' ? 'Streak' : 'Questions'

  return (
    <div className={`podium-slot p-${place}`}>
      <div
        className="podium-avatar"
        style={{ background: avatarColor(entry, place) }}
      >
        {crown && <span className="crown">👑</span>}
        {getInitials(entry.firstName, entry.lastName)}
      </div>
      <div className="podium-name">{displayName}</div>
      {entry.isMe && <div className="podium-you">that's you</div>}
      <div className="podium-streak">
        {value.toLocaleString()}{unit}
      </div>
      <div className="podium-streak-label">{label}</div>
      <div className="podium-base">{place}</div>
    </div>
  )
}

// ============================================================
// Add Friend modal
// ============================================================

const AddFriendDialog = ({ onClose }: { onClose: () => void }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    setError(null)
    if (q.trim().length < 3) { setResults([]); return }
    setSearching(true)
    try {
      const res = await apiFetch(`/api/user/search?q=${encodeURIComponent(q.trim())}`)
      if (res.ok) setResults(await res.json())
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSendRequest = async (recipientId: string) => {
    setError(null)
    const res = await apiFetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId }),
    })
    if (res.ok) {
      setSent((prev) => new Set(prev).add(recipientId))
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to send request')
    }
  }

  return (
    <div className="axeous-leaderboard-modal">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-card">
        <div className="modal-body">
          <div className="modal-head">
            <div className="modal-title">Add friend</div>
            <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
              ×
            </button>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="search-input"
            autoFocus
          />
          {error && <div className="search-error">{error}</div>}
          <div className="search-results">
            {searching && (
              <div className="search-loading">
                <span className="spinner" />
              </div>
            )}
            {!searching && results.length === 0 && query.length >= 3 && (
              <div className="search-empty">No users found</div>
            )}
            {results.map((user) => {
              const isSent = sent.has(user.authId)
              return (
                <div key={user.authId} className="result-row">
                  <div
                    className="result-avatar"
                    style={{
                      background: AVATAR_GRADIENTS[hashString(user.authId) % AVATAR_GRADIENTS.length],
                    }}
                  >
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                  <div className="result-info">
                    <div className="result-name">
                      {user.username ?? (`${user.firstName} ${user.lastName}`.trim() || '—')}
                    </div>
                    {user.username && (
                      <div className="result-sub">{user.firstName} {user.lastName}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleSendRequest(user.authId)}
                    disabled={isSent}
                    className={`result-btn ${isSent ? 'sent' : 'add'}`}
                    type="button"
                  >
                    {isSent ? 'Sent' : 'Add'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?'
}

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
