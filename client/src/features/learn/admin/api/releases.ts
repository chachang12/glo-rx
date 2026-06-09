import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import {
  ArchiveReleaseResultSchema,
  CreateReleaseInputSchema,
  PublishReleaseResultSchema,
  ReleaseCandidateSchema,
  ReleaseSchema,
  type ArchiveReleaseResult,
  type CreateReleaseInput,
  type PublishReleaseResult,
  type Release,
  type ReleaseCandidate,
} from '../types/opp.schema'

export const releaseKeys = {
  list: (examCode: string) => ['admin', 'releases', examCode] as const,
  candidates: (examCode: string) => ['admin', 'release-candidates', examCode] as const,
}

const ReleaseListSchema = z.array(ReleaseSchema)
const CandidatesListSchema = z.array(ReleaseCandidateSchema)

export const listReleases = (
  examCode: string,
  signal?: AbortSignal
): Promise<Release[]> =>
  apiClient.get(
    `/api/admin/releases/${encodeURIComponent(examCode)}`,
    ReleaseListSchema,
    { signal }
  )

export const useListReleases = (examCode: string | undefined) =>
  useQuery({
    queryKey: examCode ? releaseKeys.list(examCode) : ['admin', '__noop_releases__'],
    queryFn: ({ signal }) => listReleases(examCode!, signal),
    enabled: !!examCode,
  })

export const listReleaseCandidates = (
  examCode: string,
  signal?: AbortSignal
): Promise<ReleaseCandidate[]> =>
  apiClient.get(
    `/api/admin/releases/${encodeURIComponent(examCode)}/candidates`,
    CandidatesListSchema,
    { signal }
  )

export const useListReleaseCandidates = (examCode: string | undefined) =>
  useQuery({
    queryKey: examCode
      ? releaseKeys.candidates(examCode)
      : ['admin', '__noop_release_candidates__'],
    queryFn: ({ signal }) => listReleaseCandidates(examCode!, signal),
    enabled: !!examCode,
  })

export const createRelease = (input: CreateReleaseInput): Promise<Release> => {
  const parsed = CreateReleaseInputSchema.parse(input)
  return apiClient.post('/api/admin/releases', ReleaseSchema, { body: parsed })
}

export const useCreateRelease = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRelease,
    onSuccess: (release) => {
      queryClient.invalidateQueries({ queryKey: releaseKeys.list(release.examCode) })
      queryClient.invalidateQueries({
        queryKey: releaseKeys.candidates(release.examCode),
      })
    },
  })
}

export const publishRelease = (id: string): Promise<PublishReleaseResult> =>
  apiClient.post(
    `/api/admin/releases/${encodeURIComponent(id)}/publish`,
    PublishReleaseResultSchema
  )

export const usePublishRelease = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: publishRelease,
    onSuccess: ({ release }) => {
      queryClient.invalidateQueries({ queryKey: releaseKeys.list(release.examCode) })
      queryClient.invalidateQueries({
        queryKey: releaseKeys.candidates(release.examCode),
      })
    },
  })
}

export const archiveRelease = (id: string): Promise<ArchiveReleaseResult> =>
  apiClient.post(
    `/api/admin/releases/${encodeURIComponent(id)}/archive`,
    ArchiveReleaseResultSchema
  )

export const useArchiveRelease = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: archiveRelease,
    onSuccess: ({ release }) => {
      queryClient.invalidateQueries({ queryKey: releaseKeys.list(release.examCode) })
      queryClient.invalidateQueries({
        queryKey: releaseKeys.candidates(release.examCode),
      })
    },
  })
}
