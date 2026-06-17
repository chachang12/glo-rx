import { MongoClient } from 'mongodb'
import mongoose, { type ClientSession } from 'mongoose'

const uri = process.env.MONGODB_URI!

// Native MongoClient — used by Better Auth internally
export const mongoClient = new MongoClient(uri)

// Mongoose connection — used for app data (questions, sessions, etc.)
export async function connectDB() {
  await mongoClient.connect()
  await mongoose.connect(uri)
  console.log('Connected to MongoDB Atlas')
}

/**
 * Runs `fn` inside a multi-document transaction so a set of writes commits all
 * or nothing. The callback receives the session to thread into each write
 * (`Model.create([doc], { session })`, `Model.updateOne(filter, update, { session })`).
 *
 * Transactions require a replica set, which production (Atlas) provides. If the
 * server is a standalone (e.g. a local dev mongod), we transparently fall back
 * to running the writes without a transaction — no worse than the prior
 * behavior. The callback must therefore be safe to run with a null session and
 * safe to retry (use idempotent/atomic updates rather than mutate-then-save).
 */
export async function runInTransaction<T>(
  fn: (session: ClientSession | null) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession()
  try {
    let result: T
    await session.withTransaction(async () => {
      result = await fn(session)
    })
    return result!
  } catch (err) {
    if (isTransactionsUnsupported(err)) {
      return fn(null)
    }
    throw err
  } finally {
    await session.endSession()
  }
}

function isTransactionsUnsupported(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('Transaction numbers are only allowed') ||
    msg.includes('Transactions are not supported') ||
    msg.includes('not supported on a standalone')
  )
}
