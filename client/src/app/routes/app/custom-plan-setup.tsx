import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { paths } from '@/config/paths'
import { apiFetch } from '@/lib/api'

interface UploadedDoc {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  charCount: number
}

type Step = 'upload' | 'extracting' | 'review'

const ACCEPTED_TYPES = '.pdf,.docx,.pptx'
const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  pptx: 'PPTX',
}

export const CustomPlanSetup = () => {
  const { planId } = useParams()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('upload')
  const [docs, setDocs] = useState<UploadedDoc[]>([])
  const [uploading, setUploading] = useState(false)
  const [topics, setTopics] = useState<string[]>([])
  const [newTopic, setNewTopic] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Upload ──────────────────────────────────────────────────────────────

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !planId) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await apiFetch(`/api/custom-plans/${planId}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Upload failed')
        return
      }

      const doc = await res.json()
      setDocs((prev) => [...prev, doc])
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }, [planId])

  // ── Extract Topics ──────────────────────────────────────────────────────

  const handleExtract = useCallback(async () => {
    if (!planId) return

    setStep('extracting')
    setError(null)

    try {
      const res = await apiFetch(`/api/custom-plans/${planId}/extract-topics`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Topic extraction failed')
        setStep('upload')
        return
      }

      const data = await res.json()
      setTopics(data.topics)
      setStep('review')
    } catch {
      setError('Topic extraction failed')
      setStep('upload')
    }
  }, [planId])

  // ── Confirm Topics ────────────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!planId || topics.length === 0) return

    setConfirming(true)
    setError(null)

    try {
      const res = await apiFetch(`/api/custom-plans/${planId}/confirm-topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to save topics')
        return
      }

      navigate(paths.app.customPlanDetail.getHref(planId))
    } catch {
      setError('Failed to save topics')
    } finally {
      setConfirming(false)
    }
  }, [planId, topics, navigate])

  // ── Topic editing ─────────────────────────────────────────────────────

  const removeTopic = (index: number) => {
    setTopics((prev) => prev.filter((_, i) => i !== index))
  }

  const editTopic = (index: number, value: string) => {
    setTopics((prev) => prev.map((t, i) => (i === index ? value : t)))
  }

  const addTopic = () => {
    if (newTopic.trim()) {
      setTopics((prev) => [...prev, newTopic.trim()])
      setNewTopic('')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#555]">
          <Link to={paths.app.plans.getHref()} className="hover:text-[#888] transition-colors">
            Plans
          </Link>
          <span>/</span>
          <span className="text-[#888]">Setup</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          <StepDot active={step === 'upload'} done={step !== 'upload'} label="1. Upload" />
          <div className="flex-1 h-px bg-white/[0.06]" />
          <StepDot active={step === 'extracting'} done={step === 'review'} label="2. Analyze" />
          <div className="flex-1 h-px bg-white/[0.06]" />
          <StepDot active={step === 'review'} done={false} label="3. Review" />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/5 px-4 py-3">
            <p className="text-xs text-[#ef4444]">{error}</p>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
                Upload Study Materials
              </h1>
              <p className="text-sm text-[#888]">
                Upload your lecture slides, notes, or textbook chapters. We'll extract the key topics.
              </p>
            </div>

            {/* Drop zone */}
            <label className="block cursor-pointer">
              <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] p-10 hover:border-[#4f8ef7]/30 transition-all">
                {uploading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-[#4f8ef7] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[#888]">Uploading...</p>
                  </>
                ) : (
                  <>
                    <UploadIcon />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#ddd]">
                        Click to upload a file
                      </p>
                      <p className="text-xs text-[#555] mt-1">
                        PDF, DOCX, or PPTX — up to 10MB
                      </p>
                    </div>
                  </>
                )}
              </div>
              <input
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {/* Uploaded files list */}
            {docs.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-[#bbb]">
                  Uploaded Files ({docs.length})
                </h2>
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#4f8ef7]/10 border border-[#4f8ef7]/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[#4f8ef7]">
                        {FILE_TYPE_LABELS[doc.fileType] ?? doc.fileType.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#ddd] truncate">
                        {doc.fileName}
                      </p>
                      <p className="text-xs text-[#555]">
                        {(doc.fileSize / 1024).toFixed(0)} KB — {doc.charCount.toLocaleString()} characters extracted
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Extract button */}
            <button
              onClick={handleExtract}
              disabled={docs.length === 0}
              className="w-full py-3 rounded-2xl bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Extract Topics
            </button>
          </div>
        )}

        {/* Step 2: Extracting */}
        {step === 'extracting' && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="w-8 h-8 border-2 border-[#4f8ef7] border-t-transparent rounded-full animate-spin" />
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-[#ddd]">
                Analyzing your materials...
              </p>
              <p className="text-xs text-[#555]">
                AI is identifying the key topics in your study materials
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review Topics */}
        {step === 'review' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#e8e6f0]">
                Review Topics
              </h1>
              <p className="text-sm text-[#888]">
                Edit, add, or remove topics. These will be used to track your readiness.
              </p>
            </div>

            {/* Topic list */}
            <div className="space-y-2">
              {topics.map((topic, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-3"
                >
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => editTopic(i, e.target.value)}
                    className="flex-1 bg-transparent text-sm text-[#ddd] focus:outline-none"
                  />
                  <button
                    onClick={() => removeTopic(i)}
                    className="text-[#555] hover:text-[#ef4444] transition-colors text-lg leading-none px-1"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            {/* Add topic */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                placeholder="Add a topic..."
                className="flex-1 px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-sm text-[#ddd] placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40"
              />
              <button
                onClick={addTopic}
                disabled={!newTopic.trim()}
                className="px-4 py-3 rounded-2xl border border-[#4f8ef7]/30 bg-[#4f8ef7]/5 text-xs font-semibold text-[#4f8ef7] hover:border-[#4f8ef7]/60 transition-all disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {/* Confirm */}
            <button
              onClick={handleConfirm}
              disabled={confirming || topics.filter((t) => t.trim()).length === 0}
              className="w-full py-3 rounded-2xl bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirming ? 'Saving...' : `Confirm ${topics.filter((t) => t.trim()).length} Topics`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helper Components ────────────────────────────────────────────────────────

const StepDot = ({ active, done, label }: { active: boolean; done: boolean; label: string }) => (
  <div className="flex items-center gap-2">
    <div
      className={`w-2.5 h-2.5 rounded-full transition-all ${
        active
          ? 'bg-[#4f8ef7] ring-4 ring-[#4f8ef7]/20'
          : done
            ? 'bg-[#10b981]'
            : 'bg-white/[0.1]'
      }`}
    />
    <span className={`text-xs font-mono ${active ? 'text-[#ddd]' : 'text-[#555]'}`}>
      {label}
    </span>
  </div>
)

const UploadIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)
