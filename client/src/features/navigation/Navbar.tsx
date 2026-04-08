import { useRef, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { paths } from '@/config/paths'
import { useUser, UserAvatar } from '@/features/auth'
import { fetchIncomingRequestCount } from '@/app/routes/app/leaderboard'

const NAV_ITEMS = [
  { label: 'Dashboard', href: paths.app.dashboard.getHref() },
  { label: 'Plans', href: paths.app.plans.getHref() },
  { label: 'Leaderboard', href: paths.app.leaderboard.getHref(), hasBadge: true },
  { label: 'Marketplace', href: paths.app.marketplace.getHref() },
] as const

export const Navbar = () => {
  const { user } = useUser()
  const location = useLocation()
  const navRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [ready, setReady] = useState(false)
  const [requestCount, setRequestCount] = useState(0)

  const activeIndex = NAV_ITEMS.findIndex((item) =>
    location.pathname.startsWith(item.href)
  )

  useEffect(() => {
    if (!navRef.current) return
    const buttons = navRef.current.querySelectorAll<HTMLAnchorElement>('[data-nav-item]')
    const active = buttons[activeIndex]
    if (active) {
      const navRect = navRef.current.getBoundingClientRect()
      const btnRect = active.getBoundingClientRect()
      setIndicator({
        left: btnRect.left - navRect.left,
        width: btnRect.width,
      })
      if (!ready) setReady(true)
    }
  }, [activeIndex, ready])

  // Poll for incoming friend requests
  useEffect(() => {
    fetchIncomingRequestCount().then(setRequestCount)
    const interval = setInterval(() => {
      fetchIncomingRequestCount().then(setRequestCount)
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 pt-4">
      {/* Home icon — top left */}
      <Link
        to={paths.app.dashboard.getHref()}
        className="flex items-center justify-center w-9 h-9 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl text-[#888] hover:text-[#4f8ef7] hover:border-white/[0.15] transition-all"
      >
        <HomeIcon />
      </Link>

      {/* Nav tabs — center */}
      <nav className="px-1.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-lg shadow-black/20">
        <div ref={navRef} className="relative flex items-center gap-1">
          {activeIndex >= 0 && (
            <div
              className="absolute top-0 bottom-0 rounded-full bg-white/[0.06] border border-white/[0.08]"
              style={{
                left: indicator.left,
                width: indicator.width,
                transition: ready ? 'left 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              }}
            />
          )}

          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.href)
            const showBadge = 'hasBadge' in item && item.hasBadge && requestCount > 0
            return (
              <Link
                key={item.href}
                to={item.href}
                data-nav-item
                className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'text-[#e8e6f0]'
                    : 'text-[#888] hover:text-[#bbb]'
                }`}
              >
                {item.label}
                {showBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#4f8ef7] text-[10px] font-bold text-[#0f0f1a] flex items-center justify-center">
                    {requestCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Profile avatar — top right */}
      <Link
        to={paths.app.profile.getHref()}
        className="flex items-center justify-center"
      >
        <UserAvatar name={user?.name} size="sm" />
      </Link>
    </div>
  )
}

const HomeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)
