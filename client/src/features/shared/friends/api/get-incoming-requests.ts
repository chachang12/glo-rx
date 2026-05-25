import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { FriendRequestSchema, type FriendRequest } from '../types/friendship.schema'

export const friendKeys = {
  incoming: () => ['friends', 'incoming'] as const,
  outgoing: () => ['friends', 'outgoing'] as const,
}

const IncomingResponseSchema = z.array(FriendRequestSchema)

export const getIncomingFriendRequests = (signal?: AbortSignal): Promise<FriendRequest[]> =>
  apiClient.get('/api/friends/requests/incoming', IncomingResponseSchema, { signal })

export const useGetIncomingFriendRequests = (options?: { refetchInterval?: number }) =>
  useQuery({
    queryKey: friendKeys.incoming(),
    queryFn: ({ signal }) => getIncomingFriendRequests(signal),
    refetchInterval: options?.refetchInterval,
  })
