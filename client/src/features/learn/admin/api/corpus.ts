import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { IDLE_QUERY_KEY, useResourceQuery } from '@/lib/api/hooks'
import {
  CorpusVersionSchema,
  LoadCorpusResultSchema,
  type CorpusVersion,
  type LoadCorpusResult,
} from '../types/opp.schema'

export const corpusKeys = {
  list: (examCode: string) => ['admin', 'corpus', examCode] as const,
}

const CorpusListSchema = z.array(CorpusVersionSchema)

export const listCorpusVersions = (
  examCode: string,
  signal?: AbortSignal
): Promise<CorpusVersion[]> =>
  apiClient.get(
    `/api/admin/corpus/${encodeURIComponent(examCode)}`,
    CorpusListSchema,
    { signal }
  )

export const useListCorpusVersions = (examCode: string | undefined) =>
  useResourceQuery({
    queryKey: examCode ? corpusKeys.list(examCode) : IDLE_QUERY_KEY,
    queryFn: ({ signal }) => listCorpusVersions(examCode!, signal),
    enabled: !!examCode,
  })

export const reloadCorpus = (examCode: string): Promise<LoadCorpusResult> =>
  apiClient.post(
    `/api/admin/corpus/${encodeURIComponent(examCode)}/load`,
    LoadCorpusResultSchema
  )

export const useReloadCorpus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reloadCorpus,
    onSuccess: (_data, examCode) => {
      queryClient.invalidateQueries({ queryKey: corpusKeys.list(examCode) })
    },
  })
}
