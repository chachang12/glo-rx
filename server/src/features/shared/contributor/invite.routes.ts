import { Hono } from 'hono'
import crypto from 'node:crypto'
import { requireAuth } from '../../../middleware/auth.js'
import { requireAdmin } from '../../../middleware/admin.js'
import type { AuthEnv } from '../../../types.js'
import { UserModel } from '../user/user.model.js'
import { ExamModel } from '../../learn/exam/exam.model.js'
import { ContributorInviteModel } from './contributor-invite.model.js'
import { AdminAuditLogModel } from '../admin/admin-audit-log.model.js'

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

// ── Admin-facing invite management ──────────────────────────────────────────
// Mounted under /api/admin/contributors.
export const adminContributorInviteRoutes = new Hono<AuthEnv>()

adminContributorInviteRoutes.use(requireAuth)
adminContributorInviteRoutes.use(requireAdmin)

adminContributorInviteRoutes.get('/', async (c) => {
  const contributors = await UserModel.find({ role: 'contributor' })
    .select('authId firstName lastName username contributor createdAt')
    .sort({ createdAt: -1 })
    .lean()
  return c.json(contributors)
})

adminContributorInviteRoutes.get('/invites', async (c) => {
  const invites = await ContributorInviteModel.find()
    .sort({ createdAt: -1 })
    .lean()
  return c.json(invites)
})

adminContributorInviteRoutes.post('/invite', async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json().catch(() => ({}))

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !email.includes('@')) {
    return c.json({ error: 'Valid email is required' }, 400)
  }

  if (!Array.isArray(body.scopes) || body.scopes.length === 0) {
    return c.json({ error: 'At least one scope is required' }, 400)
  }

  const scopes: Array<{ examCode: string; rateCents: number }> = []
  for (const s of body.scopes) {
    if (!s || typeof s !== 'object') {
      return c.json({ error: 'Each scope must be an object' }, 400)
    }
    const examCode = typeof s.examCode === 'string' ? s.examCode.trim() : ''
    const rateCents = Number(s.rateCents)
    if (!examCode) return c.json({ error: 'scope.examCode is required' }, 400)
    if (!Number.isFinite(rateCents) || rateCents < 0) {
      return c.json({ error: 'scope.rateCents must be a non-negative number' }, 400)
    }
    const examExists = await ExamModel.exists({ code: examCode })
    if (!examExists) return c.json({ error: `Exam ${examCode} not found` }, 404)
    scopes.push({ examCode, rateCents })
  }

  const dailyCap = Number.isFinite(Number(body.dailyCap))
    ? Math.max(0, Math.floor(Number(body.dailyCap)))
    : 200

  const inviter = await UserModel.findOne({ authId: authUser.id }).select('_id').lean()
  if (!inviter) return c.json({ error: 'Inviter not found' }, 404)

  const token = crypto.randomBytes(32).toString('hex')

  const invite = await ContributorInviteModel.create({
    email,
    scopes,
    dailyCap,
    token,
    invitedBy: inviter._id,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  })

  const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173'
  const acceptUrl = `${clientUrl}/app/contribute/accept/${token}`

  await AdminAuditLogModel.create({
    actorUserId: inviter._id,
    action: 'contributor.invite',
    target: { kind: 'invite', email },
    payload: { scopes, dailyCap },
  })

  return c.json(
    {
      _id: String(invite._id),
      email,
      scopes,
      dailyCap,
      expiresAt: invite.expiresAt,
      acceptUrl,
    },
    201
  )
})

adminContributorInviteRoutes.delete('/invites/:id', async (c) => {
  const { id } = c.req.param()
  const result = await ContributorInviteModel.findByIdAndDelete(id)
  if (!result) return c.json({ error: 'Invite not found' }, 404)

  const authUser = c.get('user')
  const admin = await UserModel.findOne({ authId: authUser.id }).select('_id').lean()
  if (admin) {
    await AdminAuditLogModel.create({
      actorUserId: admin._id,
      action: 'contributor.invite.revoke',
      target: { kind: 'invite', id, email: result.email },
      payload: { scopes: result.scopes, dailyCap: result.dailyCap },
    })
  }

  return c.json({ ok: true })
})

adminContributorInviteRoutes.patch('/:userId', async (c) => {
  const { userId } = c.req.param()
  const body = await c.req.json().catch(() => ({}))

  const user = await UserModel.findById(userId).select('role contributor').lean()
  if (!user) return c.json({ error: 'User not found' }, 404)
  if (user.role !== 'contributor') {
    return c.json({ error: 'User is not a contributor' }, 400)
  }
  if (!user.contributor) {
    return c.json({ error: 'Contributor profile missing' }, 500)
  }

  const updates: Record<string, unknown> = {}

  if (Array.isArray(body.scopes)) {
    const scopes: Array<{ examCode: string; rateCents: number; grantedAt: Date }> = []
    for (const s of body.scopes) {
      if (!s || typeof s !== 'object') continue
      const examCode = typeof s.examCode === 'string' ? s.examCode.trim() : ''
      const rateCents = Number(s.rateCents)
      if (!examCode || !Number.isFinite(rateCents) || rateCents < 0) continue
      scopes.push({ examCode, rateCents, grantedAt: new Date() })
    }
    updates['contributor.scopes'] = scopes
  }
  if (Number.isFinite(Number(body.dailyCap))) {
    updates['contributor.dailyCap'] = Math.max(0, Math.floor(Number(body.dailyCap)))
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ ok: true })
  }

  await UserModel.updateOne({ _id: userId }, { $set: updates })

  const authUser = c.get('user')
  const admin = await UserModel.findOne({ authId: authUser.id }).select('_id').lean()
  if (admin) {
    await AdminAuditLogModel.create({
      actorUserId: admin._id,
      action: 'contributor.update',
      target: { kind: 'user', userId },
      payload: updates,
    })
  }

  return c.json({ ok: true })
})

// ── Acceptance endpoint (authed but not contributor-gated) ──────────────────
// Mounted at /api/contributor/invite/:token/accept. The user must be signed in
// — the email tied to their Better Auth account must match the invite.
export const inviteAcceptRoutes = new Hono<AuthEnv>()

inviteAcceptRoutes.use(requireAuth)

// GET — inspect an invite (used by the accept page).
inviteAcceptRoutes.get('/:token', async (c) => {
  const { token } = c.req.param()
  const invite = await ContributorInviteModel.findOne({ token }).lean()
  if (!invite) return c.json({ error: 'Invite not found' }, 404)
  if (invite.acceptedAt) return c.json({ error: 'Invite already used' }, 409)
  if (invite.expiresAt < new Date()) return c.json({ error: 'Invite expired' }, 410)
  return c.json({
    email: invite.email,
    scopes: invite.scopes,
    dailyCap: invite.dailyCap,
    expiresAt: invite.expiresAt,
  })
})

// POST — flip the user to contributor.
inviteAcceptRoutes.post('/:token/accept', async (c) => {
  const { token } = c.req.param()
  const authUser = c.get('user')

  const invite = await ContributorInviteModel.findOne({ token })
  if (!invite) return c.json({ error: 'Invite not found' }, 404)
  if (invite.acceptedAt) return c.json({ error: 'Invite already used' }, 409)
  if (invite.expiresAt < new Date()) return c.json({ error: 'Invite expired' }, 410)

  if ((authUser.email ?? '').toLowerCase() !== invite.email) {
    return c.json(
      { error: `This invite is for ${invite.email}; sign in with that account to accept.` },
      403
    )
  }

  const user = await UserModel.findOne({ authId: authUser.id }).select('_id role').lean()
  if (!user) return c.json({ error: 'User not found — sign in again' }, 404)

  // Admins keep their elevated role; everyone else becomes a contributor.
  const newRole = user.role === 'admin' ? 'admin' : 'contributor'
  const contributorScopes = invite.scopes.map((s) => ({
    examCode: s.examCode,
    rateCents: s.rateCents,
    grantedAt: new Date(),
    grantedBy: invite.invitedBy,
  }))

  await UserModel.updateOne(
    { _id: user._id },
    {
      $set: {
        role: newRole,
        contributor: {
          scopes: contributorScopes,
          dailyCap: invite.dailyCap,
          reliabilityScore: 1,
          invitedBy: invite.invitedBy,
          acceptedInviteId: invite._id,
        },
      },
    }
  )

  invite.acceptedAt = new Date()
  invite.acceptedByUserId = user._id
  await invite.save()

  return c.json({
    ok: true,
    role: newRole,
    scopes: contributorScopes,
  })
})
