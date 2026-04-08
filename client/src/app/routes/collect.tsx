import { Link } from 'react-router'
import { paths } from '@/config/paths'

export const Collect = () => {
  return (
    <div className="relative min-h-screen bg-[#060611] overflow-hidden">
      {/* ── Gradient blobs — warm/amber tones ───────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[25%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-[#f59e0b]/12 blur-[140px]" />
        <div className="absolute top-[35%] left-[15%] w-[45vw] h-[45vw] rounded-full bg-[#ef4444]/8 blur-[130px]" />
        <div className="absolute -bottom-[25%] right-[20%] w-[40vw] h-[40vw] rounded-full bg-[#10b981]/8 blur-[120px]" />
        <NoiseOverlay />
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <Link to={paths.home.getHref()} className="text-xl font-bold tracking-tight text-white hover:text-[#aaa] transition-colors">
            Axeous
          </Link>
          <span className="text-[#555]">/</span>
          <span className="text-sm font-semibold text-[#f59e0b]">Collect</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to={paths.home.getHref()} className="text-sm text-[#aaa] hover:text-white transition-colors">
            All products
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-24 pb-32">
        {/* Badge */}
        <div className="mb-8 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs text-[#aaa] font-medium">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f59e0b] mr-2" />
          Early development — coming soon
        </div>

        <h1 className="max-w-4xl text-center text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1]">
          <span className="text-white">Smarter selling</span>
          <br />
          <span className="bg-gradient-to-r from-[#f59e0b] via-[#ef4444] to-[#ec4899] bg-clip-text text-transparent">
            starts with data.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-center text-lg text-[#888] leading-relaxed">
          Real-time market insights, product analytics, and pricing trends
          for eBay sellers. Know what to sell, when to list, and how to price.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <button
            disabled
            className="px-6 py-3 rounded-full bg-[#f59e0b]/50 text-sm font-semibold text-white/70 cursor-not-allowed"
          >
            Coming soon
          </button>
          <a
            href="#features"
            className="px-6 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-semibold text-[#aaa] hover:text-white hover:bg-white/10 transition-all"
          >
            See what's planned
          </a>
        </div>
      </main>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 px-6 pb-32">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-[#555]">Planned features</p>
            <h2 className="text-3xl font-bold text-white">Built for collectors and resellers</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              title="Collector Dashboard"
              description="Track your inventory, monitor listings, and see your portfolio performance at a glance."
              color="#f59e0b"
            />
            <FeatureCard
              title="Market Overview"
              description="Live market data showing trending categories, average sell-through rates, and price movements."
              color="#ef4444"
            />
            <FeatureCard
              title="Product Insights"
              description="Search any product to see historical pricing, demand trends, and optimal listing times."
              color="#ec4899"
            />
            <FeatureCard
              title="Price Tracker"
              description="Set alerts on items you're watching. Get notified when prices hit your target."
              color="#10b981"
            />
            <FeatureCard
              title="Sell-Through Analytics"
              description="Understand which items move fast and which sit. Optimize your inventory turnover."
              color="#06b6d4"
            />
            <FeatureCard
              title="Competitor Intelligence"
              description="See what top sellers in your category are listing, pricing, and moving."
              color="#8b5cf6"
            />
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-12 text-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f59e0b]/40 to-transparent" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Get early access.
            </h2>
            <p className="mt-4 text-[#888] text-lg">
              Axeous Collect is under active development. Sign up to be notified when we launch.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="you@email.com"
                disabled
                className="flex-1 px-4 py-3 rounded-full border border-white/10 bg-white/5 text-sm text-[#555] placeholder-[#555] cursor-not-allowed"
              />
              <button
                disabled
                className="px-5 py-3 rounded-full bg-[#f59e0b]/50 text-sm font-semibold text-white/70 cursor-not-allowed"
              >
                Notify me
              </button>
            </div>
            <p className="mt-3 text-xs text-[#555]">Email signup coming soon</p>
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
            <span className="text-xs text-[#555]">Collect</span>
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
