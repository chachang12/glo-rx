import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const STATUSES = ['pending', 'accepted', 'declined', 'blocked'] as const

const friendshipSchema = new Schema(
  {
    requester: {
      type: String,
      required: true,
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
)

// One relationship per pair of users
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true })

// Fast lookup for "all relationships involving this user"
friendshipSchema.index({ requester: 1, status: 1 })
friendshipSchema.index({ recipient: 1, status: 1 })

export type Friendship = InferSchemaType<typeof friendshipSchema>
export const FriendshipModel = mongoose.model('Friendship', friendshipSchema)
