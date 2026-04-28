import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { Navbar } from '@/features/navigation/Navbar'
import { apiFetch } from '@/lib/api'

const AppRoot = () => {
  useEffect(() => {
    apiFetch('/api/user/me')
      .then((r) => { if (!r.ok) console.warn('Failed to load user profile:', r.status) })
      .catch((err) => console.warn('Failed to load user profile:', err))
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-ink">
      {/* Ambient aurora — matches landing hero */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background: `
            radial-gradient(900px 600px at 10% -10%, rgba(110,156,199,0.14), transparent 60%),
            radial-gradient(700px 500px at 90% 0%, rgba(255,72,88,0.08), transparent 60%),
            radial-gradient(1000px 700px at 50% 110%, rgba(106,168,255,0.10), transparent 65%)
          `,
        }}
      />
      {/* Noise overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        }}
      />
      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, color-mix(in oklab, var(--ink) 6%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in oklab, var(--ink) 6%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, #000 30%, transparent 100%)',
        }}
      />

      <div className="relative z-10 pt-3">
        <Navbar />
        <Outlet />
      </div>
    </div>
  )
}

export default AppRoot
