// Types
export * from './types/friendship.schema'

// Queries
export {
  getIncomingFriendRequests,
  useGetIncomingFriendRequests,
  friendKeys,
} from './api/get-incoming-requests'

// Mutations
export { sendFriendRequest, useSendFriendRequest } from './api/send-friend-request'
export {
  acceptFriendRequest,
  useAcceptFriendRequest,
  declineFriendRequest,
  useDeclineFriendRequest,
} from './api/respond-friend-request'
