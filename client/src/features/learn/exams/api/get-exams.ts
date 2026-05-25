import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { ExamSchema, type Exam } from '../types/exam.schema'

export const examKeys = {
  visible: () => ['exams', 'visible'] as const,
  all: () => ['exams', 'all'] as const,
  officialTests: (code: string) => ['exams', code, 'official-tests'] as const,
  officialTest: (testId: string) => ['exams', 'official-tests', testId] as const,
  questions: (code: string, opts?: { topic?: string; limit?: number }) =>
    ['exams', code, 'questions', opts] as const,
}

const ExamsResponseSchema = z.array(ExamSchema)

export const getVisibleExams = (signal?: AbortSignal): Promise<Exam[]> =>
  apiClient.get('/api/exams', ExamsResponseSchema, { signal })

export const useGetVisibleExams = () =>
  useQuery({
    queryKey: examKeys.visible(),
    queryFn: ({ signal }) => getVisibleExams(signal),
  })

export const getAllExams = (signal?: AbortSignal): Promise<Exam[]> =>
  apiClient.get('/api/exams/all', ExamsResponseSchema, { signal })

export const useGetAllExams = () =>
  useQuery({
    queryKey: examKeys.all(),
    queryFn: ({ signal }) => getAllExams(signal),
  })
