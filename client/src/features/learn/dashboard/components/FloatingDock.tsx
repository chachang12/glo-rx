import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'

interface DockItem {
  key: string
  title: string
  href: string
  icon: ReactNode
  primary?: boolean
}

// macOS-style magnify on hover, à la Aceternity's floating dock. Gentle nudge:
// icons grow ~28% and lift a few px near the cursor.
const SIGMA = 70
const BOOST = 0.28
const LIFT = 7

/**
 * Quick-action dock that nests into the panel notch. Each action links to a real
 * route — `startHref` is the contextual "start practice" target.
 */
export const FloatingDock = ({ startHref }: { startHref: string }) => {
  const ref = useRef<HTMLDivElement>(null)

  const items: DockItem[] = [
    { key: 'new', title: 'New session', href: startHref, primary: true, icon: <PlusIcon /> },
    { key: 'plans', title: 'Plans & dates', href: paths.app.plans.getHref(), icon: <CalendarIcon /> },
    { key: 'browse', title: 'Browse exams', href: paths.app.marketplace.getHref(), icon: <FilterIcon /> },
    { key: 'board', title: 'Leaderboard', href: paths.app.leaderboard.getHref(), icon: <BookmarkIcon /> },
    { key: 'results', title: 'Results', href: paths.app.results.getHref(), icon: <ExportIcon /> },
  ]

  useEffect(() => {
    const dock = ref.current
    if (!dock) return
    const els = () => Array.from(dock.querySelectorAll<HTMLElement>('[data-dock-item]'))
    const onMove = (e: MouseEvent) => {
      els().forEach((it) => {
        const r = it.getBoundingClientRect()
        const center = r.left + r.width / 2
        const dist = Math.abs(e.clientX - center)
        const f = Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA))
        it.style.transform = `translateY(${(-LIFT * f).toFixed(2)}px) scale(${(1 + BOOST * f).toFixed(3)})`
        it.style.zIndex = f > 0.4 ? '3' : '1'
      })
    }
    const onLeave = () => {
      els().forEach((it) => {
        it.style.transform = 'translateY(0) scale(1)'
        it.style.zIndex = '1'
      })
    }
    dock.addEventListener('mousemove', onMove)
    dock.addEventListener('mouseleave', onLeave)
    return () => {
      dock.removeEventListener('mousemove', onMove)
      dock.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div className="floating-dock" ref={ref}>
      {items.map((it) => (
        <Link
          key={it.key}
          to={it.href}
          data-dock-item
          className={it.primary ? 'dock-item primary' : 'dock-item'}
          title={it.title}
          aria-label={it.title}
        >
          {it.icon}
        </Link>
      ))}
    </div>
  )
}

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <line x1="9" y1="4" x2="9" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="4" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <rect x="3" y="4" width="12" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="6" y1="2.5" x2="6" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="2.5" x2="12" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="3" y1="7.5" x2="15" y2="7.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)
const FilterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <line x1="4" y1="5.5" x2="14" y2="5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="5.5" y1="9" x2="12.5" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="7.5" y1="12.5" x2="10.5" y2="12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)
const BookmarkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <path d="M5.5 3.5 H12.5 V14.5 L9 11.6 L5.5 14.5 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
)
const ExportIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <path d="M9 3.5 V10.5 M6.4 6 L9 3.4 L11.6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 11 V13.5 H14 V11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
