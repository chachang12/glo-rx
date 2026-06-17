import type { HydratedDocument } from 'mongoose'
import type { auth } from './lib/auth.js'
import type { User as AppUserData } from './features/shared/user/user.model.js'

// Better Auth session types inferred from config
type Session = typeof auth.$Infer.Session

export type AuthUser = Session['user']
export type AuthSession = Session['session']

// The domain user (Mongoose UserModel). Hydrated so handlers can call
// .save() if needed; for read-only paths the field shape matches the
// schema. Stashed on every authenticated request by requireAuth.
export type AppUser = HydratedDocument<AppUserData>

// Hono context variables set by middleware
export type AuthEnv = {
  Variables: {
    user: AuthUser
    session: AuthSession
    appUser: AppUser
    parsedBody: Record<string, unknown>
  }
}
