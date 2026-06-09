#!/usr/bin/env tsx
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import mongoose from 'mongoose'
import yaml from 'js-yaml'
import { connectDB } from '../config/db.js'
import { CorpusVersionModel } from '../features/learn/exam/corpus-version.model.js'
import { PlanDocumentModel } from '../features/learn/custom-plan/plan-document.model.js'
import { chunkText } from '../features/learn/custom-plan/parse.service.js'

// ── Types ───────────────────────────────────────────────────────────────────

interface ManifestFile {
  path: string
  role: 'reference' | 'official-test'
}

interface Manifest {
  exam: string
  corpusVersion: string
  files: ManifestFile[]
  generation?: {
    defaultTypeWeights?: Record<string, number>
    defaultDifficulty?: 'easy' | 'medium' | 'hard'
  }
}

interface Frontmatter {
  exam?: string
  section?: string
  sourceTitle?: string
  authoritative?: boolean
  license?: string
  contributors?: string[]
}

interface ParsedFile {
  frontmatter: Frontmatter
  body: string
}

// ── Path resolution ─────────────────────────────────────────────────────────

const HERE = path.dirname(fileURLToPath(import.meta.url))
// scripts/ → server/src/scripts → up three levels = repo root
const REPO_ROOT = path.resolve(HERE, '../../..')

function referenceDirFor(examCode: string): string {
  return path.join(REPO_ROOT, 'reference', examCode)
}

// ── Frontmatter parsing ─────────────────────────────────────────────────────

function parseFrontmatter(raw: string): ParsedFile {
  if (!raw.startsWith('---\n')) {
    return { frontmatter: {}, body: raw }
  }
  const end = raw.indexOf('\n---\n', 4)
  if (end === -1) {
    return { frontmatter: {}, body: raw }
  }
  const yamlBlock = raw.slice(4, end)
  const body = raw.slice(end + 5)
  let frontmatter: Frontmatter = {}
  try {
    const parsed = yaml.load(yamlBlock)
    if (parsed && typeof parsed === 'object') {
      frontmatter = parsed as Frontmatter
    }
  } catch (err) {
    throw new Error(`Invalid frontmatter YAML: ${(err as Error).message}`)
  }
  return { frontmatter, body }
}

// ── CLI args ────────────────────────────────────────────────────────────────

interface CliArgs {
  examCode: string
}

function parseArgs(argv: string[]): CliArgs {
  const args = new Map<string, string>()
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]
    if (tok.startsWith('--')) {
      const key = tok.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        args.set(key, next)
        i++
      } else {
        args.set(key, 'true')
      }
    }
  }
  const examCode = args.get('exam')
  if (!examCode) {
    throw new Error('Missing required flag: --exam <code> (e.g. --exam dat)')
  }
  return { examCode }
}

// ── Loader ──────────────────────────────────────────────────────────────────

export async function loadCorpus(examCode: string): Promise<{
  examCode: string
  corpusVersion: string
  filesLoaded: number
  skipped: number
}> {
  const dir = referenceDirFor(examCode)
  const manifestPath = path.join(dir, 'manifest.yaml')

  let manifestRaw: string
  try {
    manifestRaw = await readFile(manifestPath, 'utf-8')
  } catch (err) {
    throw new Error(`Cannot read manifest at ${manifestPath}: ${(err as Error).message}`)
  }

  const manifest = yaml.load(manifestRaw) as Manifest
  if (!manifest?.exam || !manifest?.corpusVersion || !Array.isArray(manifest.files)) {
    throw new Error(`Invalid manifest at ${manifestPath}: missing exam, corpusVersion, or files`)
  }
  if (manifest.exam !== examCode) {
    throw new Error(
      `Manifest exam mismatch: manifest declares "${manifest.exam}", CLI requested "${examCode}"`
    )
  }

  // Hash & parse every declared file. Hard-fail before any DB write so a
  // partial load can't pollute the corpus.
  const seenHashes = new Map<string, string>() // path → hash
  const filePayloads: Array<{
    manifestEntry: ManifestFile
    absPath: string
    raw: string
    parsed: ParsedFile
    hash: string
    size: number
  }> = []

  for (const entry of manifest.files) {
    const absPath = path.join(dir, entry.path)
    let raw: string
    try {
      raw = await readFile(absPath, 'utf-8')
    } catch (err) {
      throw new Error(
        `Cannot read declared file ${entry.path}: ${(err as Error).message}`
      )
    }
    const parsed = parseFrontmatter(raw)
    if (parsed.frontmatter.exam && parsed.frontmatter.exam !== examCode) {
      throw new Error(
        `File ${entry.path} declares exam "${parsed.frontmatter.exam}" but manifest is "${examCode}"`
      )
    }
    const hash = createHash('sha256').update(raw, 'utf-8').digest('hex')
    seenHashes.set(entry.path, hash)
    filePayloads.push({
      manifestEntry: entry,
      absPath,
      raw,
      parsed,
      hash,
      size: Buffer.byteLength(raw, 'utf-8'),
    })
  }

  // Hard-fail on hash mismatch: if a CorpusVersion already exists for this
  // (examCode, version), each declared file's hash must match.
  const existingVersion = await CorpusVersionModel.findOne({
    examCode,
    version: manifest.corpusVersion,
  }).lean()

  if (existingVersion) {
    const existingByPath = new Map(existingVersion.files.map((f) => [f.path, f.fileHash]))
    const mismatches: string[] = []
    for (const [filePath, hash] of seenHashes) {
      const prior = existingByPath.get(filePath)
      if (!prior) {
        mismatches.push(`new file ${filePath} not in prior version`)
        continue
      }
      if (prior !== hash) {
        mismatches.push(`hash mismatch on ${filePath}: was ${prior.slice(0, 12)}…, now ${hash.slice(0, 12)}…`)
      }
    }
    for (const f of existingVersion.files) {
      if (!seenHashes.has(f.path)) {
        mismatches.push(`prior file ${f.path} dropped from manifest`)
      }
    }
    if (mismatches.length > 0) {
      throw new Error(
        `Corpus ${examCode}@${manifest.corpusVersion} already loaded with different content. ` +
          `Bump corpusVersion in manifest.yaml to create a new version. Mismatches:\n  - ` +
          mismatches.join('\n  - ')
      )
    }
    console.log(
      `[load-corpus] ${examCode}@${manifest.corpusVersion} already loaded with matching hashes; chunk upserts are still idempotent, proceeding.`
    )
  }

  let filesLoaded = 0
  let skipped = 0
  const fileRecords: Array<{ path: string; role: 'reference' | 'official-test'; fileHash: string; chunkCount: number }> = []

  for (const payload of filePayloads) {
    if (payload.manifestEntry.role === 'official-test') {
      // v1: skip official-test parsing into OfficialTestModel. Future work
      // ingests these as canonical tests. Today we still record the entry
      // in CorpusVersion for traceability, with chunkCount: 0.
      skipped++
      fileRecords.push({
        path: payload.manifestEntry.path,
        role: 'official-test',
        fileHash: payload.hash,
        chunkCount: 0,
      })
      console.log(`[load-corpus] skip official-test ${payload.manifestEntry.path} (v1 does not ingest official tests)`)
      continue
    }

    const chunks = chunkText(payload.parsed.body)
    await PlanDocumentModel.updateOne(
      {
        corpusSource: 'official',
        examCode,
        corpusVersion: manifest.corpusVersion,
        fileHash: payload.hash,
      },
      {
        $set: {
          fileName: path.basename(payload.manifestEntry.path),
          filePath: payload.manifestEntry.path,
          fileType: 'md',
          fileSize: payload.size,
          parsedText: payload.parsed.body,
          charCount: payload.parsed.body.length,
          chunks,
          corpusSource: 'official',
          examCode,
          corpusVersion: manifest.corpusVersion,
          fileHash: payload.hash,
          role: 'reference',
        },
        $setOnInsert: {
          planId: null,
          uploadedAt: new Date(),
        },
      },
      { upsert: true }
    )
    filesLoaded++
    fileRecords.push({
      path: payload.manifestEntry.path,
      role: 'reference',
      fileHash: payload.hash,
      chunkCount: chunks.length,
    })
    console.log(
      `[load-corpus] loaded ${payload.manifestEntry.path} (${chunks.length} chunks, hash ${payload.hash.slice(0, 12)}…)`
    )
  }

  await CorpusVersionModel.updateOne(
    { examCode, version: manifest.corpusVersion },
    {
      $set: { files: fileRecords },
      $setOnInsert: { examCode, version: manifest.corpusVersion, loadedAt: new Date() },
    },
    { upsert: true }
  )

  return {
    examCode,
    corpusVersion: manifest.corpusVersion,
    filesLoaded,
    skipped,
  }
}

// ── Entrypoint ──────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set; cannot load corpus.')
  }
  await connectDB()
  try {
    const result = await loadCorpus(args.examCode)
    console.log(
      `[load-corpus] done: exam=${result.examCode} version=${result.corpusVersion} loaded=${result.filesLoaded} skipped=${result.skipped}`
    )
  } finally {
    await mongoose.disconnect()
  }
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (invokedDirectly) {
  main().catch((err) => {
    console.error('[load-corpus] failed:', err.message)
    process.exitCode = 1
  })
}
