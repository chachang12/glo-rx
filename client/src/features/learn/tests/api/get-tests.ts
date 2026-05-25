import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import {
  TestListResponseSchema,
  CommunityTestSchema,
  type TestListResponse,
  type CommunityTest,
} from '../types/test.schema'

export interface ListTestsParams {
  examCode?: string
  tag?: string
  search?: string
  limit?: number
  offset?: number
}

export const testKeys = {
  all: () => ['tests'] as const,
  list: (params: ListTestsParams = {}) => ['tests', 'list', params] as const,
  byId: (id: string) => ['tests', 'byId', id] as const,
}

export const listTests = (
  params: ListTestsParams = {},
  signal?: AbortSignal
): Promise<TestListResponse> => {
  const query = new URLSearchParams()
  if (params.examCode) query.set('examCode', params.examCode)
  if (params.tag) query.set('tag', params.tag)
  if (params.search) query.set('search', params.search)
  if (params.limit) query.set('limit', String(params.limit))
  if (params.offset) query.set('offset', String(params.offset))
  const qs = query.toString()
  return apiClient.get(
    `/api/tests${qs ? `?${qs}` : ''}`,
    TestListResponseSchema,
    { signal }
  )
}

export const useListTests = (params: ListTestsParams = {}) =>
  useQuery({
    queryKey: testKeys.list(params),
    queryFn: ({ signal }) => listTests(params, signal),
  })

export const getTest = (id: string, signal?: AbortSignal): Promise<CommunityTest> =>
  apiClient.get(`/api/tests/${encodeURIComponent(id)}`, CommunityTestSchema, { signal })

export const useGetTest = (id: string | undefined) =>
  useQuery({
    queryKey: id ? testKeys.byId(id) : ['tests', '__noop__'],
    queryFn: ({ signal }) => getTest(id!, signal),
    enabled: !!id,
  })
