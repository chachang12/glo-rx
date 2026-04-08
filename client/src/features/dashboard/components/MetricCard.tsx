import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  sublabel?: string
  trend?: 'up' | 'down' | 'neutral'
  accent?: string
}

export const MetricCard = ({
  label,
  value,
  sublabel,
  trend,
  accent = '#4f8ef7',
}: MetricCardProps) => {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 space-y-3 hover:border-white/[0.12] transition-all">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-widest text-[#555]">
          {label}
        </p>
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold',
              trend === 'up' && 'text-[#10b981]',
              trend === 'down' && 'text-[#ef4444]',
              trend === 'neutral' && 'text-[#888]'
            )}
          >
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trend === 'neutral' && '–'}
          </span>
        )}
      </div>
      <p
        className="text-3xl font-bold tabular-nums tracking-tight"
        style={{ color: accent }}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-[#888]">{sublabel}</p>
      )}
    </div>
  )
}
