import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import {
  OfficialTestSchema,
  OfficialTestSummarySchema,
  type OfficialTest,
  type OfficialTestSummary,
} from '../types/exam.schema'
import { examKeys } from './get-exams'

const OfficialTestsResponseSchema = z.array(OfficialTestSummarySchema)

export const getOfficialTestsForExam = (
  examCode: string,
  signal?: AbortSignal
): Promise<OfficialTestSummary[]> =>
  apiClient.get(
    `/api/exams/${encodeURIComponent(examCode)}/official-tests`,
    OfficialTestsResponseSchema,
    { signal }
  )

export const useGetOfficialTestsForExam = (examCode: string | undefined) =>
  useQuery({
    queryKey: examCode ? examKeys.officialTests(examCode) : ['exams', '__noop__'],
    queryFn: ({ signal }) => getOfficialTestsForExam(examCode!, signal),
    enabled: !!examCode,
  })

export const getOfficialTest = (
  testId: string,
  signal?: AbortSignal
): Promise<OfficialTest> =>
  apiClient.get(
    `/api/exams/official-tests/${encodeURIComponent(testId)}`,
    OfficialTestSchema,
    { signal }
  )

export const useGetOfficialTest = (testId: string | undefined) =>
  useQuery({
    queryKey: testId ? examKeys.officialTest(testId) : ['exams', '__noop_test__'],
    queryFn: ({ signal }) => getOfficialTest(testId!, signal),
    enabled: !!testId,
  })
