import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { mongoClient } from '../config/db.js'
import { UserModel } from '../features/shared/user/user.model.js'

const isProduction = process.env.BASE_URL?.startsWith('https://') ?? false

function splitName(name: string | null | undefined): [string, string] {
  const [first = '', last = ''] = (name ?? '').trim().split(' ', 2)
  return [first, last]
}

export const auth = betterAuth({
  baseURL: process.env.BASE_URL ?? 'http://localhost:3001',
  secret: process.env.BETTER_AUTH_SECRET!,
  database: mongodbAdapter(mongoClient.db()),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  trustedOrigins: [process.env.CLIENT_URL ?? 'http://localhost:5173'],
  advanced: {
    crossSubDomainCookies: {
      enabled: isProduction,
      domain: isProduction ? '.axeous.com' : undefined,
    },
    defaultCookieAttributes: {
      secure: isProduction,
      sameSite: isProduction ? 'none' as const : 'lax' as const,
      httpOnly: true,
      path: '/',
    },
  },
  // Domain user lifecycle: keep the app's UserModel row in lockstep with
  // BetterAuth's user row. The middleware in requireAuth has a defensive
  // upsert as a safety net, but this hook is the primary creation path —
  // it fires atomically with signup, so the domain row exists before any
  // API call the client makes.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const [firstName, lastName] = splitName(user.name)
          await UserModel.updateOne(
            { authId: user.id },
            { $setOnInsert: { authId: user.id, firstName, lastName } },
            { upsert: true }
          )
        },
      },
    },
  },
})
