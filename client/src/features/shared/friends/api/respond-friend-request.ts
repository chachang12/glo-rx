import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { friendKeys } from './get-incoming-requests'
import type { RespondFriendRequestInput } from '../types/friendship.schema'

const RespondResponseSchema = z.unknown()

export const acceptFriendRequest = (input: RespondFriendRequestInput) =>
  apiClient.post('/api/friends/accept', RespondResponseSchema, { body: input })

export const useAcceptFriendRequest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.incoming() })
    },
  })
}

export const declineFriendRequest = (input: RespondFriendRequestInput) =>
  apiClient.post('/api/friends/decline', RespondResponseSchema, { body: input })

export const useDeclineFriendRequest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: declineFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.incoming() })
    },
  })
}
