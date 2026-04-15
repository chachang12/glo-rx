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
    <div className="relative min-h-screen bg-[#060611] overflow-hidden">
      {/* ── Ambient gradient blobs ──────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-[40%] -right-[25%] w-[60vw] h-[60vw] rounded-full bg-[#4f8ef7]/6 blur-[150px]" />
        <div className="absolute top-[50%] -left-[15%] w-[40vw] h-[40vw] rounded-full bg-[#7c3aed]/5 blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }} />
      </div>

      <div className="relative z-10">
        <Navbar />
        <div className="pt-20">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AppRoot
