import { useState, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { apiFetch } from '@/lib/api'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

type Format = 'remnote' | 'anki'
type InputMode = 'text' | 'pdf'

interface FlashcardGeneratorProps {
  examCode: string
}

async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const parts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    if (text.trim()) parts.push(text)
  }

  return parts.join('\n\n')
}

export const FlashcardGenerator = ({ examCode }: FlashcardGeneratorProps) => {
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [textInput, setTextInput] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfText, setPdfText] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)

  const [format, setFormat] = useState<Format>('remnote')
  const [output, setOutput] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeText = inputMode === 'pdf' ? (pdfText ?? '') : textInput

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPdfFile(file)
    setPdfText(null)
    setError(null)
    setExtracting(true)

    try {
      const text = await extractTextFromPdf(file)
      if (!text.trim()) {
        setError('No text could be extracted from this PDF.')
        setPdfText(null)
      } else {
        setPdfText(text)
      }
    } catch {
      setError('Failed to read PDF. The file may be scanned or corrupted.')
      setPdfText(null)
    } finally {
      setExtracting(false)
    }
  }

  const handleClearPdf = () => {
    setPdfFile(null)
    setPdfText(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleGenerate = async () => {
    if (!activeText.trim()) return
    setLoading(true)
    setError(null)
    setOutput(null)

    try {
      const res = await apiFetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: activeText, examCode, format }),
      })

      if (res.status === 429) {
        setError('Daily usage limit reached. Try again tomorrow.')
        return
      }
      if (res.status === 403) {
        setError('You need an active plan for this exam to generate flashcards.')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Generation failed.')
        return
      }

      const data = await res.json()
      setOutput(data.flashcards)
    } catch {
      setError('Failed to connect to server.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!output) return
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flashcards-${examCode}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
  }

  return (
    <div className="space-y-6">
      {/* Format + input mode switchers */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FormatButton label="RemNote" active={format === 'remnote'} onClick={() => setFormat('remnote')} />
          <FormatButton label="Anki" active={format === 'anki'} disabled onClick={() => {}} />
        </div>
        <div className="flex items-center gap-2">
          <ModeButton label="Paste text" active={inputMode === 'text'} onClick={() => setInputMode('text')} />
          <ModeButton label="Upload PDF" active={inputMode === 'pdf'} onClick={() => setInputMode('pdf')} />
        </div>
      </div>

      {/* Input area */}
      {inputMode === 'text' ? (
        <div className="space-y-2">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste your notes, lecture text, or study material here..."
            rows={10}
            className="w-full px-4 py-3 rounded-xl border border-[#1e1e2e] bg-[#13131f] text-sm text-[#ddd] placeholder-[#555] resize-y focus:outline-none focus:ring-2 focus:ring-[#4f8ef7]/40 font-mono"
          />
          <p className="text-xs text-[#555] font-mono">{textInput.length.toLocaleString()} chars</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Drop zone */}
          <label
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all ${
              pdfFile
                ? 'border-[#4f8ef7]/30 bg-[#4f8ef7]/5'
                : 'border-[#1e1e2e] bg-[#13131f] hover:border-[#4f8ef7]/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {extracting ? (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-[#4f8ef7] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[#888]">Extracting text from PDF...</p>
              </div>
            ) : pdfFile ? (
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-[#ddd]">{pdfFile.name}</p>
                <p className="text-xs text-[#888]">
                  {pdfText ? `${pdfText.length.toLocaleString()} chars extracted` : 'Processing...'}
                </p>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <PdfIcon />
                <p className="text-sm text-[#888]">Click to upload a PDF</p>
                <p className="text-xs text-[#555]">Text will be extracted automatically</p>
              </div>
            )}
          </label>

          {pdfFile && (
            <button
              onClick={handleClearPdf}
              className="text-xs text-[#888] hover:text-[#ddd] transition-colors"
            >
              Clear file
            </button>
          )}

          {/* Preview extracted text */}
          {pdfText && (
            <details className="rounded-xl border border-[#1e1e2e] bg-[#13131f] overflow-hidden">
              <summary className="px-4 py-3 text-xs font-semibold text-[#888] cursor-pointer hover:text-[#ddd] transition-colors">
                Preview extracted text
              </summary>
              <pre className="px-4 py-3 max-h-48 overflow-auto text-xs text-[#555] font-mono whitespace-pre-wrap border-t border-[#1e1e2e]">
                {pdfText.slice(0, 3000)}{pdfText.length > 3000 ? '\n\n... (truncated)' : ''}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Generate button */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={loading || !activeText.trim()}
          className="px-5 py-2.5 rounded-lg bg-[#4f8ef7] text-[#0f0f1a] text-sm font-semibold hover:bg-[#4f8ef7]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate Flashcards'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3">
          <p className="text-xs text-[#ef4444]">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-6 flex items-center justify-center gap-3">
          <div className="w-4 h-4 border-2 border-[#4f8ef7] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#888]">Generating flashcards with AI...</p>
        </div>
      )}

      {/* Output */}
      {output && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-widest text-[#555]">
              Output — {format}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg border border-[#1e1e2e] bg-[#13131f] text-xs font-semibold text-[#888] hover:text-[#ddd] transition-all"
              >
                Copy
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-lg border border-[#4f8ef7]/30 bg-[#4f8ef7]/5 text-xs font-semibold text-[#4f8ef7] hover:border-[#4f8ef7]/60 transition-all"
              >
                Download .txt
              </button>
            </div>
          </div>
          <pre className="w-full max-h-96 overflow-auto px-4 py-3 rounded-xl border border-[#1e1e2e] bg-[#13131f] text-xs text-[#bbb] font-mono whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      )}
    </div>
  )
}

const FormatButton = ({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
      active
        ? 'bg-[#4f8ef7]/10 border border-[#4f8ef7]/30 text-[#4f8ef7]'
        : disabled
          ? 'border border-[#1e1e2e] bg-[#0d0d14] text-[#555] cursor-not-allowed'
          : 'border border-[#1e1e2e] bg-[#0d0d14] text-[#888] hover:text-[#ddd] hover:border-[#4f8ef7]/40'
    }`}
  >
    {label}
    {disabled && <span className="ml-1 text-[10px] text-[#555]">(soon)</span>}
  </button>
)

const ModeButton = ({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
      active
        ? 'border-[#4f8ef7]/30 bg-[#4f8ef7]/10 text-[#4f8ef7]'
        : 'border-[#1e1e2e] bg-[#0d0d14] text-[#888] hover:text-[#ddd] hover:border-[#4f8ef7]/40'
    }`}
  >
    {label}
  </button>
)

const PdfIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-[#888] mb-2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)
