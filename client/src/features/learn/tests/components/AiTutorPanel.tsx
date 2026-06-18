import { useEffect } from 'react'
import type { TutorExplanation } from '../api/get-tutor'

interface AiTutorPanelProps {
  open: boolean
  loading: boolean
  error: boolean
  data: TutorExplanation | null
  onClose: () => void
  onRetry: () => void
}

/** Bottom-sheet AI tutor. Content is generated server-side (real, not faked). */
export const AiTutorPanel = ({ open, loading, error, data, onClose, onRetry }: AiTutorPanelProps) => {
  // Close on Escape while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[300] bg-[#05060a]/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-label="AI Tutor"
        className={`fixed inset-x-0 bottom-0 z-[301] mx-auto max-h-[80vh] max-w-[580px] overflow-y-auto rounded-t-[20px] border border-b-0 border-white/[0.13] bg-[#090a12]/[0.98] px-6 pb-11 pt-7 transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-6 h-1 w-9 rounded-full bg-white/[0.13]" />

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[12px] border border-[#a78bfa]/20 bg-gradient-to-br from-[#6aa8ff]/[0.12] to-[#a78bfa]/[0.18] text-lg">
            ✦
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-[#f3f5f9]">AI Tutor</div>
            <div className="mt-0.5 font-mono text-[10px] tracking-wider text-[#a78bfa]">
              AXEOUS LEARN · POWERED BY CLAUDE
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.04] text-sm text-[#5b6173] transition-colors hover:bg-white/[0.07] hover:text-[#a7adbd]"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-2.5 w-28 animate-pulse rounded-full bg-white/[0.06]" />
                <div className="h-2.5 w-full animate-pulse rounded-full bg-white/[0.05]" />
                <div className="h-2.5 w-3/4 animate-pulse rounded-full bg-white/[0.05]" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-[#a7adbd]">The tutor couldn't generate an explanation right now.</p>
            <button
              onClick={onRetry}
              className="rounded-[10px] border border-[#a78bfa]/20 bg-[#a78bfa]/[0.08] px-4 py-2 text-[13px] font-medium text-[#a78bfa] transition-colors hover:bg-[#a78bfa]/[0.14]"
            >
              Try again
            </button>
          </div>
        )}

        {data && !loading && !error && (
          <div className="flex flex-col gap-5">
            <TutorSection label="Why this answer is wrong" body={data.whyWrong} />
            <TutorSection label="Key concept" body={data.keyConcept} />
            <div>
              <SectionLabel>Memory tip</SectionLabel>
              <div className="rounded-[12px] border border-[#a78bfa]/15 bg-[#a78bfa]/[0.06] px-4 py-3.5 text-[13.5px] leading-relaxed text-[#a7adbd]">
                {data.memoryTip}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-[#5b6173]">
    <span className="h-1 w-1 rounded-full bg-[#a78bfa]" style={{ boxShadow: '0 0 5px #a78bfa' }} />
    {children}
  </div>
)

const TutorSection = ({ label, body }: { label: string; body: string }) => (
  <div>
    <SectionLabel>{label}</SectionLabel>
    <div className="text-[14px] leading-relaxed text-[#a7adbd]">{body}</div>
  </div>
)
