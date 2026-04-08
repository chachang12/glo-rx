import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { LoginForm } from '@/features/auth'

export const LoginPage = () => {
  return (
    <div className="relative min-h-screen bg-[#060611] overflow-hidden flex items-center justify-center p-6">
      {/* ── Gradient blobs ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[30%] -left-[20%] w-[60vw] h-[60vw] rounded-full bg-[#4f8ef7]/12 blur-[140px]" />
        <div className="absolute bottom-[10%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-[#7c3aed]/10 blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }} />
      </div>

      {/* ── Back link ───────────────────────────────────────────────────── */}
      <Link
        to={paths.home.getHref()}
        className="absolute top-5 left-8 z-10 text-sm text-[#555] hover:text-white transition-colors"
      >
        &larr; Axeous
      </Link>

      {/* ── Card ────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
