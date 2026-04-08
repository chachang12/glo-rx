import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { PageLoader } from '@/features/ui/PageLoader'

interface LeaderboardEntry {
  authId: string
  username: string | null
  firstName: string
  lastName: string
  isMe: boolean
  streak: number
  totalQuestions: number
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

// Exported so the navbar can fetch the count
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

export const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [ready, setReady] = useState(false)

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
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.from !== requesterId))
    }
  }

  if (!ready) return <PageLoader />

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
              Leaderboard
            </h1>
            <p className="text-sm text-[#888]">
              You and your friends, ranked by study streak.
            </p>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#4f8ef7]/30 bg-[#4f8ef7]/5 text-xs font-semibold text-[#4f8ef7] hover:border-[#4f8ef7]/60 transition-all"
          >
            <PlusIcon />
            Add friend
          </button>
        </div>

        {/* Pending requests */}
        {requests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#bbb]">
              Friend Requests
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#4f8ef7] text-[10px] font-bold text-[#0f0f1a]">
                {requests.length}
              </span>
            </h2>
            {requests.map((req) => (
              <div
                key={req.friendshipId}
                className="flex items-center gap-3 rounded-2xl border border-[#4f8ef7]/20 bg-[#4f8ef7]/5 p-4"
              >
                <div className="w-9 h-9 rounded-full bg-[#4f8ef7]/15 border border-[#4f8ef7]/30 flex items-center justify-center text-xs font-bold text-[#4f8ef7] select-none">
                  ?
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#ddd] truncate">
                    {req.from}
                  </p>
                  <p className="text-xs text-[#888]">
                    wants to be your friend
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAccept(req.from)}
                    className="px-3 py-1.5 rounded-lg bg-[#4f8ef7] text-xs font-semibold text-[#0f0f1a] hover:bg-[#4f8ef7]/90 transition-all"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(req.from)}
                    className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm text-xs font-semibold text-[#888] hover:text-[#ddd] transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard */}
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div
              key={entry.authId}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                entry.isMe
                  ? 'border-[#4f8ef7]/30 bg-[#4f8ef7]/5'
                  : 'border-white/[0.06] bg-white/[0.02] backdrop-blur-sm'
              }`}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                {i === 0 ? (
                  <span className="text-lg">1</span>
                ) : (
                  <span className="text-sm font-mono text-[#555]">{i + 1}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-[#4f8ef7]/15 border border-[#4f8ef7]/30 flex items-center justify-center text-xs font-bold text-[#4f8ef7] select-none">
                {getInitials(entry.firstName, entry.lastName)}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#ddd] truncate">
                  {entry.username ?? `${entry.firstName} ${entry.lastName}`}
                  {entry.isMe && (
                    <span className="ml-2 text-[10px] font-mono text-[#4f8ef7]">you</span>
                  )}
                </p>
                <p className="text-xs text-[#555]">
                  {entry.totalQuestions} questions answered
                </p>
              </div>

              {/* Streak */}
              <div className="text-right">
                <p className="text-lg font-bold tabular-nums text-[#e07b3f]">
                  {entry.streak}d
                </p>
                <p className="text-[10px] font-mono text-[#555]">streak</p>
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 text-center space-y-2">
              <p className="text-sm text-[#888]">No data yet</p>
              <p className="text-xs text-[#555]">
                Complete a practice session to appear on the leaderboard
              </p>
            </div>
          )}
        </div>
      </div>

      {showAddDialog && (
        <AddFriendDialog onClose={() => setShowAddDialog(false)} />
      )}
    </div>
  )
}

// ── Add Friend Dialog ────────────────────────────────────────────────────────

const AddFriendDialog = ({ onClose }: { onClose: () => void }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    setError(null)
    if (q.trim().length < 3) {
      setResults([])
      return
    }

    setSearching(true)
    try {
      const res = await apiFetch(`/api/user/search?q=${encodeURIComponent(q.trim())}`)
      if (res.ok) {
        setResults(await res.json())
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm shadow-2xl shadow-black/40 overflow-hidden">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#e8e6f0]">Add Friend</h2>
            <button
              onClick={onClose}
              className="text-[#555] hover:text-[#ddd] transition-colors text-lg"
            >
              &times;
            </button>
          </div>

          {/* Search input */}
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or email..."
            autoFocus
            className="w-full px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-sm text-[#ddd] placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40"
          />

          {/* Error */}
          {error && (
            <p className="text-xs text-[#ef4444]">{error}</p>
          )}

          {/* Results */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {searching && (
              <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border-2 border-[#4f8ef7] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!searching && results.length === 0 && query.length >= 3 && (
              <p className="text-xs text-[#555] text-center py-4">No users found</p>
            )}

            {results.map((user) => {
              const isSent = sent.has(user.authId)
              return (
                <div
                  key={user.authId}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3"
                >
                  <div className="w-8 h-8 rounded-full bg-[#4f8ef7]/15 border border-[#4f8ef7]/30 flex items-center justify-center text-xs font-bold text-[#4f8ef7]">
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#ddd] truncate">
                      {user.username ?? `${user.firstName} ${user.lastName}`}
                    </p>
                    {user.username && (
                      <p className="text-xs text-[#555]">
                        {user.firstName} {user.lastName}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleSendRequest(user.authId)}
                    disabled={isSent}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSent
                        ? 'border border-[#10b981]/30 bg-[#10b981]/5 text-[#10b981]'
                        : 'border border-[#4f8ef7]/30 bg-[#4f8ef7]/5 text-[#4f8ef7] hover:border-[#4f8ef7]/60'
                    }`}
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?'
}

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
