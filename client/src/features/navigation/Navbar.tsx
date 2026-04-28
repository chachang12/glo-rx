import { useRef, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { paths } from '@/config/paths'
import { useUser, UserAvatar } from '@/features/auth'
import { fetchIncomingRequestCount } from '@/app/routes/app/leaderboard'
import AxeousLogo from '@/components/ui/AxeousLogo'

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
  const mobileWrapRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [ready, setReady] = useState(false)
  const [requestCount, setRequestCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

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

  useEffect(() => {
    fetchIncomingRequestCount().then(setRequestCount)
    const interval = setInterval(() => {
      fetchIncomingRequestCount().then(setRequestCount)
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Close the mobile menu when route changes.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Close on outside click / Escape.
  useEffect(() => {
    if (!mobileOpen) return
    const onClick = (e: MouseEvent) => {
      if (mobileWrapRef.current && !mobileWrapRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [mobileOpen])

  return (
    <div ref={mobileWrapRef} className="sticky top-3 z-50 px-6">
      <nav
        className="relative mx-auto flex max-w-[1240px] items-center justify-between gap-4 rounded-full border border-line bg-glass px-4 py-2.5 backdrop-blur-xl"
        style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)' }}
      >
        <Link
          to={paths.app.dashboard.getHref()}
          className="flex items-center gap-2.5 font-semibold text-ink"
        >
          <AxeousLogo size={22} color="currentColor" />
          <span className="text-[15px]">Axeous</span>
        </Link>

        <div className="hidden rounded-full bg-glass-strong p-[3px] sm:block">
          <div ref={navRef} className="relative flex items-center gap-0.5">
            {activeIndex >= 0 && (
              <div
                className="absolute top-0 bottom-0 rounded-full border border-line bg-glass-strong"
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
                  className={`relative z-10 rounded-full px-4 py-[7px] text-[13px] font-medium transition-colors duration-200 ${
                    isActive ? 'text-ink' : 'text-ink-dim hover:text-ink'
                  }`}
                >
                  {item.label}
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-blue px-1 text-[10px] font-bold text-surface">
                      {requestCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-glass-strong text-ink-dim transition-colors hover:text-ink sm:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {mobileOpen ? (
                <path d="M6 6l12 12M6 18L18 6" />
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
            {!mobileOpen && requestCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-blue px-1 text-[10px] font-bold text-surface">
                {requestCount}
              </span>
            )}
          </button>

          <Link to={paths.app.profile.getHref()} className="shrink-0">
            <UserAvatar name={user?.name} size="sm" />
          </Link>
        </div>
      </nav>

      {mobileOpen && (
        <div
          className="mx-auto mt-2 max-w-[1240px] overflow-hidden rounded-2xl border border-line bg-glass backdrop-blur-xl sm:hidden"
          style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)' }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.href)
            const showBadge = 'hasBadge' in item && item.hasBadge && requestCount > 0
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between border-b border-line px-5 py-3.5 text-[14px] font-medium transition-colors last:border-b-0 ${
                  isActive ? 'bg-glass-strong text-ink' : 'text-ink-dim hover:text-ink'
                }`}
              >
                <span>{item.label}</span>
                {showBadge && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-blue px-1.5 text-[11px] font-bold text-surface">
                    {requestCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
