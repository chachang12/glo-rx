import mammoth from 'mammoth'
import AdmZip from 'adm-zip'

const SUPPORTED_TYPES = ['pdf', 'docx', 'pptx'] as const
type FileType = (typeof SUPPORTED_TYPES)[number]

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

  // Collect slide XML entries sorted by slide number
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
    // Extract text from <a:t> tags (OOXML text runs)
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
