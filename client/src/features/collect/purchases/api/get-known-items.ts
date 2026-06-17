import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'
import { purchaseKeys } from './create-purchase'

const KnownItemsResponseSchema = z.object({
  since: z.string(),
  itemIds: z.array(z.string()),
})

export const getKnownPurchasedItems = (signal?: AbortSignal) =>
  apiClient.get('/api/collect/purchases/known-items', KnownItemsResponseSchema, { signal })

/**
 * Returns the set of itemIds that have been marked as purchased across all
 * operators in the last ~60 days. Watch views use this to dim items so an
 * operator doesn't accidentally buy something a teammate already grabbed.
 *
 * Invalidated automatically when `useCreatePurchase` succeeds (shared
 * queryKey prefix `['collect', 'purchases']`).
 */
export const useKnownPurchasedItems = () => {
  const query = useQuery({
    queryKey: purchaseKeys.knownItems(),
    queryFn: ({ signal }) => getKnownPurchasedItems(signal),
    staleTime: 30_000,
  })

  const set = useMemo(() => {
    const s = new Set<string>()
    if (query.data) for (const id of query.data.itemIds) s.add(id)
    return s
  }, [query.data])

  return { ...query, set }
}
