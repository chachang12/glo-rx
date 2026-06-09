import { z } from 'zod'

export const CorpusFileSchema = z.object({
  path: z.string(),
  role: z.enum(['reference', 'official-test']),
  fileHash: z.string(),
  chunkCount: z.number().default(0),
})
export type CorpusFile = z.infer<typeof CorpusFileSchema>

export const CorpusVersionSchema = z.object({
  _id: z.string(),
  examCode: z.string(),
  version: z.string(),
  files: z.array(CorpusFileSchema).default([]),
  loadedAt: z.string().datetime({ offset: true }).optional(),
  loadedBy: z.string().nullable().optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
})
export type CorpusVersion = z.infer<typeof CorpusVersionSchema>

export const LoadCorpusResultSchema = z.object({
  examCode: z.string(),
  corpusVersion: z.string(),
  filesLoaded: z.number(),
  skipped: z.number(),
})
export type LoadCorpusResult = z.infer<typeof LoadCorpusResultSchema>

export const GenerateBatchResultSchema = z.object({
  questionIds: z.array(z.string()),
  generatedCount: z.number(),
  attempted: z.number(),
  droppedCount: z.number(),
})
export type GenerateBatchResult = z.infer<typeof GenerateBatchResultSchema>

export const GenerateBatchInputSchema = z.object({
  corpusVersion: z.string().min(1),
  topicLabel: z.string().min(1),
  count: z.number().int().min(1).max(25).optional(),
  allowedTypes: z.array(z.string()).optional(),
  typeWeights: z.record(z.string(), z.number()).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
  customInstructions: z.string().optional(),
})
export type GenerateBatchInput = z.infer<typeof GenerateBatchInputSchema>

export const PromoteResultSchema = z.object({
  matched: z.number(),
  promoted: z.number(),
})
export type PromoteResult = z.infer<typeof PromoteResultSchema>

// ── Releases ───────────────────────────────────────────────────────────────

export const ReleaseSchema = z.object({
  _id: z.string(),
  examCode: z.string(),
  version: z.string(),
  name: z.string(),
  notes: z.string().default(''),
  status: z.enum(['draft', 'live', 'archived']),
  questionIds: z.array(z.string()).default([]),
  corpusVersion: z.string().nullable().optional(),
  publishedBy: z.string().nullable().optional(),
  publishedAt: z.string().datetime({ offset: true }).nullable().optional(),
  archivedBy: z.string().nullable().optional(),
  archivedAt: z.string().datetime({ offset: true }).nullable().optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
})
export type Release = z.infer<typeof ReleaseSchema>

export const ReleaseCandidateSchema = z.object({
  _id: z.string(),
  stem: z.string(),
  type: z.string(),
  topics: z.array(z.string()).default([]),
  difficulty: z.string().nullable().optional(),
  approvalCount: z.number().default(0),
  createdAt: z.string().datetime({ offset: true }).optional(),
})
export type ReleaseCandidate = z.infer<typeof ReleaseCandidateSchema>

export const CreateReleaseInputSchema = z.object({
  examCode: z.string().min(1),
  version: z.string().min(1),
  name: z.string().min(1),
  notes: z.string().optional(),
  corpusVersion: z.string().nullable().optional(),
  questionIds: z.array(z.string()).min(1),
})
export type CreateReleaseInput = z.infer<typeof CreateReleaseInputSchema>

export const PublishReleaseResultSchema = z.object({
  release: ReleaseSchema,
  stamped: z.number(),
  skipped: z.number(),
})
export type PublishReleaseResult = z.infer<typeof PublishReleaseResultSchema>

export const ArchiveReleaseResultSchema = z.object({
  release: ReleaseSchema,
  reverted: z.number(),
})
export type ArchiveReleaseResult = z.infer<typeof ArchiveReleaseResultSchema>
