import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import type { SendFriendRequestInput } from '../types/friendship.schema'

const SendFriendRequestResponseSchema = z.unknown()

export const sendFriendRequest = (input: SendFriendRequestInput) =>
  apiClient.post('/api/friends/request', SendFriendRequestResponseSchema, {
    body: input,
  })

export const useSendFriendRequest = () =>
  useMutation({ mutationFn: sendFriendRequest })
