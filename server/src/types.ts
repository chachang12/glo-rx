import type { auth } from './lib/auth.js'

// Better Auth session types inferred from config
type Session = typeof auth.$Infer.Session

export type AuthUser = Session['user']
export type AuthSession = Session['session']

// Hono context variables set by middleware
export type AuthEnv = {
  Variables: {
    user: AuthUser
    session: AuthSession
    parsedBody: Record<string, unknown>
  }
}
