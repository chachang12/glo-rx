import { Link } from 'react-router'
import { paths } from '@/config/paths'

export const Learn = () => {
  return (
    <div className="relative min-h-screen bg-[#060611] overflow-hidden">
      {/* ── Gradient blobs ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[20%] left-[10%] w-[60vw] h-[60vw] rounded-full bg-[#4f8ef7]/15 blur-[140px]" />
        <div className="absolute top-[30%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-[#7c3aed]/12 blur-[130px]" />
        <div className="absolute -bottom-[30%] left-[30%] w-[50vw] h-[50vw] rounded-full bg-[#10b981]/8 blur-[120px]" />
        <NoiseOverlay />
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <Link to={paths.home.getHref()} className="text-xl font-bold tracking-tight text-white hover:text-[#aaa] transition-colors">
            Axeous
          </Link>
          <span className="text-[#555]">/</span>
          <span className="text-sm font-semibold text-[#4f8ef7]">Learn</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to={paths.auth.login.getHref()} className="text-sm text-[#aaa] hover:text-white transition-colors">
            Log in
          </Link>
          <Link
            to={paths.auth.login.getHref()}
            className="px-4 py-2 rounded-full bg-[#4f8ef7] text-sm font-semibold text-white hover:shadow-lg hover:shadow-[#4f8ef7]/25 transition-all"
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-24 pb-32">
        {/* Badge */}
        <div className="mb-8 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs text-[#aaa] font-medium">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#10b981] mr-2" />
          Free during early access
        </div>

        <h1 className="max-w-4xl text-center text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1]">
          <span className="text-white">AI-assisted</span>
          <br />
          <span className="bg-gradient-to-r from-[#4f8ef7] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
            exam prep.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-center text-lg text-[#888] leading-relaxed">
          Practice tests, smart flashcards, and personalized study plans
          that adapt to how you learn. Pass your exam with confidence.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            to={paths.auth.login.getHref()}
            className="group px-6 py-3 rounded-full bg-[#4f8ef7] text-sm font-semibold text-white hover:shadow-lg hover:shadow-[#4f8ef7]/25 transition-all"
          >
            Start studying free
            <span className="ml-2 inline-block transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </Link>
          <a
            href="#how-it-works"
            className="px-6 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-semibold text-[#aaa] hover:text-white hover:bg-white/10 transition-all"
          >
            How it works
          </a>
        </div>
      </main>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 px-6 pb-32">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-[#555]">How it works</p>
            <h2 className="text-3xl font-bold text-white">Three steps to exam day</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StepCard
              step="01"
              title="Choose your exam"
              description="Browse the marketplace and enroll in a study plan for your target exam."
            />
            <StepCard
              step="02"
              title="Study with AI"
              description="Generate flashcards from your notes, take community practice tests, and drill with AI-powered vignettes."
            />
            <StepCard
              step="03"
              title="Track & compete"
              description="Monitor your accuracy, build streaks, and climb the leaderboard with friends."
            />
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-32">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-[#555]">Features</p>
            <h2 className="text-3xl font-bold text-white">Everything you need to pass</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Community Tests"
              description="Take practice tests created by other students. Every test you generate becomes available to the community."
              color="#4f8ef7"
            />
            <FeatureCard
              title="AI Flashcards"
              description="Paste your notes or upload a PDF. AI generates study cards in RemNote format, with Anki coming soon."
              color="#7c3aed"
            />
            <FeatureCard
              title="Study Plans"
              description="Enroll in exam-specific plans with daily goals, exam date tracking, and personalized scheduling."
              color="#10b981"
            />
            <FeatureCard
              title="Progress Dashboard"
              description="Track questions answered, accuracy rate, study streaks, and days until your exam — all in one view."
              color="#e07b3f"
            />
            <FeatureCard
              title="Friend Leaderboard"
              description="Add friends, compare streaks, and stay motivated with a competitive leaderboard."
              color="#06b6d4"
            />
            <FeatureCard
              title="Exam Marketplace"
              description="Browse available exams, preview what's included, and enroll with one click."
              color="#ec4899"
            />
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-12 text-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4f8ef7]/40 to-transparent" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Your exam is waiting.
            </h2>
            <p className="mt-4 text-[#888] text-lg">
              Join students preparing smarter with Axeous Learn.
            </p>
            <Link
              to={paths.auth.login.getHref()}
              className="inline-flex mt-8 px-6 py-3 rounded-full bg-[#4f8ef7] text-sm font-semibold text-white hover:shadow-lg hover:shadow-[#4f8ef7]/25 transition-all"
            >
              Get started for free &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 px-8 py-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={paths.home.getHref()} className="text-xs text-[#555] hover:text-[#aaa] transition-colors">
              Axeous
            </Link>
            <span className="text-[#333]">/</span>
            <span className="text-xs text-[#555]">Learn</span>
          </div>
          <span className="text-xs text-[#555]">
            &copy; {new Date().getFullYear()} Axeous
          </span>
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

const StepCard = ({
  step,
  title,
  description,
}: {
  step: string
  title: string
  description: string
}) => (
  <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 space-y-4 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all">
    <span className="inline-block text-xs font-mono text-[#4f8ef7] bg-[#4f8ef7]/10 px-2.5 py-1 rounded-full">
      {step}
    </span>
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <p className="text-sm text-[#888] leading-relaxed">{description}</p>
  </div>
)

const FeatureCard = ({
  title,
  description,
  color,
}: {
  title: string
  description: string
  color: string
}) => (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 space-y-3 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
    <p className="text-sm text-[#888] leading-relaxed">{description}</p>
  </div>
)
