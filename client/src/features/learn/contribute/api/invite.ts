import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { userKeys } from '@/features/shared/user'
import {
  AcceptInviteResponseSchema,
  InviteDetailsSchema,
  type AcceptInviteResponse,
  type InviteDetails,
} from '../types/contribute.schema'
import { contributorKeys } from './get-me'

export const getInviteDetails = (
  token: string,
  signal?: AbortSignal
): Promise<InviteDetails> =>
  apiClient.get(
    `/api/contributor/invite/${encodeURIComponent(token)}`,
    InviteDetailsSchema,
    { signal }
  )

export const useGetInviteDetails = (token: string | undefined) =>
  useQuery({
    queryKey: ['contributor', 'invite', token ?? '__none__'],
    queryFn: ({ signal }) => getInviteDetails(token!, signal),
    enabled: !!token,
    retry: false,
  })

export const acceptInvite = (token: string): Promise<AcceptInviteResponse> =>
  apiClient.post(
    `/api/contributor/invite/${encodeURIComponent(token)}/accept`,
    AcceptInviteResponseSchema
  )

export const useAcceptInvite = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.me() })
      qc.invalidateQueries({ queryKey: contributorKeys.all() })
    },
  })
}
