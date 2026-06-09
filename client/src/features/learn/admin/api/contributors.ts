import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'

export const adminContributorKeys = {
  list: () => ['admin', 'contributors'] as const,
  invites: () => ['admin', 'contributor-invites'] as const,
}

const ContributorScopeSchema = z.object({
  examCode: z.string(),
  rateCents: z.number(),
  grantedAt: z.string().datetime({ offset: true }).optional(),
  grantedBy: z.string().nullable().optional(),
})

const ContributorRowSchema = z.object({
  _id: z.string(),
  authId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string().nullable().optional(),
  contributor: z
    .object({
      scopes: z.array(ContributorScopeSchema),
      dailyCap: z.number(),
      reliabilityScore: z.number(),
    })
    .nullable(),
  createdAt: z.string().datetime({ offset: true }).optional(),
})
export type ContributorRow = z.infer<typeof ContributorRowSchema>

const ContributorInviteSchema = z.object({
  _id: z.string(),
  email: z.string(),
  scopes: z.array(
    z.object({ examCode: z.string(), rateCents: z.number() })
  ),
  dailyCap: z.number(),
  token: z.string(),
  expiresAt: z.string().datetime({ offset: true }),
  acceptedAt: z.string().datetime({ offset: true }).nullable().optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
})
export type ContributorInvite = z.infer<typeof ContributorInviteSchema>

export const listContributors = (signal?: AbortSignal) =>
  apiClient.get('/api/admin/contributors', z.array(ContributorRowSchema), { signal })

export const useListContributors = () =>
  useQuery({
    queryKey: adminContributorKeys.list(),
    queryFn: ({ signal }) => listContributors(signal),
  })

export const listContributorInvites = (signal?: AbortSignal) =>
  apiClient.get(
    '/api/admin/contributors/invites',
    z.array(ContributorInviteSchema),
    { signal }
  )

export const useListContributorInvites = () =>
  useQuery({
    queryKey: adminContributorKeys.invites(),
    queryFn: ({ signal }) => listContributorInvites(signal),
  })

export type CreateInviteInput = {
  email: string
  scopes: Array<{ examCode: string; rateCents: number }>
  dailyCap: number
}

const CreateInviteResponseSchema = z.object({
  _id: z.string(),
  email: z.string(),
  scopes: z.array(z.object({ examCode: z.string(), rateCents: z.number() })),
  dailyCap: z.number(),
  expiresAt: z.string().datetime({ offset: true }),
  acceptUrl: z.string(),
})
export type CreateInviteResponse = z.infer<typeof CreateInviteResponseSchema>

export const createContributorInvite = (input: CreateInviteInput) =>
  apiClient.post('/api/admin/contributors/invite', CreateInviteResponseSchema, {
    body: input,
  })

export const useCreateContributorInvite = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createContributorInvite,
    // Await so mutateAsync resolves after the list refetch completes — keeps
    // the success-message render and the new invite row in the same tick.
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: adminContributorKeys.invites() })
    },
  })
}

const SimpleOkSchema = z.object({ ok: z.boolean() })

export const deleteContributorInvite = (id: string) =>
  apiClient.del(`/api/admin/contributors/invites/${encodeURIComponent(id)}`, SimpleOkSchema)

export const useDeleteContributorInvite = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteContributorInvite,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: adminContributorKeys.invites() })
    },
  })
}

export type UpdateContributorInput = {
  userId: string
  scopes?: Array<{ examCode: string; rateCents: number }>
  dailyCap?: number
}

export const updateContributor = ({ userId, ...rest }: UpdateContributorInput) =>
  apiClient.patch(`/api/admin/contributors/${encodeURIComponent(userId)}`, SimpleOkSchema, {
    body: rest,
  })

export const useUpdateContributor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateContributor,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: adminContributorKeys.list() })
    },
  })
}
