import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { IDLE_QUERY_KEY, useResourceQuery } from '@/lib/api/hooks'
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
  useResourceQuery({
    queryKey: examCode ? examKeys.officialTests(examCode) : IDLE_QUERY_KEY,
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
  useResourceQuery({
    queryKey: testId ? examKeys.officialTest(testId) : IDLE_QUERY_KEY,
    queryFn: ({ signal }) => getOfficialTest(testId!, signal),
    enabled: !!testId,
  })
