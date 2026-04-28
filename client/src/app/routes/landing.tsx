import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import AxeousLogo from '@/components/ui/AxeousLogo'
import { ThemeToggle } from '@/components/theme-provider'
import { RoadmapTrack, type RoadmapDay } from '@/features/roadmap'
import './landing.css'

const ArrowIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const CheckIcon = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M5 12l5 5L20 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const Nav = () => {
  const [open, setOpen] = useState(false)
  const navRef = useRef<HTMLElement | null>(null)
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  return (
    <nav className={`nav ${open ? 'nav-open' : ''}`} ref={navRef}>
      <div className="nav-inner">
        <a href="#top" className="brand" onClick={close}>
          <span className="brand-mark">
            <AxeousLogo size={22} color="currentColor" />
          </span>
          <span className="brand-name">Axeous</span>
        </a>
        <div className="nav-links nav-desktop-only">
          <a href="#plan">Plan</a>
          <a href="#products">Practice</a>
          <a href="#compare">Test</a>
        </div>
        <div className="nav-right">
          <ThemeToggle />
          <div className="nav-links nav-desktop-only">
            <Link to={paths.auth.login.getHref()}>Sign in</Link>
          </div>
          <Link to={paths.auth.login.getHref()} className="nav-cta nav-desktop-only">
            Get started <ArrowIcon size={12} />
          </Link>
          <button
            type="button"
            className="nav-burger"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="nav-mobile-sheet"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="nav-burger-line" />
            <span className="nav-burger-line" />
          </button>
        </div>
      </div>

      {open && (
        <div id="nav-mobile-sheet" className="nav-sheet" role="menu">
          <a href="#plan" role="menuitem" onClick={close}>
            Plan
          </a>
          <a href="#products" role="menuitem" onClick={close}>
            Practice
          </a>
          <a href="#compare" role="menuitem" onClick={close}>
            Test
          </a>
          <div className="nav-sheet-divider" />
          <Link to={paths.auth.login.getHref()} role="menuitem" onClick={close}>
            Sign in
          </Link>
          <Link to={paths.auth.login.getHref()} className="nav-cta nav-sheet-cta" role="menuitem" onClick={close}>
            Get started <ArrowIcon size={12} />
          </Link>
        </div>
      )}
    </nav>
  )
}

const AXEOUS_VERTS: [number, number][] = [
  [739.85, 229.52],
  [739.85, 1.21],
  [315.03, 426.04],
  [121.35, 232.36],
  [121.2, 395.33],
  [233.47, 507.6],
  [1.21, 739.87],
  [229.5, 739.87],
  [347.62, 621.75],
  [465.74, 739.87],
  [469.41, 739.87],
  [628.84, 739.87],
  [739.85, 739.87],
  [739.85, 471.22],
  [549.39, 660.42],
  [429.17, 540.19],
]
const AXEOUS_VB = 740.35

const LogoPrism = () => {
  const verts = AXEOUS_VERTS.map(([x, y]) => [(x / AXEOUS_VB) * 100 - 50, (y / AXEOUS_VB) * 100 - 50] as [number, number])
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState(380)

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setSize(e.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const DEPTH = 70
  const half = DEPTH / 2

  const sides = verts.map((v, i) => {
    const [x1, y1] = v
    const [x2, y2] = verts[(i + 1) % verts.length]
    const px1 = ((x1 + 50) / 100) * size
    const py1 = ((y1 + 50) / 100) * size
    const px2 = ((x2 + 50) / 100) * size
    const py2 = ((y2 + 50) / 100) * size
    const dx = px2 - px1
    const dy = py2 - py1
    const len = Math.sqrt(dx * dx + dy * dy)
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI
    return { i, px1, py1, len, ang }
  })

  const polyPts = verts.map((v) => `${v[0] + 50},${v[1] + 50}`).join(' ')

  return (
    <div className="orb-wrap" aria-hidden="true">
      <div className="orb-stage" ref={stageRef}>
        {sides.map((s) => (
          <div
            key={`side${s.i}`}
            className="prism-side"
            style={{
              width: `${s.len}px`,
              height: `${DEPTH}px`,
              transform: `translate3d(${s.px1}px, ${s.py1}px, ${half}px) rotateZ(${s.ang}deg) rotateX(-90deg)`,
            }}
          />
        ))}
        <div className="prism-cap bottom">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="edgeGradB" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6e9cc7" stopOpacity="1" />
                <stop offset="50%" stopColor="#3a5878" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#ff4858" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <polygon points={polyPts} fill="none" stroke="url(#edgeGradB)" strokeWidth="1.1" style={{ filter: 'drop-shadow(0 0 2px #6e9cc7)' }} />
          </svg>
        </div>
        <div className="prism-cap top">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6e9cc7" stopOpacity="1" />
                <stop offset="50%" stopColor="#3a5878" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#ff4858" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <polygon points={polyPts} fill="none" stroke="url(#edgeGrad)" strokeWidth="1.1" style={{ filter: 'drop-shadow(0 0 2px #6e9cc7)' }} />
          </svg>
        </div>
      </div>
    </div>
  )
}

const Hero = () => (
  <section className="hero" id="top">
    <div className="wrap">
      <div className="hero-grid">
        <div>
          <div className="eyebrow">
            <span className="pill">NEW</span>
            <span>Axeous Learn — custom study plans</span>
            <span className="arrow">→</span>
          </div>
          <h1 className="h1">
            <span className="block">AI tools for</span>
            <span className="block">
            <span className="serif">learners.</span>
            </span>
          </h1>
          <p className="hero-sub">
            Axeous builds focused AI software for students preparing for the tests that matter most. Adaptive drills, honest feedback, no fluff.
          </p>
          <div className="cta-row">
            <a href="#products" className="btn btn-primary">
              Explore the suite <ArrowIcon size={13} />
            </a>
            <a href="#compare" className="btn btn-ghost">
              See what's new
            </a>
          </div>
        </div>
        <LogoPrism />
      </div>
    </div>
  </section>
)

const UploadMock = () => {
  const files: { name: string; pages: number; status: 'done' | 'generating'; qs: number | null }[] = [
    { name: 'Pharm_Ch12_Antibiotics.pdf', pages: 42, status: 'done', qs: 38 },
    { name: 'Med-Surg_Notes_Cardiac.pdf', pages: 67, status: 'done', qs: 54 },
    { name: 'OB_Lecture_Slides_Wk4.pptx', pages: 28, status: 'generating', qs: null },
  ]
  return (
    <div className="upload-mock">
      <div className="um-dropzone">
        <div className="um-drop-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <div className="um-drop-text">Drop files or browse</div>
        <div className="um-drop-sub">PDF, PPTX, DOCX, images</div>
      </div>

      <div className="um-files">
        {files.map((f, i) => (
          <div key={i} className={`um-file ${f.status}`}>
            <div className="um-file-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="um-file-info">
              <div className="um-file-name">{f.name}</div>
              <div className="um-file-meta">{f.pages} pages</div>
            </div>
            <div className="um-file-status">
              {f.status === 'done' ? (
                <span className="um-qs">{f.qs} Qs</span>
              ) : (
                <span className="um-generating">
                  <span className="um-spinner" />
                  Generating…
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="um-exam-tag">
        <span className="um-exam-chip">VTNE</span>
        Questions aligned to exam objectives
      </div>
    </div>
  )
}

const LearnMock = () => {
  const [selected, setSelected] = useState(2)
  const opts = [
    { l: 'A', t: 'Flumazenil', correct: false },
    { l: 'B', t: 'Naloxone', correct: false },
    { l: 'C', t: 'Atipamezole', correct: true },
    { l: 'D', t: 'Yohimbine', correct: false },
  ]
  return (
    <div className="learn-mock">
      <div className="lm-head">
        <span>VTNE · Pharmacology</span>
        <div className="lm-progress">
          <span className="done" />
          <span className="done" />
          <span className="done" />
          <span className="active" />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="lm-q">
        A 6-year-old canine presents with bradycardia after receiving dexmedetomidine. Which reversal agent is most appropriate?
      </div>
      <div className="lm-opts">
        {opts.map((o, i) => (
          <div
            key={i}
            className={`lm-opt ${selected === i && o.correct ? 'correct' : ''}`}
            onClick={() => setSelected(i)}
          >
            <div className="lm-letter">{o.l}</div>
            <div>{o.t}</div>
            <div className="check">
              <CheckIcon />
            </div>
          </div>
        ))}
      </div>
      <div className="lm-ai">
        <div className="ai-icon">AI</div>
        <div>
          <b>Tutor ·</b> Atipamezole is the specific α₂-antagonist for dexmedetomidine. Naloxone reverses opioids, flumazenil reverses benzos. Answered in 11s — nice improvement.
        </div>
      </div>
    </div>
  )
}

const Products = () => (
  <section className="products" id="products">
    <div className="wrap">
      <div className="section-label">
        <span className="dot" /> Axeous Learn
      </div>
      <h2 className="section-title">
        Study smarter, not harder — the adaptive way to <em>prep for the tests that matter.</em>
      </h2>
      <div className="products-grid">
        <article className="product-card pc-upload" id="upload">
          <div className="pc-head">
            <div className="pc-brand">
              <span className="pc-chip up">↑</span> Upload & Generate
            </div>
          </div>
          <h3 className="pc-title">Your notes, unlimited questions.</h3>
          <p className="pc-tagline">
            Upload lecture slides, textbooks, or notes — Learn generates exam-aligned practice questions instantly. Never run out of material.
          </p>
          <div className="pc-body">
            <UploadMock />
          </div>
        </article>

        <article className="product-card pc-learn" id="learn">
          <div className="pc-head">
            <div className="pc-brand">
              <span className="pc-chip">L</span> Axeous Learn
            </div>
          </div>
          <h3 className="pc-title">Study smarter.</h3>
          <p className="pc-tagline">
            AI-powered standardized test prep. Adaptive practice for SAT, ACT, GRE, LSAT and MCAT — with a tutor that explains every answer.
          </p>
          <div className="pc-body">
            <LearnMock />
          </div>
        </article>
      </div>
    </div>
  </section>
)

const Marquee = () => {
  const items = ['SAT', 'ACT', 'GRE', 'LSAT', 'MCAT', 'TOEFL', 'GMAT', 'AP Exams', 'NCLEX', 'BAR']
  const doubled = [...items, ...items]
  return (
    <div className="marquee">
      <div className="marquee-track">
        {doubled.map((t, i) => (
          <span key={i} className="marquee-item">
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

const Roadmap = () => {
  const days: RoadmapDay[] = [
    { id: 1, dayNumber: 1, kind: 'drill', label: 'Pharmacology', status: 'done' },
    { id: 2, dayNumber: 2, kind: 'quiz', label: 'Med-surg', status: 'done' },
    { id: 3, dayNumber: 3, kind: 'drill', label: 'Peds nursing', status: 'done' },
    { id: 4, dayNumber: 4, kind: 'review', label: 'Weak spots', status: 'done' },
    { id: 5, dayNumber: 5, kind: 'test', label: 'Section test', status: 'done' },
    { id: 6, dayNumber: 6, kind: 'drill', label: 'OB nursing', status: 'today', tag: 'Today · 38 min' },
    { id: 7, dayNumber: 7, kind: 'quiz', label: 'Psych nursing', status: 'future' },
    { id: 8, dayNumber: 8, kind: 'drill', label: 'Prioritization', status: 'future' },
    { id: 9, dayNumber: 9, kind: 'review', label: 'Mistakes', status: 'future' },
    { id: 10, dayNumber: 10, kind: 'test', label: 'Timed section', status: 'future' },
    { id: 11, dayNumber: 11, kind: 'drill', label: 'Lab values', status: 'future' },
    { id: 12, dayNumber: 12, kind: 'quiz', label: 'SATA drills', status: 'future' },
    { id: 13, dayNumber: 13, kind: 'review', label: 'Final review', status: 'future' },
    { id: 14, dayNumber: 14, kind: 'test', label: 'Full mock', status: 'exam', tag: 'EXAM DAY' },
  ]
  return (
    <section className="features" id="plan">
      <div className="wrap">
        <div className="section-label">
          <span className="dot" /> Capability · Study Roadmap
        </div>
        <h2 className="section-title">
          An AI-generated path from <em>where you are today</em> to exam day.
        </h2>
        <p style={{ maxWidth: 680, color: 'var(--ink-dim)', fontSize: 16, lineHeight: 1.55, margin: '-32px 0 40px' }}>
          Tell Learn your test and your date. It builds a daily plan — drills, quizzes, timed sections, review days — that adapts every night based on how you performed.
        </p>
        <div className="roadmap-card">
          <div className="rm-head">
            <div className="rm-head-l">
              <span className="rm-chip">NCLEX</span>
              <span className="rm-meta">14 days to exam · May 4</span>
            </div>
            <div className="rm-head-r">
              <span className="rm-legend">
                <i className="sw done" /> Complete
              </span>
              <span className="rm-legend">
                <i className="sw today" /> Today
              </span>
              <span className="rm-legend">
                <i className="sw future" /> Upcoming
              </span>
            </div>
          </div>

          <RoadmapTrack
            days={days}
            trackWidth={1600}
            trackHeight={340}
            amplitude={22}
            midY={150}
            iconSize={16}
            cardMargin={28}
          />

          <div className="rm-foot">
            <div className="rm-foot-item">
              <b>Adapts nightly.</b> After each session, the plan rewrites itself around your weak spots.
            </div>
            <div className="rm-foot-item">
              <b>Honest ETA.</b> Target score probability updates with every drill — no vanity metrics.
            </div>
            <div className="rm-foot-item">
              <b>Skip or swap.</b> Busy day? Reschedule. Burnt out? Learn suggests a lighter session.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

type Tool = { title: string; desc: string; icon: 'cards' | 'verbal' | 'mindmap'; showBrands?: boolean }

const Tools = () => {
  const tools: Tool[] = [
    {
      title: 'Flashcard Generation',
      desc: 'AI generates flashcards from your notes and exports directly to Anki, RemNote, and Quizlet.',
      icon: 'cards',
      showBrands: true,
    },
    {
      title: 'Verbal Practice',
      desc: 'Speak your answers out loud. AI listens, evaluates your reasoning, and coaches you through weak areas.',
      icon: 'verbal',
    },
    {
      title: 'Mind Map Visualization',
      desc: 'See how concepts connect. Auto-generated mind maps from your study materials that update as you learn.',
      icon: 'mindmap',
    },
  ]
  return (
    <section className="tools-section" id="compare">
      <div className="wrap">
        <div className="section-label">
          <span className="dot" /> Tools
        </div>
        <h2 className="section-title">
          More ways to <em>lock it in.</em>
        </h2>
        <div className="tools-grid">
          {tools.map((t, i) => (
            <div key={i} className="tool-card">
              <div className={`tool-glass-icon gi-${t.icon}`}>
                {t.icon === 'cards' && (
                  <div className="gi-inner">
                    <div className="glass-card gc-back" />
                    <div className="glass-card gc-mid" />
                    <div className="glass-card gc-front">
                      <div className="gc-lines">
                        <div className="gc-line w70" />
                        <div className="gc-line w50" />
                        <div className="gc-line w30" />
                      </div>
                      <div className="gc-flip">{String.fromCharCode(8635)}</div>
                    </div>
                  </div>
                )}
                {t.icon === 'verbal' && (
                  <div className="gi-inner">
                    <div className="glass-mic">
                      <div className="gm-head" />
                      <div className="gm-stem" />
                      <div className="gm-base" />
                    </div>
                    <div className="glass-waves">
                      <div className="gw-bar" style={{ '--h': '60%', '--d': '0s' } as React.CSSProperties} />
                      <div className="gw-bar" style={{ '--h': '100%', '--d': '0.1s' } as React.CSSProperties} />
                      <div className="gw-bar" style={{ '--h': '75%', '--d': '0.2s' } as React.CSSProperties} />
                      <div className="gw-bar" style={{ '--h': '90%', '--d': '0.15s' } as React.CSSProperties} />
                      <div className="gw-bar" style={{ '--h': '50%', '--d': '0.25s' } as React.CSSProperties} />
                    </div>
                  </div>
                )}
                {t.icon === 'mindmap' && (
                  <div className="gi-inner">
                    <svg className="glass-map" viewBox="0 0 80 60" fill="none">
                      <circle cx="40" cy="30" r="8" className="gm-node gm-center" />
                      <circle cx="14" cy="14" r="5" className="gm-node gm-leaf" />
                      <circle cx="66" cy="14" r="5" className="gm-node gm-leaf" />
                      <circle cx="14" cy="48" r="5" className="gm-node gm-leaf" />
                      <circle cx="66" cy="48" r="5" className="gm-node gm-leaf" />
                      <line x1="34" y1="25" x2="18" y2="17" className="gm-edge" />
                      <line x1="46" y1="25" x2="62" y2="17" className="gm-edge" />
                      <line x1="34" y1="35" x2="18" y2="45" className="gm-edge" />
                      <line x1="46" y1="35" x2="62" y2="45" className="gm-edge" />
                    </svg>
                  </div>
                )}
              </div>
              <h3 className="tool-title">{t.title}</h3>
              <p className="tool-desc">{t.desc}</p>
              {t.showBrands && (
                <div className="tool-brands">
                  <div className="brand-icon" title="Anki">
                    <svg viewBox="0 0 32 32" width="28" height="28">
                      <rect x="4" y="6" width="24" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M12 16l3 3 5-6" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                    <span className="brand-name-small">Anki</span>
                  </div>
                  <div className="brand-icon" title="RemNote">
                    <svg viewBox="0 0 32 32" width="28" height="28">
                      <circle cx="16" cy="14" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="16" cy="14" r="3.5" fill="var(--violet)" opacity="0.6" />
                      <path d="M16 23v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span className="brand-name-small">RemNote</span>
                  </div>
                  <div className="brand-icon" title="Quizlet">
                    <svg viewBox="0 0 32 32" width="28" height="28">
                      <circle cx="16" cy="15" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      <text x="16" y="19" textAnchor="middle" fill="currentColor" fontSize="13" fontFamily="'Geist',sans-serif" fontWeight="600">
                        Q
                      </text>
                      <circle cx="22" cy="22" r="3" fill="var(--blue)" opacity="0.6" />
                    </svg>
                    <span className="brand-name-small">Quizlet</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const CTA = () => (
  <section className="cta-section">
    <div className="wrap">
      <div className="cta-card">
        <h2>
          Everything you need. <em>A fraction of the price.</em>
        </h2>
        <ul className="cta-features">
          <li>
            <CheckIcon color="var(--teal)" /> Unlimited AI-generated practice questions
          </li>
          <li>
            <CheckIcon color="var(--teal)" /> Adaptive study roadmaps that update daily
          </li>
          <li>
            <CheckIcon color="var(--teal)" /> Flashcard export to Anki, RemNote &amp; Quizlet
          </li>
          <li>
            <CheckIcon color="var(--teal)" /> Verbal practice with real-time AI feedback
          </li>
          <li>
            <CheckIcon color="var(--teal)" /> Mind maps &amp; concept visualization
          </li>
          <li>
            <CheckIcon color="var(--teal)" /> Up to 80% less than competitors like UWorld &amp; Kaplan
          </li>
        </ul>
        <p>14 days free. No credit card. Cancel anytime.</p>
        <div className="cta-row">
          <Link to={paths.auth.login.getHref()} className="btn btn-primary">
            Get started for free <ArrowIcon size={13} />
          </Link>
          <Link to={paths.learn.getHref()} className="btn btn-ghost">
            Compare pricing
          </Link>
        </div>
      </div>
    </div>
  </section>
)

const Footer = () => (
  <footer className="ax-footer">
    <div className="wrap">
      <div className="footer-top">
        <div className="footer-brand">
          <AxeousLogo size={18} color="currentColor" />
          <span style={{ fontWeight: 500, fontSize: 15 }}>Axeous</span>
        </div>
        <div className="footer-cols">
          <div className="footer-col">
            <h5>Products</h5>
            <Link to={paths.learn.getHref()}>Axeous Learn</Link>
            <Link to={paths.collect.getHref()}>Axeous Collect</Link>
            <a href="#products">Upload &amp; Generate</a>
            <a href="#plan">Study Roadmap</a>
          </div>
          <div className="footer-col">
            <h5>Company</h5>
            <a href="#">Blog</a>
            <a href="#">Documentation</a>
            <a href="#">Changelog</a>
            <a href="#">Contact Us</a>
          </div>
          <div className="footer-col">
            <h5>Legal</h5>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Accessibility</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Axeous</span>
        <div className="footer-socials">
          <a href="#" aria-label="X">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a href="#" aria-label="Instagram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a href="#" aria-label="TikTok">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.15V11.7a4.81 4.81 0 01-3.58-1.59V6.69h3.58z" />
            </svg>
          </a>
          <a href="#" aria-label="LinkedIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </footer>
)

export const Landing = () => {
  return (
    <div className="axeous-landing">
      <div className="backdrop" />
      <div className="grid-lines" />
      <div className="noise" />
      <div className="content">
        <Nav />
        <Hero />
        <Marquee />
        <Products />
        <Roadmap />
        <Tools />
        <CTA />
        <Footer />
      </div>
    </div>
  )
}
