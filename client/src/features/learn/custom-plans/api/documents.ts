import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'

// Mongo-style payload (documents list endpoint).
const RawListDocSchema = z.object({
  _id: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  charCount: z.number(),
})

// Hand-rolled payload (upload endpoint).
const RawUploadDocSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  charCount: z.number(),
})

const ListResponseSchema = z.array(RawListDocSchema)

export interface PlanDocument {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  charCount: number
}

// Keep the schema export for downstream consumers that want to validate one.
export const PlanDocumentSchema = z.union([RawListDocSchema, RawUploadDocSchema])

const documentsKey = (planId: string) => ['custom-plans', planId, 'documents'] as const

export const getPlanDocuments = async (
  planId: string,
  signal?: AbortSignal
): Promise<PlanDocument[]> => {
  const raw = await apiClient.get(
    `/api/custom-plans/${encodeURIComponent(planId)}/documents`,
    ListResponseSchema,
    { signal }
  )
  return raw.map(({ _id, ...rest }) => ({ id: _id, ...rest }))
}

export const useGetPlanDocuments = (planId: string | undefined) =>
  useQuery({
    queryKey: planId ? documentsKey(planId) : ['custom-plans', '__noop_docs__'],
    queryFn: ({ signal }) => getPlanDocuments(planId!, signal),
    enabled: !!planId,
  })

interface UploadArgs {
  planId: string
  file: File
}

export const uploadPlanDocument = async ({ planId, file }: UploadArgs): Promise<PlanDocument> => {
  const formData = new FormData()
  formData.append('file', file)
  const raw = await apiClient.post(
    `/api/custom-plans/${encodeURIComponent(planId)}/upload`,
    RawUploadDocSchema,
    { body: formData }
  )
  return raw
}

export const useUploadPlanDocument = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: uploadPlanDocument,
    onSuccess: (_doc, { planId }) => {
      queryClient.invalidateQueries({ queryKey: documentsKey(planId) })
    },
  })
}
