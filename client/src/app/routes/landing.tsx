import { Link } from 'react-router'
import { paths } from '@/config/paths'

export const Landing = () => {
  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1e1e2e]">
        <span className="text-xl font-bold tracking-tight text-[#4f8ef7]">
          Axeous
        </span>
        <Link
          to={paths.auth.login.getHref()}
          className="px-4 py-2 rounded-lg bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tight text-[#e8e6f0] leading-tight">
            Practice smarter.
            <br />
            <span className="text-[#4f8ef7]">Pass with confidence.</span>
          </h1>

          <p className="text-lg text-[#888] max-w-lg mx-auto leading-relaxed">
            AI-powered practice tests for NCLEX, MCAT, LSAT, CPA, and more.
            Drill on real exam patterns and track your progress.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Link
              to={paths.auth.login.getHref()}
              className="px-6 py-3 rounded-lg bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all"
            >
              Get started
            </Link>
          </div>

          {/* Exam badges */}
          <div className="flex items-center justify-center gap-3 pt-6">
            {['NCLEX', 'MCAT', 'LSAT', 'CPA'].map((exam) => (
              <span
                key={exam}
                className="px-3 py-1.5 rounded-full border border-[#1e1e2e] bg-[#0d0d14] text-xs font-mono font-semibold text-[#888]"
              >
                {exam}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-5 border-t border-[#1e1e2e] text-center">
        <p className="text-xs text-[#555]">
          Axeous — Built for students who refuse to fail.
        </p>
      </footer>
    </div>
  )
}
