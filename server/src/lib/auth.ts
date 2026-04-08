import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { mongoClient } from '../config/db.js'

const isProduction = process.env.BASE_URL?.startsWith('https://') ?? false

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
    defaultCookieAttributes: {
      secure: isProduction,
      sameSite: isProduction ? 'none' as const : 'lax' as const,
      httpOnly: true,
      path: '/',
    },
  },
})
