import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth.js'
import type { AuthEnv } from '../../types.js'
import { FriendshipModel } from './friendship.model.js'

const friendshipRoutes = new Hono<AuthEnv>()

friendshipRoutes.use(requireAuth)

// POST /api/friends/request — send a friend request
friendshipRoutes.post('/request', async (c) => {
  const me = c.get('user').id
  const { recipientId } = await c.req.json()

  if (!recipientId) {
    return c.json({ error: 'recipientId is required' }, 400)
  }

  if (recipientId === me) {
    return c.json({ error: 'Cannot send a friend request to yourself' }, 400)
  }

  // Check if any relationship already exists (in either direction)
  const existing = await FriendshipModel.findOne({
    $or: [
      { requester: me, recipient: recipientId },
      { requester: recipientId, recipient: me },
    ],
  })

  if (existing) {
    if (existing.status === 'accepted') {
      return c.json({ error: 'Already friends' }, 409)
    }
    if (existing.status === 'pending') {
      // If they already sent us a request, auto-accept
      if (existing.requester === recipientId) {
        existing.status = 'accepted'
        await existing.save()
        return c.json(existing)
      }
      return c.json({ error: 'Request already pending' }, 409)
    }
    if (existing.status === 'blocked') {
      return c.json({ error: 'Unable to send request' }, 403)
    }
    if (existing.status === 'declined') {
      // Allow re-requesting after a decline
      existing.requester = me
      existing.recipient = recipientId
      existing.status = 'pending'
      await existing.save()
      return c.json(existing, 201)
    }
  }

  const friendship = await FriendshipModel.create({
    requester: me,
    recipient: recipientId,
    status: 'pending',
  })

  return c.json(friendship, 201)
})

// POST /api/friends/accept — accept a pending request
friendshipRoutes.post('/accept', async (c) => {
  const me = c.get('user').id
  const { requesterId } = await c.req.json()

  const friendship = await FriendshipModel.findOne({
    requester: requesterId,
    recipient: me,
    status: 'pending',
  })

  if (!friendship) {
    return c.json({ error: 'No pending request found' }, 404)
  }

  friendship.status = 'accepted'
  await friendship.save()

  return c.json(friendship)
})

// POST /api/friends/decline — decline a pending request
friendshipRoutes.post('/decline', async (c) => {
  const me = c.get('user').id
  const { requesterId } = await c.req.json()

  const friendship = await FriendshipModel.findOne({
    requester: requesterId,
    recipient: me,
    status: 'pending',
  })

  if (!friendship) {
    return c.json({ error: 'No pending request found' }, 404)
  }

  friendship.status = 'declined'
  await friendship.save()

  return c.json(friendship)
})

// POST /api/friends/block — block a user
friendshipRoutes.post('/block', async (c) => {
  const me = c.get('user').id
  const { userId } = await c.req.json()

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400)
  }

  // Find existing relationship in either direction
  let friendship = await FriendshipModel.findOne({
    $or: [
      { requester: me, recipient: userId },
      { requester: userId, recipient: me },
    ],
  })

  if (friendship) {
    friendship.status = 'blocked'
    // Normalize so the blocker is always the requester
    friendship.requester = me
    friendship.recipient = userId
    await friendship.save()
  } else {
    friendship = await FriendshipModel.create({
      requester: me,
      recipient: userId,
      status: 'blocked',
    })
  }

  return c.json(friendship)
})

// DELETE /api/friends/:userId — remove a friend
friendshipRoutes.delete('/:userId', async (c) => {
  const me = c.get('user').id
  const { userId } = c.req.param()

  const result = await FriendshipModel.findOneAndDelete({
    $or: [
      { requester: me, recipient: userId, status: 'accepted' },
      { requester: userId, recipient: me, status: 'accepted' },
    ],
  })

  if (!result) {
    return c.json({ error: 'Friendship not found' }, 404)
  }

  return c.json({ success: true })
})

// GET /api/friends — list accepted friends
friendshipRoutes.get('/', async (c) => {
  const me = c.get('user').id

  const friendships = await FriendshipModel.find({
    $or: [{ requester: me }, { recipient: me }],
    status: 'accepted',
  })
    .sort({ updatedAt: -1 })
    .lean()

  // Return the other user's ID for each friendship
  const friends = friendships.map((f) => ({
    friendshipId: f._id,
    userId: f.requester === me ? f.recipient : f.requester,
    since: f.updatedAt,
  }))

  return c.json(friends)
})

// GET /api/friends/requests/incoming — pending requests received
friendshipRoutes.get('/requests/incoming', async (c) => {
  const me = c.get('user').id

  const requests = await FriendshipModel.find({
    recipient: me,
    status: 'pending',
  })
    .sort({ createdAt: -1 })
    .lean()

  return c.json(
    requests.map((r) => ({
      friendshipId: r._id,
      from: r.requester,
      sentAt: r.createdAt,
    }))
  )
})

// GET /api/friends/requests/outgoing — pending requests sent
friendshipRoutes.get('/requests/outgoing', async (c) => {
  const me = c.get('user').id

  const requests = await FriendshipModel.find({
    requester: me,
    status: 'pending',
  })
    .sort({ createdAt: -1 })
    .lean()

  return c.json(
    requests.map((r) => ({
      friendshipId: r._id,
      to: r.recipient,
      sentAt: r.createdAt,
    }))
  )
})

export default friendshipRoutes
