import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { LoginForm } from '@/features/auth'
import AxeousLogo from '@/components/ui/AxeousLogo'
import { ThemeToggle } from '@/components/theme-provider'

export const LoginPage = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-ink">
      {/* Aurora backdrop — mirrors the landing's layered gradient + noise + grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(900px 600px at 15% -5%, rgba(110,156,199,0.18), transparent 60%),
            radial-gradient(700px 500px at 85% 5%, rgba(255,72,88,0.10), transparent 60%),
            radial-gradient(1000px 700px at 50% 110%, rgba(106,168,255,0.12), transparent 65%),
            linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 60%, var(--bg) 100%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, color-mix(in oklab, var(--ink) 6%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in oklab, var(--ink) 6%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, #000 40%, transparent 100%)',
        }}
      />

      {/* Top bar — glass back-link + theme toggle */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link
          to={paths.home.getHref()}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-glass px-3 py-1.5 text-sm text-ink-dim backdrop-blur-md transition-colors hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Axeous
        </Link>
        <ThemeToggle className="inline-grid h-[34px] w-[34px] place-items-center rounded-full border border-line-strong bg-glass text-ink-dim transition-all hover:-translate-y-px hover:bg-glass-strong hover:text-ink" />
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-88px)] flex-col items-center justify-center px-6 pb-20">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-line-strong bg-glass-strong backdrop-blur-md">
              <AxeousLogo size={22} color="currentColor" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Welcome back</h1>
              <p className="text-sm text-ink-dim">Sign in to continue to Axeous Learn.</p>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-[22px] border border-line bg-glass p-8 backdrop-blur-xl"
            style={{
              boxShadow: '0 30px 60px -20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(500px 260px at 80% -20%, rgba(110,156,199,0.18), transparent 60%), radial-gradient(400px 220px at 10% 110%, rgba(106,168,255,0.12), transparent 60%)',
              }}
            />
            <div className="relative">
              <LoginForm />
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-ink-faint">
            By signing in, you agree to use this platform
            <br />
            for educational purposes.
          </p>
        </div>
      </main>
    </div>
  )
}
