import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'

export const TutorExplanationSchema = z.object({
  whyWrong: z.string(),
  keyConcept: z.string(),
  memoryTip: z.string(),
})

export type TutorExplanation = z.infer<typeof TutorExplanationSchema>

export interface TutorRequest {
  examCode?: string
  stem: string
  /** Human-readable option list, e.g. "A. Mitochondria\nB. Ribosome". */
  optionsText: string
  correctAnswer: string
  userAnswer: string
  explanation?: string
}

export const getTutorExplanation = (input: TutorRequest) =>
  apiClient.post('/api/exams/tutor', TutorExplanationSchema, { body: input })

export const useTutorExplanation = () =>
  useMutation({ mutationFn: getTutorExplanation })
