import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import {
  PurchaseSchema,
  type CreatePurchaseInput,
  type Purchase,
} from '../types/purchase.schema'

export const purchaseKeys = {
  all: () => ['collect', 'purchases'] as const,
  byDate: (date: string) => ['collect', 'purchases', 'date', date] as const,
  knownItems: () => ['collect', 'purchases', 'known-items'] as const,
}

export const createPurchase = (input: CreatePurchaseInput): Promise<Purchase> =>
  apiClient.post('/api/collect/purchases', PurchaseSchema, { body: input })

export const useCreatePurchase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.all() })
    },
  })
}
