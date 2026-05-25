import { cn } from '@/lib/utils'

interface UserAvatarProps {
  name: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-20 h-20 text-xl',
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const UserAvatar = ({ name, size = 'md', className }: UserAvatarProps) => {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold select-none',
        sizeMap[size],
        className
      )}
      style={{
        background: 'linear-gradient(135deg, var(--teal), var(--blue))',
        color: '#04120f',
      }}
    >
      {getInitials(name)}
    </div>
  )
}
