import { useTheme, type Theme } from '@/components/theme-provider'

export const Settings = () => {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-medium tracking-tight text-ink">Settings</h1>
          <p className="text-sm text-ink-dim">Profile, exam preferences, and session defaults.</p>
        </header>

        <AppearanceSection />
      </div>
    </div>
  )
}

const AppearanceSection = () => {
  const { theme, setTheme } = useTheme()

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-medium tracking-tight text-ink">Appearance</h2>
        <p className="text-xs text-ink-dim mt-0.5">Choose how Axeous looks to you.</p>
      </div>

      <div
        className="rounded-2xl border border-line bg-glass p-5 backdrop-blur-xl"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ThemeOption
            value="light"
            current={theme}
            onSelect={setTheme}
            label="Light"
            description="Brighter surfaces for daytime studying."
          />
          <ThemeOption
            value="dark"
            current={theme}
            onSelect={setTheme}
            label="Dark"
            description="Low-light surfaces for late-night sessions."
          />
        </div>
      </div>
    </section>
  )
}

interface ThemeOptionProps {
  value: Theme
  current: Theme
  onSelect: (t: Theme) => void
  label: string
  description: string
}

const ThemeOption = ({ value, current, onSelect, label, description }: ThemeOptionProps) => {
  const selected = current === value
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={selected}
      className={`group relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
        selected
          ? 'border-line-strong bg-glass-strong'
          : 'border-line bg-glass hover:border-line-strong hover:bg-glass-strong'
      }`}
    >
      <ThemePreview theme={value} />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            {value === 'light' ? <SunIcon /> : <MoonIcon />}
            {label}
          </div>
          <p className="text-xs text-ink-dim">{description}</p>
        </div>
        <span
          aria-hidden
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
            selected ? 'border-brand-blue bg-brand-blue' : 'border-line-strong bg-transparent'
          }`}
        >
          {selected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--bg)' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </div>
    </button>
  )
}

// ============================================================
// Mini mockup preview — always renders in the given theme
// regardless of the currently-applied theme.
// ============================================================
const ThemePreview = ({ theme }: { theme: Theme }) => {
  const isLight = theme === 'light'
  const bg = isLight ? '#f4f6fa' : '#05060a'
  const bg2 = isLight ? '#e8ecf3' : '#0a0d15'
  const ink = isLight ? '#0b0f18' : '#f3f5f9'
  const inkDim = isLight ? '#4d5568' : '#a7adbd'
  const line = isLight ? 'rgba(11,15,24,0.10)' : 'rgba(255,255,255,0.08)'
  const glass = isLight ? 'rgba(11,15,24,0.03)' : 'rgba(255,255,255,0.035)'

  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-lg border"
      style={{
        borderColor: line,
        background: `linear-gradient(180deg, ${bg} 0%, ${bg2} 100%)`,
        aspectRatio: '16 / 9',
      }}
    >
      <div className="flex h-full flex-col gap-2 p-3">
        {/* Nav pill */}
        <div
          className="flex h-5 items-center justify-between rounded-full px-2"
          style={{ background: glass, border: `1px solid ${line}` }}
        >
          <div className="h-1.5 w-6 rounded-full" style={{ background: ink, opacity: 0.7 }} />
          <div className="flex gap-1">
            <div className="h-1 w-4 rounded-full" style={{ background: inkDim }} />
            <div className="h-1 w-4 rounded-full" style={{ background: inkDim }} />
            <div className="h-1 w-4 rounded-full" style={{ background: inkDim }} />
          </div>
          <div className="h-2 w-2 rounded-full" style={{ background: '#6e9cc7' }} />
        </div>
        {/* Content */}
        <div className="flex flex-1 gap-2">
          <div
            className="flex-1 rounded-md"
            style={{ background: glass, border: `1px solid ${line}` }}
          >
            <div className="flex h-full flex-col justify-end p-2 gap-1">
              <div className="h-1 w-8 rounded-full" style={{ background: inkDim }} />
              <div className="h-1.5 w-12 rounded-full" style={{ background: ink, opacity: 0.8 }} />
            </div>
          </div>
          <div
            className="flex-1 rounded-md"
            style={{ background: glass, border: `1px solid ${line}` }}
          >
            <div className="flex h-full flex-col justify-end p-2 gap-1">
              <div className="h-1 w-6 rounded-full" style={{ background: inkDim }} />
              <div className="h-1.5 w-10 rounded-full" style={{ background: '#ff4858' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
  </svg>
)

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path
      d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
)
