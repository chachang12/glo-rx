import { z } from 'zod'

export const FriendRequestSchema = z.object({
  friendshipId: z.string(),
  from: z.string(),
  sentAt: z.string().datetime({ offset: true }),
})
export type FriendRequest = z.infer<typeof FriendRequestSchema>

export const OutgoingFriendRequestSchema = z.object({
  friendshipId: z.string(),
  to: z.string(),
  sentAt: z.string().datetime({ offset: true }),
})
export type OutgoingFriendRequest = z.infer<typeof OutgoingFriendRequestSchema>

export const SendFriendRequestInputSchema = z.object({
  recipientId: z.string(),
})
export type SendFriendRequestInput = z.infer<typeof SendFriendRequestInputSchema>

export const RespondFriendRequestInputSchema = z.object({
  requesterId: z.string(),
})
export type RespondFriendRequestInput = z.infer<typeof RespondFriendRequestInputSchema>
