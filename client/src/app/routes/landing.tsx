import { Link } from 'react-router'
import { paths } from '@/config/paths'

export const Landing = () => {
  return (
    <div className="relative min-h-screen bg-[#060611] overflow-hidden">
      {/* ── Gradient blobs ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[30%] -right-[20%] w-[70vw] h-[70vw] rounded-full bg-[#4f8ef7]/12 blur-[120px]" />
        <div className="absolute top-[40%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-[#7c3aed]/8 blur-[150px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[40vw] h-[40vw] rounded-full bg-[#06b6d4]/8 blur-[120px]" />
        <NoiseOverlay />
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <span className="text-xl font-bold tracking-tight text-white">
          Axeous
        </span>
        <div className="flex items-center gap-6">
          <Link to={paths.learn.getHref()} className="text-sm text-[#aaa] hover:text-white transition-colors">
            Learn
          </Link>
          <Link to={paths.collect.getHref()} className="text-sm text-[#aaa] hover:text-white transition-colors">
            Collect
          </Link>
          <Link
            to={paths.auth.login.getHref()}
            className="px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-semibold text-white hover:bg-white/10 transition-all"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-32 pb-40">
        {/* Announcement badge */}
        <Link
          to={paths.learn.getHref()}
          className="group mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs text-[#aaa] font-medium hover:border-[#4f8ef7]/30 hover:bg-white/[0.08] transition-all"
        >
          <span className="px-1.5 py-0.5 rounded-full bg-[#4f8ef7] text-[10px] font-bold text-white">New</span>
          Axeous Learn is now available
          <span className="text-[#4f8ef7] transition-transform group-hover:translate-x-0.5">&rarr;</span>
        </Link>

        <h1 className="max-w-4xl text-center text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1]">
          <span className="text-white">Tools that make</span>
          <br />
          <span className="bg-gradient-to-r from-[#4f8ef7] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
            learning effortless.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-center text-lg text-[#888] leading-relaxed">
          Axeous builds AI-powered software for students, professionals, and
          lifelong learners. Study smarter, not harder.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            to={paths.learn.getHref()}
            className="group px-6 py-3 rounded-full bg-[#4f8ef7] text-sm font-semibold text-white hover:shadow-lg hover:shadow-[#4f8ef7]/25 transition-all"
          >
            Explore products
            <span className="ml-2 inline-block transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </Link>
        </div>
      </main>

      {/* ── Products ────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-32">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-[#555]">Products</p>
            <h2 className="text-3xl font-bold text-white">The Axeous suite</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">
            {/* Learn */}
            <Link
              to={paths.learn.getHref()}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 space-y-4 hover:border-[#4f8ef7]/30 hover:bg-white/[0.04] transition-all overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4f8ef7]/40 to-transparent" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4f8ef7]/10 border border-[#4f8ef7]/20 flex items-center justify-center">
                  <BookIcon />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-[#4f8ef7] transition-colors">
                    Axeous Learn
                  </h3>
                  <p className="text-xs text-[#888]">AI-powered exam prep</p>
                </div>
              </div>
              <p className="text-sm text-[#888] leading-relaxed">
                Practice tests, flashcard generation, study plans, and progress
                tracking for professional licensure exams.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#4f8ef7]">
                Learn more <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
              </span>
            </Link>

            {/* Collect */}
            <Link
              to={paths.collect.getHref()}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 space-y-4 hover:border-[#f59e0b]/30 hover:bg-white/[0.04] transition-all overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f59e0b]/40 to-transparent" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center">
                  <ChartIcon />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-[#f59e0b] transition-colors">
                    Axeous Collect
                  </h3>
                  <p className="text-xs text-[#888]">eBay seller analytics</p>
                </div>
              </div>
              <p className="text-sm text-[#888] leading-relaxed">
                Real-time market insights, product analytics, and pricing trends
                for eBay sellers and collectors.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#f59e0b]">
                Coming soon <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 px-8 py-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xs text-[#555]">&copy; {new Date().getFullYear()} Axeous</span>
          <span className="text-xs text-[#555]">Building the future of learning.</span>
        </div>
      </footer>
    </div>
  )
}

const NoiseOverlay = () => (
  <div className="absolute inset-0 opacity-[0.03]" style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '128px 128px',
  }} />
)

const BookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
)

const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)
