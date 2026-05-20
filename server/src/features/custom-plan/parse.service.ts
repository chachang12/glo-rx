import mammoth from 'mammoth'
import AdmZip from 'adm-zip'

const SUPPORTED_TYPES = ['pdf', 'docx', 'pptx'] as const
type FileType = (typeof SUPPORTED_TYPES)[number]

export const CHUNK_TARGET_SIZE = 2000
const CHUNK_MAX_SIZE = 3000

export interface DocumentChunk {
  index: number
  text: string
  charStart: number
  charEnd: number
}

export function isSupportedFileType(type: string): type is FileType {
  return SUPPORTED_TYPES.includes(type as FileType)
}

export function getFileType(fileName: string): FileType | null {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext && isSupportedFileType(ext)) return ext
  return null
}

async function parsePdf(buffer: Buffer): Promise<string> {
  // pdf-parse index.js reads a test PDF at require() time.
  // Import the lib entry directly to skip that.
  // @ts-expect-error — no types for internal path
  const mod = await import('pdf-parse/lib/pdf-parse.js')
  const pdfParse = mod.default ?? mod
  const data = await pdfParse(buffer)
  return data.text
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

async function parsePptx(buffer: Buffer): Promise<string> {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()

  const slideEntries = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/)?.[1] ?? '0')
      const numB = parseInt(b.entryName.match(/slide(\d+)/)?.[1] ?? '0')
      return numA - numB
    })

  const texts: string[] = []

  for (const entry of slideEntries) {
    const xml = entry.getData().toString('utf-8')
    const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g)
    if (matches) {
      const slideText = matches
        .map((m) => m.replace(/<[^>]+>/g, ''))
        .join(' ')
      if (slideText.trim()) {
        texts.push(slideText.trim())
      }
    }
  }

  return texts.join('\n\n')
}

export async function parseFile(buffer: Buffer, fileType: string): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return parsePdf(buffer)
    case 'docx':
      return parseDocx(buffer)
    case 'pptx':
      return parsePptx(buffer)
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

/**
 * Split parsed text into paragraph-bounded chunks of roughly CHUNK_TARGET_SIZE chars.
 * Prefers double-newline (paragraph) breaks, falls back to single-newline, then hard cuts at CHUNK_MAX_SIZE.
 * Each chunk records its absolute char range in the source so excerpts remain referenceable.
 */
export function chunkText(text: string): DocumentChunk[] {
  if (!text.trim()) return []

  const chunks: DocumentChunk[] = []
  let pos = 0
  let index = 0

  while (pos < text.length) {
    const remaining = text.length - pos
    if (remaining <= CHUNK_MAX_SIZE) {
      const slice = text.slice(pos).trim()
      if (slice) {
        chunks.push({ index, text: slice, charStart: pos, charEnd: text.length })
        index++
      }
      break
    }

    const target = pos + CHUNK_TARGET_SIZE
    const limit = Math.min(pos + CHUNK_MAX_SIZE, text.length)

    let breakPos = text.lastIndexOf('\n\n', limit)
    if (breakPos <= pos + CHUNK_TARGET_SIZE / 2) {
      breakPos = text.lastIndexOf('\n', limit)
    }
    if (breakPos <= pos + CHUNK_TARGET_SIZE / 2) {
      breakPos = text.lastIndexOf(' ', limit)
    }
    if (breakPos <= pos) {
      breakPos = limit
    }
    if (breakPos > limit) {
      breakPos = limit
    }
    if (breakPos < target - CHUNK_TARGET_SIZE / 2) {
      breakPos = limit
    }

    const slice = text.slice(pos, breakPos).trim()
    if (slice) {
      chunks.push({ index, text: slice, charStart: pos, charEnd: breakPos })
      index++
    }
    pos = breakPos + 1
  }

  return chunks
}
