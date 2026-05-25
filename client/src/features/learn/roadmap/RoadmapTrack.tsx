import type { ComponentType, SVGProps } from 'react'
import { Dumbbell, Brain, RotateCcw, GraduationCap } from 'lucide-react'
import './RoadmapTrack.css'

export type RoadmapKind = 'drill' | 'quiz' | 'test' | 'review'
export type RoadmapStatus = 'done' | 'today' | 'future' | 'exam'

export interface RoadmapDay {
  id: string | number
  dayNumber: number
  kind: RoadmapKind
  status: RoadmapStatus
  label: string
  topicLabels?: string[]
  /** Optional decorative tag shown at bottom of card (e.g. "Today · 38 min", "EXAM DAY") */
  tag?: string
}

interface RoadmapTrackProps {
  days: RoadmapDay[]
  selectedId?: string | number
  onSelect?: (day: RoadmapDay) => void
  trackWidth?: number
  trackHeight?: number
  amplitude?: number
  /** Vertical midline of the wave. Default: trackHeight / 2 */
  midY?: number
  /** Number of oscillations across the full track. Default 1.5. */
  waveCycles?: number
  iconSize?: number
  cardMargin?: number
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

const KIND_ICONS: Record<RoadmapKind, IconComponent> = {
  drill: Dumbbell,
  quiz: Brain,
  review: RotateCcw,
  test: GraduationCap,
}

const CARD_WIDTH = 132

export const RoadmapTrack = ({
  days,
  selectedId,
  onSelect,
  trackWidth,
  trackHeight = 340,
  amplitude = 28,
  midY,
  waveCycles = 1.5,
  iconSize = 18,
  cardMargin = 28,
}: RoadmapTrackProps) => {
  const N = days.length
  if (N === 0) return null

  const trackW = trackWidth ?? Math.max(1400, N * 140)
  const padL = Math.max(100, CARD_WIDTH / 2 + 40)
  const padR = padL
  const spacing = (trackW - padL - padR) / Math.max(N - 1, 1)
  const mid = midY ?? trackHeight / 2
  const waveY = (x: number) => mid + Math.sin((x / trackW) * Math.PI * waveCycles) * amplitude

  const nodes = days.map((day, i) => {
    const x = padL + i * spacing
    return { day, x, y: waveY(x), i, isLast: i === N - 1 }
  })

  const pathPts: string[] = []
  for (let px = 0; px <= trackW; px += 4) {
    pathPts.push(`${px},${mid + Math.sin((px / trackW) * Math.PI * waveCycles) * amplitude}`)
  }
  const pathD = `M ${pathPts[0]} ${pathPts.slice(1).map((p) => `L ${p}`).join(' ')}`

  const reachedCount = days.filter((d) => d.status === 'done' || d.status === 'today').length
  const progress = Math.max(0.02, Math.min(1, reachedCount / N))
  const fadeStart = Math.max(0, progress - 0.02)

  const isInteractive = Boolean(onSelect)

  return (
    <div className="rm-track-wrap" style={{ height: trackHeight }}>
      <div style={{ position: 'relative', width: trackW, height: trackHeight, minWidth: trackW }}>
        <svg
          style={{ position: 'absolute', left: 0, top: 0, width: trackW, height: trackHeight, pointerEvents: 'none' }}
          viewBox={`0 0 ${trackW} ${trackHeight}`}
          fill="none"
        >
          <defs>
            <linearGradient id="rmSharedLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#6e9cc7" />
              <stop offset={`${Math.round(progress * 100)}%`} stopColor="#6e9cc7" />
              <stop offset={`${Math.round(fadeStart * 100 + 2)}%`} stopColor="rgba(167,139,250,0.14)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0.14)" />
            </linearGradient>
          </defs>
          <path d={pathD} stroke="rgba(110,156,199,0.2)" strokeWidth="6" strokeLinecap="round" style={{ filter: 'blur(6px)' }} />
          <path d={pathD} stroke="url(#rmSharedLine)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>

        {nodes.map(({ day, x, y, i }) => {
          const above = i % 2 === 0
          const selected = selectedId != null && selectedId === day.id
          const Icon = KIND_ICONS[day.kind]
          const card = (
            <div
              className="rm-card"
              style={above ? { marginBottom: cardMargin } : { marginTop: cardMargin }}
            >
              <span className="rm-leader" />
              <div className="rm-card-head">
                <span className="rm-day">Day {day.dayNumber}</span>
                <span className={`rm-kind k-${day.kind}`}>{day.kind}</span>
              </div>
              <div className="rm-label">{day.label}</div>
              {day.tag && <div className="rm-tag">{day.tag}</div>}
            </div>
          )
          return (
            <div
              key={day.id}
              className={`rm-node rm-${day.status} rm-${day.kind} ${above ? 'rm-above' : 'rm-below'}${selected ? ' rm-selected' : ''}`}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: 'translate(-50%,-50%)',
                display: 'flex',
                flexDirection: above ? 'column-reverse' : 'column',
                alignItems: 'center',
              }}
            >
              {above && card}
              <button
                type="button"
                className="rm-dot-btn"
                data-interactive={isInteractive || undefined}
                onClick={isInteractive ? () => onSelect!(day) : undefined}
                aria-label={`Day ${day.dayNumber}: ${day.label}`}
                title={day.label}
              >
                <div className="rm-dot">
                  <Icon size={iconSize} strokeWidth={2} aria-hidden="true" />
                </div>
              </button>
              {!above && card}
            </div>
          )
        })}
      </div>
    </div>
  )
}
