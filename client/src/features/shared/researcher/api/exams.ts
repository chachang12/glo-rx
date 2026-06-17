import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { ExamSchema, type Exam } from '@/features/learn/exams'

export const ResearcherExamSchema = ExamSchema.extend({
  topics: z.array(z.string()).default([]),
})
export type ResearcherExam = z.infer<typeof ResearcherExamSchema>

const ResearcherExamsResponseSchema = z.array(ResearcherExamSchema)

export const researcherKeys = {
  exams: () => ['researcher', 'exams'] as const,
}

export const listResearcherExams = (signal?: AbortSignal): Promise<ResearcherExam[]> =>
  apiClient.get('/api/researcher/exams', ResearcherExamsResponseSchema, { signal })

export const useListResearcherExams = () =>
  useQuery({
    queryKey: researcherKeys.exams(),
    queryFn: ({ signal }) => listResearcherExams(signal),
  })

// Re-export Exam for callers that want the base type.
export type { Exam }
