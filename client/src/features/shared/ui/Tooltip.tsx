import { useState, useRef, useEffect, type ReactNode } from 'react'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
}

export const Tooltip = ({ content, children }: TooltipProps) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <div
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="cursor-help"
      >
        {children}
      </div>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl border border-white/[0.08] bg-[#1a1a2e] shadow-xl shadow-black/40 p-3 text-xs text-[#bbb] leading-relaxed">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 rotate-45 bg-[#1a1a2e] border-r border-b border-white/[0.08]" />
          </div>
        </div>
      )}
    </div>
  )
}
